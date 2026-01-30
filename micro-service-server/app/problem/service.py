import io, zipfile, hashlib, uuid, json, os, random, re, string, yaml
from datetime import datetime
from typing import List, Optional, Dict
from fastapi import UploadFile
from sqlalchemy import asc, desc, case, cast, Float
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.settings import settings
from app.user.schemas import UserData
from app.problem import repository as problem_repository
import app.problem.exceptions as problem_exceptions
from app.problem.models import Problem
from app.problem.schemas import ProblemListResponse


def _rand_str(length=32, type="lower_hex"):
    if type == "str":
        return "".join(random.choice(string.ascii_letters + string.digits) for _ in range(length))
    elif type == "lower_str":
        return "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(length))
    elif type == "lower_hex":
        return random.choice("123456789abcdef") + "".join(random.choice("0123456789abcdef") for _ in range(length - 1))
    else:
        return random.choice("123456789") + "".join(random.choice("0123456789") for _ in range(length - 1))


def _natural_sort_key(s, _nsre=re.compile(r"(\d+)")):
    return [int(text) if text.isdigit() else text.lower()
            for text in re.split(_nsre, s)]


def _calculate_test_case_score(test_case_scores: List[dict], total_score: int = 100) -> List[dict]:
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


def _filter_name_list(name_list, spj, dir=""):
    ret = []
    prefix = 1
    if spj:
        while True:
            in_name = f"{prefix}.in"
            if f"{dir}{in_name}" in name_list:
                ret.append(in_name)
                prefix += 1
                continue
            else:
                return sorted(ret, key=_natural_sort_key)
    else:
        while True:
            in_name = f"{prefix}.in"
            out_name = f"{prefix}.out"
            if f"{dir}{in_name}" in name_list and f"{dir}{out_name}" in name_list:
                ret.append(in_name)
                ret.append(out_name)
                prefix += 1
                continue
            else:
                return sorted(ret, key=_natural_sort_key)

async def import_problem_from_file(zip_file: UploadFile, user_data: UserData, db: AsyncSession):
    if not zip_file:
        problem_exceptions.bad_zip_file()

    try:
        problems = []
        contents = await zip_file.read()
        try:
            zip_ref = zipfile.ZipFile(io.BytesIO(contents), "r")
        except zipfile.BadZipFile:
            problem_exceptions.bad_zip_file()

        with zip_ref:
            file_list = zip_ref.namelist()
            for path in file_list:
                if path.endswith("problem.md"):
                    problem_dir = os.path.dirname(path) + "/"
                    test_case_dir = f"{problem_dir}test/"

                    # Find solution file
                    solution_files = [f for f in file_list if f.startswith(f"{problem_dir}solution.")]
                    if not solution_files:
                        problem_exceptions.missing_file_error(f"{problem_dir}solution.*")
                    
                    solution_file = solution_files[0]
                    ext = os.path.splitext(solution_file)[1].lower()
                    if ext not in [".c", ".cpp", ".java", ".py", ".js", ".go"]:
                         # Using bad_zip_file for now as it's an invalid file type in the zip
                         problem_exceptions.bad_zip_file()

                    test_case_id, test_case_list = _save_test_cases_to_disk(zip_ref, test_case_dir, False)
                    display_id = str(uuid.uuid4())
                    problem_md = zip_ref.read(path).decode("utf-8")
                    meta_data, sections = parse_problem_md(problem_md)

                    if meta_data is None:
                        problem_exceptions.format_error(sections)

                    try:
                        problem = _create_problem_from_metadata(meta_data, sections, display_id, test_case_id, test_case_list)
                    except Exception as e:
                        problem_exceptions.invalid_metadata(str(e))

                    problem.created_by_id = user_data.user_id
                    problems.append(problem)
        await problem_repository.create_problems(db, problems)
        return problems

    finally:
        await zip_file.close()




#

def _create_problem_from_metadata(metadata: dict, sections: dict, display_id: str, test_case_id: str, test_case_list: List[dict] = None) -> Problem:
    spj = metadata.get("spj", False)
    now = datetime.now()

    raw_test_case_scores = metadata.get("test_case_score", [])
    if not raw_test_case_scores and test_case_list:
        raw_test_case_scores = [{"input_name": item["input_name"], "output_name": item["output_name"], "score": 0} for item in test_case_list]

    test_case_scores = _calculate_test_case_score(raw_test_case_scores)

    problem = Problem(
        _id=display_id,
        title=metadata.get("title", "No Title"),
        description=sections.get("description", ""),
        input_description=sections.get("input_description", ""),
        output_description=sections.get("output_description", ""),
        hint=sections.get("hint", ""),
        test_case_id=test_case_id,
        test_case_score=test_case_scores,
        time_limit=metadata.get("time_limit", 1000),
        memory_limit=metadata.get("memory_limit", 256),
        samples=sections.get("samples", []),
        template=metadata.get("template", {}),
        rule_type=metadata.get("rule_type", "ACM"),
        spj=spj,
        spj_code=metadata.get("spj_code", ""),
        spj_language=metadata.get("spj_language", ""),
        spj_version=_rand_str(8) if spj else "",
        spj_compile_ok=False,
        languages=metadata.get("languages", ["C", "C++", "Java", "Python3", "Go"]),
        visible=metadata.get("visible", True),
        difficulty=metadata.get("level", "Medium"),
        total_score=sum(metadata.get("test_case_score", [])) if metadata.get("rule_type") == "OI" else 100,
        io_mode=metadata.get("io_mode", {"io_mode": "Standard IO", "input": "input.txt", "output": "output.txt"}),
        create_time=now,
        last_update_time=now
    )
    return problem


def parse_problem_md(content: str):
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', content, re.DOTALL)
    if not match:
        return None, "Format Error: YAML Front Matter missing"

    metadata = yaml.safe_load(match.group(1))
    body = match.group(2).strip()

    sections = {}
    parts = re.split(r'\n#{1,3}\s+([\w_]+)\s*\n', '\n' + body)
    for i in range(1, len(parts), 2):
        sections[parts[i].lower()] = parts[i + 1].strip()

    if 'samples' in sections:
        sample_pattern = re.compile(
            r'###\s*input\s*\d*\s*\n(.*?)\n###\s*output\s*\d*\s*\n(.*?)(?=\n###\s*input|\Z)',
            re.DOTALL | re.IGNORECASE
        )
        sections['samples'] = [
            {"input": m[0].strip(), "output": m[1].strip()}
            for m in sample_pattern.findall(sections['samples'] + '\n')
        ]

    return metadata, sections


def _save_test_cases_to_disk(zip_file: zipfile.ZipFile, test_case_dir_in_zip: str, spj: bool = False) -> (str, List[dict]):
    name_list = zip_file.namelist()
    test_case_list = _filter_name_list(name_list, spj=spj, dir=test_case_dir_in_zip)
    if not test_case_list:
        problem_exceptions.empty_zip_file()
    test_case_id = _rand_str()
    dest_path = os.path.join(settings.TEST_CASE_DATA_PATH, test_case_id)
    os.makedirs(dest_path, exist_ok=True)
    os.chmod(dest_path, 0o710)
    size_cache = {}
    md5_cache = {}
    for item in test_case_list:
        with open(os.path.join(dest_path, item), "wb") as f:
            content = zip_file.read(f"{test_case_dir_in_zip}{item}").replace(b"\r\n", b"\n")
            size_cache[item] = len(content)
            if item.endswith(".out"):
                md5_cache[item] = hashlib.md5(content.rstrip()).hexdigest()
            f.write(content)
    test_case_info = {"spj": spj, "test_cases": {}}

    info = []
    # Reuse process_zip logic implicitly here or reconstruct info list
    if spj:
        for index, item in enumerate(test_case_list):
            data = {"input_name": item, "input_size": size_cache[item]}
            info.append(data)
            test_case_info["test_cases"][str(index + 1)] = data
    else:
        # ["1.in", "1.out", "2.in", "2.out"] => [("1.in", "1.out"), ("2.in", "2.out")]
        if isinstance(test_case_list[0], str): # Check if list of strings before zipping
             zipped_list = zip(*[test_case_list[i::2] for i in range(2)])
        else:
             zipped_list = test_case_list

        for index, item in enumerate(zipped_list):
            data = {"stripped_output_md5": md5_cache[item[1]],
                    "input_size": size_cache[item[0]],
                    "output_size": size_cache[item[1]],
                    "input_name": item[0],
                    "output_name": item[1]}
            info.append(data)
            test_case_info["test_cases"][str(index + 1)] = data

    with open(os.path.join(dest_path, "info"), "w", encoding="utf-8") as f:
        f.write(json.dumps(test_case_info, indent=4))
    return test_case_id, info


async def get_all_problems(db: AsyncSession) -> List[Problem]:
    return await problem_repository.fetch_all_problems(db)


async def get_tag_count(db: AsyncSession):
    rows = await problem_repository.fetch_tag_counts(db)
    return [{"tag": name, "count": count} for name, count in rows]


async def get_filter_sorted_problems(
        tags: Optional[List[str]],
        sort_option: Optional[str],
        order: Optional[str],
        page: int,
        page_size: int,
        db: AsyncSession,
) -> ProblemListResponse:
    accuracy_expression = case(
        (Problem.submission_number == 0, 0.0),
        else_=cast(Problem.accepted_number, Float) / cast(Problem.submission_number, Float)
    )

    valid_columns = {
        "id": Problem._id,
        "title": Problem.title,
        "difficulty": Problem.difficulty,
        "total_score": Problem.total_score,
        "create_time": Problem.create_time,
        "last_update_time": Problem.last_update_time,
        "submission": Problem.submission_number,
        "submission_count": Problem.submission_number,
        "accuracy": accuracy_expression,
        "accuracy_rate": accuracy_expression,
    }

    column = valid_columns.get(sort_option)
    if column is None:
        problem_exceptions.invalid_sort_parameter(sort_option)

    direction = (order or "asc").lower()
    ordering = desc(column) if direction == "desc" else asc(column)

    problems, total_count = await problem_repository.fetch_filtered_problems(
        db,
        tags=tags,
        ordering=ordering,
        page=page,
        page_size=page_size,
    )

    serialized = [_serialize_problem(problem) for problem in problems]

    return ProblemListResponse(
        total=total_count,
        page=page,
        page_size=page_size,
        problems=serialized,
    )


def _serialize_problem(problem: Problem) -> Dict[str, object]:
    difficulty_value = _normalize_difficulty(problem)
    tags = [{"id": tag.id, "name": tag.name} for tag in (problem.tags or [])]

    return {
        "id": problem.id,
        "_id": problem._id,
        "title": problem.title,
        "description": problem.description,
        "time_limit": problem.time_limit,
        "memory_limit": problem.memory_limit,
        "create_time": problem.create_time,
        "last_update_time": problem.last_update_time,
        "created_by_id": problem.created_by_id,
        "rule_type": problem.rule_type,
        "visible": problem.visible,
        "difficulty": difficulty_value,
        "total_score": problem.total_score,
        "test_case_score": problem.test_case_score,
        "submission_number": problem.submission_number,
        "accepted_number": problem.accepted_number,
        "tags": tags,
    }


def _normalize_difficulty(problem: Problem):
    difficulty_value = problem.difficulty
    if not difficulty_value and isinstance(problem.statistic_info, dict):
        difficulty_value = problem.statistic_info.get("difficulty")

    if isinstance(difficulty_value, (int, float)):
        mapping = {3: "상", 2: "중", 1: "하"}
        return mapping.get(int(difficulty_value), difficulty_value)

    if isinstance(difficulty_value, str):
        standardized = difficulty_value.strip().upper()
        mapping = {
            "HARD": "상",
            "MID": "중",
            "EASY": "하",
        }
        return mapping.get(standardized, difficulty_value.strip())

    return difficulty_value


async def get_contest_problem_count(contest_id: int, db: AsyncSession) -> int:
    return await problem_repository.count_contest_problems(db, contest_id)


async def get_problem_count(db):
    return await problem_repository.count_problem(db)
