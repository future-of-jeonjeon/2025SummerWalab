import hashlib
import json
import os
import re
import shutil
import string
import random
import yaml
import markdown
import zipfile
import io
from typing import List, Tuple, Dict, Any, Optional
from app.core.logger import logger
from app.core.settings import settings
from app.problem import exceptions as problem_exceptions
from app.problem.models import Problem
from app.problem.schemas import CreateProblemData, ProblemCreateRequest
from datetime import datetime

EXTENSION_TO_LANGUAGE = {
    ".py": "Python3",
    ".cpp": "C++",
    ".c": "C",
    ".java": "Java",
    ".go": "Go",
    ".js": "JavaScript"
}

LANGUAGE_LIST = ["C", "C++", "Java", "Python3", "Golang", "JavaScript"]

def generate_random_string(length=32, type="lower_hex") -> str:
    if type == "str":
        return "".join(random.choice(string.ascii_letters + string.digits) for _ in range(length))
    if type == "lower_str":
        return "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(length))
    if type == "lower_hex":
        return random.choice("123456789abcdef") + "".join(random.choice("0123456789abcdef") for _ in range(length - 1))
    return random.choice("123456789") + "".join(random.choice("0123456789") for _ in range(length - 1))

def parse_problem_md(content: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    match = re.match(r'^\s*\n(.*)', content, re.DOTALL)
    if not match:
        match = re.match(r'^\s*\n(.*)', content, re.DOTALL)
    if not match:
        match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', content, re.DOTALL)
    if not match:
        problem_exceptions.format_error("Metadata section missing")

    metadata_str = match.group(1)
    body = match.group(2).strip()

    try:
        metadata = yaml.safe_load(metadata_str)
    except yaml.YAMLError as e:
        problem_exceptions.format_error(f"Invalid YAML in metadata section: {str(e)}")

    sections = {}
    parts = re.split(r'\n#{1,3}\s+([\w_]+)\s*\n', '\n' + body)
    for i in range(1, len(parts), 2):
        sections[parts[i].lower()] = parts[i + 1].strip()

    if 'samples' in sections:
        sample_pattern = re.compile(
            r'###\s*input.*?\n(.*?)\n###\s*output.*?\n(.*?)(?=\n###\s*input|\Z)',
            re.DOTALL | re.IGNORECASE
        )

        def clean_sample(text):
            text = text.strip()
            text = re.sub(r'^```[a-zA-Z0-9]*\s*\n', '', text)
            text = re.sub(r'\n\s*```$', '', text)
            return text.strip()

        sections['samples'] = [
            {"input": clean_sample(m[0]), "output": clean_sample(m[1])}
            for m in sample_pattern.findall(sections['samples'] + '\n')
        ]

    html_sections = ['description', 'input_description', 'output_description', 'hint']
    for section in html_sections:
        if section in sections:
            sections[section] = markdown.markdown(
                sections[section],
                extensions=['fenced_code', 'tables']
            )

    return metadata, sections

def find_solution_file(file_list: List[str], problem_dir: str) -> str:
    solution_files = [f for f in file_list if f.startswith(f"{problem_dir}solution.")]
    if not solution_files:
        problem_exceptions.missing_file_error(f"{problem_dir}solution.*")
    return solution_files[0]


def detect_language_from_extension(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in EXTENSION_TO_LANGUAGE:
        logger.error(f"Unsupported file extension: {ext} for file: {filename}")
        problem_exceptions.bad_zip_file()
    return EXTENSION_TO_LANGUAGE[ext]


def extract_test_cases_to_memory(zip_ref: zipfile.ZipFile, file_list: List[str], test_case_dir: str,
                                 samples: List[dict]) -> List[dict]:
    test_cases = []
    for s in samples:
        test_cases.append({"input": s.get("input", ""), "output": s.get("output", "")})

    input_files = sorted([f for f in file_list if f.startswith(test_case_dir) and f.endswith(".in")])
    for in_file in input_files:
        out_file = in_file.replace(".in", ".out")
        if out_file in file_list:
            test_cases.append({
                "input": zip_ref.read(in_file).decode("utf-8"),
                "output": zip_ref.read(out_file).decode("utf-8").strip()
            })
    return test_cases


def save_test_cases_to_disk(zip_file: zipfile.ZipFile, test_case_dir_in_zip: str, spj: bool = False) -> Tuple[
    str, List[dict]]:
    name_list = zip_file.namelist()
    input_files = sorted([
        f for f in name_list
        if f.startswith(test_case_dir_in_zip) and f.endswith(".in")
        and not os.path.basename(f).startswith("._")
        and "/._" not in f
    ])

    if not input_files:
        problem_exceptions.empty_zip_file()

    test_case_id = generate_random_string(32, "lower_hex")
    dest_path = os.path.join(settings.TEST_CASE_DATA_PATH, test_case_id)

    os.makedirs(dest_path, exist_ok=True)
    os.chmod(dest_path, 0o710)
    logger.info(f"Test case directory created at: {dest_path} with permission 0o710")

    size_cache = {}
    md5_cache = {}
    valid_test_cases = []

    for in_path in input_files:
        out_path = in_path.replace(".in", ".out")
        if not spj and out_path not in name_list:
            continue

        in_name = os.path.basename(in_path)
        out_name = os.path.basename(out_path)

        in_content = zip_file.read(in_path).replace(b"\r\n", b"\n")
        with open(os.path.join(dest_path, in_name), "wb") as f:
            f.write(in_content)
        size_cache[in_name] = len(in_content)

        if not spj:
            out_content = zip_file.read(out_path).replace(b"\r\n", b"\n")
            with open(os.path.join(dest_path, out_name), "wb") as f:
                f.write(out_content)
            size_cache[out_name] = len(out_content)
            md5_cache[out_name] = hashlib.md5(out_content.rstrip()).hexdigest()
            valid_test_cases.append((in_name, out_name))
        else:
            valid_test_cases.append((in_name, None))

    test_case_info = {"spj": spj, "test_cases": {}}
    info_list = []

    for index, (in_name, out_name) in enumerate(valid_test_cases):
        if spj:
            data = {"input_name": in_name, "input_size": size_cache[in_name]}
        else:
            data = {
                "stripped_output_md5": md5_cache[out_name],
                "input_size": size_cache[in_name],
                "output_size": size_cache[out_name],
                "input_name": in_name,
                "output_name": out_name
            }
        info_list.append(data)
        test_case_info["test_cases"][str(index + 1)] = data

    with open(os.path.join(dest_path, "info"), "w", encoding="utf-8") as f:
        f.write(json.dumps(test_case_info, indent=4))

    return test_case_id, info_list


def remove_test_case_directory(test_case_ids: List[str]):
    if not test_case_ids:
        return
    logger.info(f"Cleaning up {len(test_case_ids)} test cases")
    for test_case_id in test_case_ids:
        try:
            target_dir = os.path.join(settings.TEST_CASE_DATA_PATH, test_case_id)
            if os.path.exists(target_dir):
                shutil.rmtree(target_dir)
        except Exception as e:
            logger.error(f"Failed to remove test case directory {test_case_id}: {e}")




def get_saved_test_case_by_id(test_case_id: str) -> List[Dict[str, str]]:
    info = load_test_case_info(test_case_id)
    test_case_dir = os.path.join(settings.TEST_CASE_DATA_PATH, test_case_id)
    test_cases = []
    test_cases_info = info.get("test_cases", {})
    sorted_keys = sorted(test_cases_info.keys(), key=lambda x: int(x) if x.isdigit() else x)
    for key in sorted_keys:
        case_info = test_cases_info[key]
        input_name = case_info.get("input_name")
        output_name = case_info.get("output_name")
        if not input_name:
            continue
        input_path = os.path.join(test_case_dir, input_name)
        try:
            with open(input_path, "r", encoding="utf-8") as f:
                input_content = f.read()
        except Exception as e:
            logger.error(f"Failed to read input file {input_path}: {e}")
            continue
        output_content = ""
        if output_name:
            output_path = os.path.join(test_case_dir, output_name)
            try:
                with open(output_path, "r", encoding="utf-8") as f:
                    output_content = f.read()
            except Exception as e:
                logger.error(f"Failed to read output file {output_path}: {e}")
        test_cases.append({
            "input": input_content,
            "output": output_content
        })
    return test_cases


def load_test_case_info(test_case_id: str) -> Dict[str, Any]:
    test_case_dir = os.path.join(settings.TEST_CASE_DATA_PATH, test_case_id)
    info_path = os.path.join(test_case_dir, "info")
    
    if not os.path.exists(info_path):
        logger.error(f"Test case info file not found at: {info_path}")
        problem_exceptions.test_case_not_found(test_case_id)
        
    with open(info_path, "r", encoding="utf-8") as f:
        return json.load(f)


def open_zip_bytes(contents: bytes) -> zipfile.ZipFile:
    try:
        return zipfile.ZipFile(io.BytesIO(contents), "r")
    except zipfile.BadZipFile:
        logger.error("Failed to open zip file: Bad Zip File")
        problem_exceptions.bad_zip_file()


def filter_problem_md_paths(file_list: List[str]) -> List[str]:
    return [
        p for p in file_list
        if p.endswith("problem.md")
           and not p.startswith("__MACOSX/")
           and "/._" not in p
           and not os.path.basename(p).startswith("._")
    ]


def create_data_from_request_data(request_data: ProblemCreateRequest) -> CreateProblemData:
    return CreateProblemData(
        title=request_data.title,
        description=request_data.description,
        input_description=request_data.input_description,
        output_description=request_data.output_description,
        samples=request_data.samples,
        time_limit=request_data.time_limit,
        memory_limit=request_data.memory_limit,
        languages=request_data.languages,
        template=request_data.template,
        difficulty=request_data.difficulty,
        tags=request_data.tags,
        hint=request_data.hint
    )


def parse_create_problem_data(meta_data: Dict[str, Any], sections: Dict[str, Any]) -> CreateProblemData:
    return CreateProblemData(
        title=meta_data.get("title"),
        description=sections.get("description", ""),
        input_description=sections.get("input_description", ""),
        output_description=sections.get("output_description", ""),
        samples=sections.get("samples", []),
        time_limit=meta_data.get("time_limit", 1000),
        memory_limit=meta_data.get("memory_limit", 256),
        languages=meta_data.get("languages", ["C", "C++", "Java", "Python3", "Go"]),
        template=meta_data.get("template", {}),
        difficulty=meta_data.get("level", "0"),
        tags=meta_data.get("tags", []),
        hint=sections.get("hint", ""),
        source=meta_data.get("source", ""),
        spj=meta_data.get("spj", False),
        spj_code=meta_data.get("spj_code", ""),
        spj_language=meta_data.get("spj_language", ""),
        rule_type=meta_data.get("rule_type", "ACM"),
        io_mode=meta_data.get("io_mode", {"io_mode": "Standard IO", "input": "input.txt", "output": "output.txt"}),
        test_case_score=meta_data.get("test_case_score", []),
        visible=meta_data.get("visible", True)
    )


def create_problem_from_data(data: CreateProblemData, display_id: str, test_case_id: str,
                             test_case_list: List[dict] = None) -> Problem:
    now = datetime.now()
    raw_test_case_scores = data.test_case_score
    if not raw_test_case_scores and test_case_list:
        raw_test_case_scores = [{"input_name": item["input_name"], "output_name": item["output_name"], "score": 0} for
                                item in test_case_list]
    test_case_scores = calculate_test_case_score(raw_test_case_scores)
    spj_version = generate_random_string(8) if data.spj else ""
    problem = Problem(
        _id=display_id,
        title=data.title,
        description=data.description,
        input_description=data.input_description,
        output_description=data.output_description,
        hint=data.hint,
        test_case_id=test_case_id,
        test_case_score=test_case_scores,
        time_limit=data.time_limit,
        memory_limit=data.memory_limit,
        samples=[s.model_dump() for s in data.samples],
        template=data.template,
        rule_type=data.rule_type,
        spj=data.spj,
        spj_code=data.spj_code,
        spj_language=data.spj_language,
        spj_version=spj_version,
        spj_compile_ok=False,
        languages=normalize_languages(data.languages),
        visible=data.visible,
        difficulty=data.difficulty,
        total_score=sum([item.get("score", 0) for item in data.test_case_score]) if data.rule_type == "OI" else 100,
        io_mode=data.io_mode,
        create_time=now,
        last_update_time=now
    )
    return problem


def calculate_test_case_score(test_case_scores: List[dict], total_score: int = 100) -> List[dict]:
    if not test_case_scores:
        return []

    count = len(test_case_scores)
    avg_score = total_score // count
    remainder = total_score % count

    for i, test_case in enumerate(test_case_scores):
        score = avg_score
        if i < remainder:
            score += 1
        test_case["score"] = score

    return test_case_scores


def normalize_languages(languages: List[str]) -> List[str]:
    normalized = []
    lang_map = {lang.lower(): lang for lang in LANGUAGE_LIST}
    aliases = {
        "cpp": "C++",
        "c++": "C++",
        "python": "Python3",
        "py": "Python3",
        "python3": "Python3",
        "js": "JavaScript",
        "javascript": "JavaScript",
        "go": "Golang",
        "golang": "Golang",
        "c": "C",
        "java": "Java",
    }
    lang_map.update(aliases)

    for lang in languages:
        canonical = lang_map.get(lang.lower())
        if canonical:
            normalized.append(canonical)
    return sorted(list(set(normalized)), key=lambda x: LANGUAGE_LIST.index(x) if x in LANGUAGE_LIST else 999)
