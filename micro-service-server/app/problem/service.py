import io, zipfile, hashlib, uuid, json, os, random, re, string, yaml
import app.execution.service as execution_service
from datetime import datetime
from typing import List, Optional, Dict
from fastapi import UploadFile
from sqlalchemy import asc, desc, case, cast, Float
from sqlalchemy.ext.asyncio import AsyncSession
from io import BytesIO
from app.core.redis import get_polling_task
from app.core.settings import settings
import app.problem.exceptions as problem_exception
from app.execution.schemas import RunCodeRequest
from app.user.schemas import UserData
from app.problem import repository as problem_repository
import app.problem.exceptions as problem_exceptions
from app.problem.models import Problem
from app.problem.schemas import ProblemListResponse, ProblemImportPollingStatus
from app.core.logger import logger

EXTENSION_TO_LANGUAGE = {
    ".py": "Python3",
    ".cpp": "C++",
    ".c": "C",
    ".java": "Java",
    ".go": "Go",
    ".js": "JavaScript"
}

POLLING_SESSION_TIME = 3600


async def import_problem_polling(polling_key: str) -> ProblemImportPollingStatus:
    redis = await get_polling_task()
    raw = await redis.get(polling_key)
    if not raw:
        problem_exception.polling_not_found()
    status = ProblemImportPollingStatus.model_validate_json(raw)

    if status.status == "done":
        await redis.delete(polling_key)

    return status


async def setup_polling(problem_num: int) -> str:
    key = f"problem_import:{uuid.uuid4()}"
    redis = await get_polling_task()
    data = ProblemImportPollingStatus(
        status="processing",
        all_problem=problem_num,
        left_problem=problem_num,
        imported_problem=0,
    )
    await redis.set(key, data.model_dump_json(), ex=POLLING_SESSION_TIME)
    return key


async def import_problem_from_file(polling_key: str, zip_file: UploadFile, user_data: UserData, db: AsyncSession):
    if not zip_file:
        logger.error("No zip file provided for problem import")
        problem_exceptions.bad_zip_file()

    logger.info(f"Starting problem import for user_id: {user_data.user_id}, file: {zip_file.filename}")
    contents = await zip_file.read()
    try:
        zip_ref = zipfile.ZipFile(io.BytesIO(contents), "r")
    except zipfile.BadZipFile:
        logger.error(f"Bad zip file uploaded by user_id: {user_data.user_id}")
        problem_exceptions.bad_zip_file()

    problems = []
    redis = await get_polling_task()
    if not redis:
        pass  # todo: error
    raw = await redis.get(polling_key)
    if not raw:
        problem_exception.polling_not_found()
    status = ProblemImportPollingStatus.model_validate_json(raw)

    with zip_ref:
        file_list = zip_ref.namelist()
        md_paths = [p for p in file_list if p.endswith("problem.md")]
        logger.info(f"Found {len(md_paths)} problem definitions in zip file")

        for i, path in enumerate(md_paths):
            problem = await _process_single_problem(zip_ref, file_list, path, user_data.user_id, db)
            problems.append(problem)
            status.status = "processing"
            status.imported_problem = i + 1
            status.left_problem = status.all_problem - status.imported_problem
            await redis.set(polling_key, status.model_dump_json(), ex=POLLING_SESSION_TIME)
        status.status = "done"
        status.left_problem = 0
        await redis.set(polling_key, status.model_dump_json(), ex=POLLING_SESSION_TIME)

    await problem_repository.create_problems(db, problems)
    logger.info(f"Successfully imported {len(problems)} problems")
    return problems


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


async def _process_single_problem(zip_ref: zipfile.ZipFile, file_list: List[str], md_path: str, user_id: int,
                                  db: AsyncSession):
    logger.info(f"Processing problem from {md_path}")
    problem_dir = os.path.dirname(md_path) + "/"
    test_case_dir = f"{problem_dir}test/"

    logger.info(f"Reading problem.md for {md_path}")
    problem_md = zip_ref.read(md_path).decode("utf-8")
    meta_data, sections = parse_problem_md(problem_md)

    solution_file = _get_solution_file(file_list, problem_dir)
    logger.info(f"Reading solution file: {solution_file}")
    solution_code = zip_ref.read(solution_file).decode("utf-8")
    language = _get_language_from_ext(solution_file)

    logger.info(f"Extracting test cases for {md_path}")
    test_cases_to_validate = _extract_test_cases_data(zip_ref, file_list, test_case_dir, sections.get("samples", []))

    logger.info(f"Validating problem solution code for {md_path}")
    await _validate_problem(
        solution_code=solution_code,
        solution_code_language=language,
        test_case=test_cases_to_validate,
        db=db
    )

    logger.info(f"Saving test cases to disk for {md_path}")
    test_case_id, test_case_list = _save_test_cases_to_disk(zip_ref, test_case_dir, False)
    display_id = str(uuid.uuid4())
    try:
        problem = _create_problem_from_metadata(meta_data, sections, display_id, test_case_id, test_case_list)
        problem.created_by_id = user_id
        logger.info(f"Successfully created problem object for {md_path}")
        return problem
    except Exception as e:
        logger.error(f"Error creating problem from metadata for {md_path}: {str(e)}")
        problem_exceptions.invalid_metadata(str(e))


def _extract_test_cases_data(zip_ref: zipfile.ZipFile, file_list: List[str], test_case_dir: str, samples: List[dict]) -> \
        List[dict]:
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


def _get_solution_file(file_list: List[str], problem_dir: str) -> str:
    solution_files = [f for f in file_list if f.startswith(f"{problem_dir}solution.")]
    if not solution_files:
        problem_exceptions.missing_file_error(f"{problem_dir}solution.*")
    return solution_files[0]


def _get_language_from_ext(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in EXTENSION_TO_LANGUAGE:
        logger.error(f"Unsupported file extension: {ext} for file: {filename}")
        problem_exceptions.bad_zip_file()
    return EXTENSION_TO_LANGUAGE[ext]


def _create_problem_from_metadata(metadata: dict, sections: dict, display_id: str, test_case_id: str,
                                  test_case_list: List[dict] = None) -> Problem:
    spj = metadata.get("spj", False)
    now = datetime.now()
    raw_test_case_scores = metadata.get("test_case_score", [])
    if not raw_test_case_scores and test_case_list:
        raw_test_case_scores = [{"input_name": item["input_name"], "output_name": item["output_name"], "score": 0} for
                                item in test_case_list]
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
        difficulty=metadata.get("level", "0"),
        total_score=sum(metadata.get("test_case_score", [])) if metadata.get("rule_type") == "OI" else 100,
        io_mode=metadata.get("io_mode", {"io_mode": "Standard IO", "input": "input.txt", "output": "output.txt"}),
        create_time=now,
        last_update_time=now
    )
    return problem


async def _validate_problem(solution_code: str, solution_code_language: str, test_case: List, db: AsyncSession):
    request = RunCodeRequest(
        language=solution_code_language,
        src=solution_code,
        stdin="",
        max_cpu_time=5000,
        max_memory_mb=512
    )
    for cases in test_case:
        request.stdin = cases.get("input", "")
        expected_output = cases.get("output", "")
        data = await execution_service.run_code_service(db, request)
        logger.info("run_code_service result: %r", data)
        if data.get("err"):
            problem_exceptions.judge_server_error()

        exec_data = data.get("data")
        user_output = None
        if isinstance(exec_data, list) and len(exec_data) > 0:
            user_output = exec_data[0].get("output")

        if user_output is None:
            problem_exceptions.judge_server_error()

        if user_output.strip() != expected_output.strip():
            problem_exceptions.test_case_not_match(cases.get("input", ""), cases.get("output", ""), user_output)
    return True


def parse_problem_md(content: str):
    match = re.match(r'^<!--\s*metadata\s*\n(.*?)\n-->\s*\n(.*)', content, re.DOTALL)
    if not match:
        match = re.match(r'^<!--\s*code-round-metadata\s*\n(.*?)\n-->\s*\n(.*)', content, re.DOTALL)
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
            r'###\s*input\s*\d*\s*\n(.*?)\n###\s*output\s*\d*\s*\n(.*?)(?=\n###\s*input|\Z)',
            re.DOTALL | re.IGNORECASE
        )
        sections['samples'] = [
            {"input": m[0].strip(), "output": m[1].strip()}
            for m in sample_pattern.findall(sections['samples'] + '\n')
        ]

    return metadata, sections


def _save_test_cases_to_disk(
        zip_file: zipfile.ZipFile, test_case_dir_in_zip: str, spj: bool = False) -> (str, List[dict]):
    name_list = zip_file.namelist()
    input_files = sorted([
        f for f in name_list
        if f.startswith(test_case_dir_in_zip) and f.endswith(".in")
    ])
    if not input_files:
        problem_exceptions.empty_zip_file()
    test_case_id = _rand_str()
    dest_path = os.path.join(settings.TEST_CASE_DATA_PATH, test_case_id)
    os.makedirs(dest_path, exist_ok=True)
    os.chmod(dest_path, 0o710)
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
    info = []
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
        "difficulty": problem.difficulty,
        "total_score": problem.total_score,
        "test_case_score": problem.test_case_score,
        "submission_number": problem.submission_number,
        "accepted_number": problem.accepted_number,
        "tags": tags,
    }


async def get_contest_problem_count(contest_id: int, db: AsyncSession) -> int:
    return await problem_repository.count_contest_problems(db, contest_id)


async def get_problem_count(db):
    return await problem_repository.count_problem(db)


async def count_problems_in_file(file: UploadFile) -> int:
    content = await file.read()
    count = 0
    with zipfile.ZipFile(BytesIO(content)) as zf:
        for name in zf.namelist():
            if name.endswith("problem.md"):
                count += 1
    await file.seek(0)

    return count
