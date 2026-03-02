import io
import os
import uuid
import zipfile

from fastapi import UploadFile
from sqlalchemy import asc, desc, case, cast, Float
from sqlalchemy.ext.asyncio import AsyncSession

import app.execution.service as execution_service
import app.problem.exceptions as problem_exceptions
from app.api.deps import get_background_database
from app.core.logger import logger
from app.core.redis import get_polling_task
from app.execution.schemas import RunCodeRequest
from app.problem import repository as problem_repository
from app.problem.models import Problem
from app.problem.schemas import *
from app.user.schemas import UserData
from app.problem import utils

POLLING_SESSION_TIME = 3600


async def create_problem(
        polling_key: str,
        request_data: ProblemCreateRequest,
        user_data: UserData,
        is_admin: bool):
    try:
        await _set_redis_polling_state(polling_key, "processing", 0, 1, 1)
        async for db in get_background_database():
            test_case = utils.get_saved_test_case_by_id(request_data.test_case_id)
            validation_cases = list(test_case)
            for s in request_data.samples:
                validation_cases.append(s.model_dump())
            await _validate_solution_code(request_data.solution_code, request_data.solution_code_language,
                                          validation_cases,
                                          db)
            info_json = utils.load_test_case_info(request_data.test_case_id)
            test_cases_info = info_json.get("test_cases", {})
            sorted_keys = sorted(test_cases_info.keys(), key=lambda x: int(x) if x.isdigit() else x)
            info_list = [test_cases_info[key] for key in sorted_keys]
            create_data = utils.create_data_from_request_data(request_data)
            create_data.spj = info_json.get("spj", False)
            display_id = str(uuid.uuid4())
            problem = utils.create_problem_from_data(create_data, display_id, request_data.test_case_id, info_list)
            problem.created_by_id = user_data.user_id
            if create_data.tags:
                problem.tags = await _process_tags(db, create_data.tags)
            await problem_repository.create_problem(db, problem)
        await _set_redis_polling_state(polling_key, "done", 1, 0, 1)
    except Exception as e:
        logger.error(f"Failed to create problem: {e}")
        error_code = getattr(e, "detail", {}).get("code") if hasattr(e, "detail") else "unknown_error"
        utils.remove_test_case_directory([request_data.test_case_id])
        await _set_redis_polling_state(polling_key, "error", 0, 1, 1, error_code)


async def _set_redis_polling_state(
        polling_key: str,
        status: str,
        processed_problem: int,
        left_problem: int,
        all_problem: int,
        error_code: str = "", ):
    redis = await get_polling_task()
    if status != "initialized" and not await redis.get(polling_key):
        problem_exceptions.polling_not_found()
    data = ProblemImportPollingStatus(
        status=status,
        processed_problem=processed_problem,
        left_problem=left_problem,
        all_problem=all_problem)
    if error_code != "":
        data.error_code = error_code
    await redis.set(polling_key, data.model_dump_json(), ex=POLLING_SESSION_TIME)


async def import_problem_polling(
        polling_key: str) -> ProblemImportPollingStatus:
    redis = await get_polling_task()
    raw = await redis.get(polling_key)
    if not raw:
        logger.warning(f"Polling key not found: {polling_key}")
        problem_exceptions.polling_not_found()
    status = ProblemImportPollingStatus.model_validate_json(raw)
    if status.status == "done":
        await redis.delete(polling_key)
    return status


async def setup_polling(
        problem_num: int) -> str:
    key = f"problem_import:{uuid.uuid4()}"
    await _set_redis_polling_state(key, "initialized", 0, problem_num, problem_num)
    return key


async def import_problem_from_file(
        polling_key: str,
        zip_file: UploadFile,
        user_data: UserData,
        is_admin: bool) -> str | None:
    problems = []
    testcase_list = []
    redis = await get_polling_task()
    raw = await redis.get(polling_key)
    if not raw:
        problem_exceptions.polling_not_found()
    status = ProblemImportPollingStatus.model_validate_json(raw)
    try:
        async for db in get_background_database():
            if not zip_file:
                logger.error("No zip file provided")
                problem_exceptions.bad_zip_file()
            logger.info(f"Starting import. user: {user_data.user_id}, file: {zip_file.filename}")
            contents = await zip_file.read()
            try:
                zip_ref = utils.open_zip_bytes(contents)
            except Exception:
                problem_exceptions.bad_zip_file()
            with zip_ref:
                file_list = zip_ref.namelist()
                md_paths = utils.filter_problem_md_paths(file_list)
                logger.info(f"Found {len(md_paths)} problems in zip")
                for i, path in enumerate(md_paths):
                    problem = await _process_single_problem(zip_ref, file_list, path, user_data.user_id, db)
                    problems.append(problem)
                    testcase_list.append(problem.test_case_id)
                    status.status = "processing"
                    status.imported_problem = i + 1
                    status.left_problem = status.all_problem - status.imported_problem
                    await _set_redis_polling_state(polling_key, "processing", i + 1, status.left_problem,
                                                   status.all_problem)
                status.status = "done"
                status.left_problem = 0
                logger.info(f"Polling finished: {status}")
                await _set_redis_polling_state(polling_key, "done", status.imported_problem, 0,
                                               status.all_problem)
            await problem_repository.create_problems(db, problems)
            logger.info(f"Successfully imported {len(problems)} problems")
            return problems
    except Exception as e:
        logger.error(f"Import failed: {e}")
        status.status = "error"
        status.error_code = getattr(e, "detail", {}).get("code") if hasattr(e, "detail") else "unknown_error"
        await _set_redis_polling_state(polling_key, "error", status.imported_problem, status.left_problem,
                                       status.all_problem)
        utils.remove_test_case_directory(testcase_list)
        return None


async def process_test_case_upload(file: UploadFile, spj: bool = False):
    if not file:
        problem_exceptions.bad_zip_file()

    content = await file.read()
    try:
        zip_ref = utils.open_zip_bytes(content)
    except Exception:
        problem_exceptions.bad_zip_file()

    with zip_ref:
        test_case_id, info_list = utils.save_test_cases_to_disk(zip_ref, "", spj)

    return {
        "id": test_case_id,
        "info": info_list,
        "spj": spj
    }


async def _process_single_problem(
        zip_ref: zipfile.ZipFile,
        file_list: List[str],
        md_path: str,
        user_id: int,
        db: AsyncSession):
    problem_dir = os.path.dirname(md_path) + "/"
    test_case_dir = f"{problem_dir}test/"
    problem_md = zip_ref.read(md_path).decode("utf-8")
    meta_data, sections = utils.parse_problem_md(problem_md)
    solution_file = utils.find_solution_file(file_list, problem_dir)
    solution_code = zip_ref.read(solution_file).decode("utf-8")
    language = utils.detect_language_from_extension(solution_file)
    test_cases_to_validate = (utils
                              .extract_test_cases_to_memory(zip_ref, file_list, test_case_dir,
                                                            sections.get("samples", [])))
    await _validate_solution_code(solution_code, language, test_cases_to_validate, db)
    test_case_id, info_list = utils.save_test_cases_to_disk(zip_ref, test_case_dir, meta_data.get("spj", False))
    create_data = utils.parse_create_problem_data(meta_data, sections)
    display_id = str(uuid.uuid4())
    problem = utils.create_problem_from_data(create_data, display_id, test_case_id, info_list)
    problem.created_by_id = user_id
    if create_data.tags:
        problem.tags = await _process_tags(db, create_data.tags)
    return problem


async def _validate_solution_code(
        solution_code: str,
        solution_code_language: str,
        test_case: List,
        db: AsyncSession) -> bool:
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


async def _process_tags(db: AsyncSession, tags: List[str]) -> list:
    tag_objects = []
    for tag in tags:
        tag_obj = await problem_repository.get_or_create_tag(db, tag)
        tag_objects.append(tag_obj)
    return tag_objects


async def _process_tags(db: AsyncSession, tags: List[str]):
    tag_objects = []
    for tag in tags:
        tag_obj = await problem_repository.get_or_create_tag(db, tag)
        tag_objects.append(tag_obj)
    return tag_objects


async def get_all_problems(db: AsyncSession) -> List[Problem]:
    return await problem_repository.fetch_all_problems(db)


async def get_tag_count(db: AsyncSession):
    rows = await problem_repository.fetch_tag_counts(db)
    return [{"tag": name, "count": count} for name, count in rows]


async def get_filter_sorted_problems(
        tags: Optional[List[str]],
        keyword: Optional[str],
        difficulty: Optional[int],
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

    problem_page = await problem_repository.fetch_filtered_problems(
        db,
        tags=tags,
        keyword=keyword,
        difficulty=difficulty,
        ordering=ordering,
        page=page,
        page_size=page_size,
    )

    serialized = [_serialize_problem(problem) for problem in problem_page.items]

    return ProblemListResponse(
        total=problem_page.total,
        page=problem_page.page,
        size=problem_page.size,
        items=serialized,
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
    with zipfile.ZipFile(io.BytesIO(content)) as zf:
        for name in zf.namelist():
            if name.endswith("problem.md") and not name.startswith(
                    "__MACOSX/") and "/._" not in name and not os.path.basename(name).startswith("._"):
                count += 1
    await file.seek(0)
    return count


async def get_contributed_problem(user_data: UserData, page: int, size: int, db: AsyncSession):
    problems = await problem_repository.find_problems_by_creator_id(user_data.user_id, page, size, db)
    return problems.map(ProblemSchema.model_validate)
