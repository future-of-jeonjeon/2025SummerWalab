import io
import os
import uuid
import zipfile
from typing import Union
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_background_database
from app.core.logger import logger
from app.core.redis import get_polling_task
from app.execution.schemas import RunCodeRequest
from app.pending.models import PendingTargetType
from app.problem.models import Problem, ProblemTag
from app.problem.schemas import *
from app.user.schemas import UserProfile
from app.problem import utils
from app.problem.schemas import ProblemDetailResponse

import app.execution.service as execution_service
import app.pending.service as pending_service
import app.problem.exceptions as problem_exceptions
import app.problem.repository as problem_repository

POLLING_SESSION_TIME = 3600


def _extract_error_code(exc: Exception) -> str:
    detail = getattr(exc, "detail", None)
    if isinstance(detail, dict):
        return detail.get("code", "unknown_error")
    return "unknown_error"


def _extract_error_message(exc: Exception) -> str:
    detail = getattr(exc, "detail", None)
    if isinstance(detail, dict):
        return detail.get("message", str(exc))
    if isinstance(detail, list):
        return "; ".join([str(item) for item in detail])
    if detail is not None:
        return str(detail)
    return str(exc)


async def create_problem(
        polling_key: str,
        request_data: ProblemCreateRequest,
        user_profile: UserProfile,
        is_admin: bool):
    try:
        await _set_redis_polling_state(polling_key, "processing", 0, 1, 1)
        async with get_background_database() as db:
            await _validate_problem_request(request_data, db)
            info_json = utils.load_test_case_info(request_data.test_case_id)
            test_cases_info = info_json.get("test_cases", {})
            sorted_keys = sorted(test_cases_info.keys(), key=lambda x: int(x) if x.isdigit() else x)
            info_list = [test_cases_info[key] for key in sorted_keys]
            create_data = utils.create_data_from_request_data(request_data)
            create_data.spj = info_json.get("spj", False)
            display_id = str(uuid.uuid4())
            problem = utils.create_problem_from_data(create_data, display_id, request_data.test_case_id, info_list)
            problem.created_by_id = user_profile.user_id
            if request_data.tags:
                problem.tags = await _process_tags(db, request_data.tags)
            if not is_admin:
                problem.visible = False
            problem = await problem_repository.save(db, problem)
            if not is_admin:
                await pending_service.create_pending(PendingTargetType.PROBLEM, problem.id, user_profile, db)
        await _set_redis_polling_state(polling_key, "done", 1, 0, 1, problem_id=problem.id)
    except Exception as e:
        logger.error(f"Failed to create problem: {e}")
        error_code = _extract_error_code(e)
        utils.remove_test_case_directory([request_data.test_case_id])
        await _set_redis_polling_state(polling_key, "error", 0, 1, 1, error_code)


async def update_problem(
        polling_key: str,
        problem_id: int,
        request_data: ProblemUpdateRequest,
        user_profile: UserProfile,
        is_admin: bool):
    try:
        await _set_redis_polling_state(polling_key, "processing", 0, 1, 1)
        async with get_background_database() as db:
            problem = await problem_repository.find_problem_with_tags_by_id(problem_id, db)
            if not problem:
                await _set_redis_polling_state(polling_key, "error", 0, 1, 1)
                problem_exceptions.problem_not_found()
            await _validate_problem_request(request_data, db, problem)
            await _apply_problem_updates(problem, request_data, db)
        await _set_redis_polling_state(polling_key, "done", 1, 0, 1, problem_id=problem.id)
    except Exception as e:
        logger.error(f"Failed to update problem: {e}")
        error_code = _extract_error_code(e)
        if request_data.test_case_id and problem and request_data.test_case_id != problem.test_case_id:
            utils.remove_test_case_directory([request_data.test_case_id])
        await _set_redis_polling_state(polling_key, "error", 0, 1, 1, error_code)


async def _validate_problem_request(request_data: Union[ProblemCreateRequest, ProblemUpdateRequest], db: AsyncSession,
                                    problem: Optional[Problem] = None):
    if not request_data.solution_code or not request_data.solution_code_language:
        return

    test_case_id = getattr(request_data, "test_case_id", None)
    if not test_case_id and problem:
        test_case_id = problem.test_case_id

    if not test_case_id:
        return

    test_case = utils.get_saved_test_case_by_id(test_case_id)
    validation_cases = list(test_case)

    samples = getattr(request_data, "samples", None)
    if samples is None and problem:
        samples = problem.samples

    if samples:
        for s in samples:
            if hasattr(s, "model_dump"):
                validation_cases.append(s.model_dump())
            else:
                validation_cases.append(s)

    await _validate_solution_code(
        solution_code=request_data.solution_code,
        solution_code_language=request_data.solution_code_language,
        test_case=validation_cases,
        db=db
    )


async def _apply_problem_updates(problem: Problem, request_data: ProblemUpdateRequest, db: AsyncSession):
    from datetime import datetime

    for field in ["title", "description", "input_description", "output_description",
                  "time_limit", "memory_limit", "template", "difficulty", "hint"]:
        val = getattr(request_data, field)
        if val is not None:
            setattr(problem, field, val)

    if request_data.samples is not None:
        problem.samples = [s.model_dump() for s in request_data.samples]

    if request_data.languages is not None:
        problem.languages = utils.normalize_languages(request_data.languages)

    if request_data.tags is not None:
        problem.tags = await _process_tags(db, request_data.tags)

    if request_data.test_case_id and request_data.test_case_id != problem.test_case_id:
        problem.test_case_id = request_data.test_case_id
        info_json = utils.load_test_case_info(request_data.test_case_id)
        test_cases_info = info_json.get("test_cases", {})
        sorted_keys = sorted(test_cases_info.keys(), key=lambda x: int(x) if x.isdigit() else x)
        info_list = [test_cases_info[key] for key in sorted_keys]

        raw_test_case_scores = [{"input_name": item["input_name"], "output_name": item.get("output_name"), "score": 0}
                                for item in info_list]
        problem.test_case_score = utils.calculate_test_case_score(raw_test_case_scores)
        if problem.rule_type == "OI":
            problem.total_score = sum([item.get("score", 0) for item in problem.test_case_score])

    problem.last_update_time = datetime.now()


async def _process_tags(db: AsyncSession, tags: List[str]):
    return [await problem_repository.get_or_create_tag(db, tag) for tag in tags]


async def _set_redis_polling_state(
        polling_key: str,
        status: str,
        processed_problem: int,
        left_problem: int,
        all_problem: int,
        error_code: str = "",
        error_message: str = "",
        problem_id: int | None = None):
    redis = await get_polling_task()
    if status != "initialized" and not await redis.get(polling_key):
        problem_exceptions.polling_not_found()
    data = ProblemImportPollingStatus(
        status=status,
        processed_problem=processed_problem,
        left_problem=left_problem,
        all_problem=all_problem,
        problem_id=problem_id)
    if error_code != "":
        data.error_code = error_code
    if error_message != "":
        data.error_message = error_message
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
        file_contents: bytes,
        filename: str,
        user_profile: UserProfile,
        is_admin: bool) -> str | None:
    problems = []
    testcase_list = []
    redis = await get_polling_task()
    raw = await redis.get(polling_key)
    if not raw:
        problem_exceptions.polling_not_found()
    status = ProblemImportPollingStatus.model_validate_json(raw)
    try:
        async with get_background_database() as db:
            if not file_contents:
                logger.error("No zip file provided")
                problem_exceptions.bad_zip_file()
            logger.info(f"Starting import. user: {user_profile.user_id}, file: {filename}")
            try:
                zip_ref = utils.open_zip_bytes(file_contents)
            except Exception:
                problem_exceptions.bad_zip_file()
            with zip_ref:
                file_list = zip_ref.namelist()
                md_paths = utils.filter_problem_md_paths(file_list)
                logger.info(f"Found {len(md_paths)} problems in zip")
                for i, path in enumerate(md_paths):
                    try:
                        problem = await _process_single_problem(zip_ref, file_list, path, user_profile.user_id, db)
                    except Exception as e:
                        title_hint = ""
                        try:
                            md_content = zip_ref.read(path).decode("utf-8")
                            meta_data, _ = utils.parse_problem_md(md_content)
                            parsed_title = meta_data.get("title")
                            if parsed_title:
                                title_hint = str(parsed_title)
                        except Exception:
                            # Keep import failure context best-effort only.
                            pass

                        context_prefix = f"[Problem {i + 1}/{len(md_paths)}]"
                        if title_hint:
                            context_prefix += f" {title_hint}"
                        context_prefix += f" ({path})"

                        if hasattr(e, "detail") and isinstance(getattr(e, "detail", None), dict):
                            original_message = e.detail.get("message", str(e))
                            e.detail["message"] = f"{context_prefix}\n{original_message}"
                        raise
                    problems.append(problem)
                    testcase_list.append(problem.test_case_id)
                    status.status = "processing"
                    status.processed_problem = i + 1
                    status.left_problem = status.all_problem - status.processed_problem
                    await _set_redis_polling_state(polling_key, "processing", i + 1, status.left_problem,
                                                   status.all_problem)
                status.status = "done"
                status.left_problem = 0
                logger.info(f"Polling finished: {status}")
                await _set_redis_polling_state(polling_key, "done", status.processed_problem, 0,
                                               status.all_problem)
            await problem_repository.create_problems(db, problems)
            logger.info(f"Successfully imported {len(problems)} problems")
            return problems
    except Exception as e:
        logger.error(f"Import failed: {e}")
        status.status = "error"
        status.error_code = _extract_error_code(e)
        status.error_message = _extract_error_message(e)
        await _set_redis_polling_state(polling_key, "error", status.processed_problem, status.left_problem,
                                       status.all_problem, error_code=status.error_code,
                                       error_message=status.error_message)
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


async def get_problem_detail(problem_id: int, db: AsyncSession) -> ProblemDetailResponse:
    problem = await problem_repository.find_problem_with_tags_by_id(problem_id, db)
    if not problem:
        problem_exceptions.problem_not_found()

    tags = problem.tags or []
    tag_payload = [{"id": t.id, "name": t.name} for t in tags]
    io_mode = problem.io_mode if isinstance(problem.io_mode, dict) else {"io_mode": "standard", "input": "input.txt", "output": "output.txt"}
    template = problem.template if isinstance(problem.template, dict) else {}
    samples = problem.samples or []

    return ProblemDetailResponse(
        id=problem.id,
        _id=problem._id,
        title=problem.title,
        description=problem.description,
        time_limit=problem.time_limit,
        memory_limit=problem.memory_limit,
        create_time=problem.create_time,
        last_update_time=problem.last_update_time,
        created_by_id=problem.created_by_id,
        rule_type=problem.rule_type,
        visible=problem.visible,
        difficulty=problem.difficulty,
        total_score=problem.total_score or 0,
        submission_number=problem.submission_number or 0,
        accepted_number=problem.accepted_number or 0,
        test_case_score=problem.test_case_score or [],
        status=None,
        tags=tag_payload,
        input_description=problem.input_description,
        output_description=problem.output_description,
        samples=samples,
        languages=problem.languages or [],
        template=template,
        hint=problem.hint,
        source=problem.source,
        io_mode=io_mode,
        is_public=problem.visible,
        test_case_id=problem.test_case_id
    )


async def _process_tags(db: AsyncSession, tags: list[str]) -> list[ProblemTag]:
    processed: list[ProblemTag] = []
    seen = set()
    for raw in tags or []:
        if not isinstance(raw, str):
            continue
        name = raw.strip()
        if not name:
            continue
        if name in seen:
            continue
        seen.add(name)
        tag = await problem_repository.get_or_create_tag(db, name)
        processed.append(tag)
    return processed


async def get_filter_sorted_problems(
        tags: Optional[List[str]],
        keyword: Optional[str],
        difficulty_min: Optional[int],
        difficulty_max: Optional[int],
        sort_option: Optional[str],
        order: Optional[str],
        page: int,
        page_size: int,
        request_user: Optional[UserProfile],
        db: AsyncSession,
) -> ProblemListResponse:
    problems = await problem_repository.find_filtered_problems(
        tags=tags,
        keyword=keyword,
        difficulty_min=difficulty_min,
        difficulty_max=difficulty_max,
        sort_option=sort_option,
        order=order,
        page=page,
        page_size=page_size,
        db=db,
    )

    items: List[ProblemSchema] = [
        ProblemSchema.model_validate(problem, from_attributes=True)
        for problem in problems.items
    ]

    if request_user:
        problem_ids = [problem.id for problem in problems.items]
        solved_problem_ids = await problem_repository.find_solved_problems_user_id(
            request_user.user_id,
            problem_ids,
            db,
        )
        solved_set = set(solved_problem_ids)
        attempted_problem_ids = await problem_repository.find_attempted_problems_user_id(
            request_user.user_id,
            problem_ids,
            db,
        )
        attempted_set = set(attempted_problem_ids)

        items = [
            ProblemSchema.model_validate(problem, from_attributes=True).model_copy(
                update={"status": 2 if problem.id in solved_set else (1 if problem.id in attempted_set else 0)}
            )
            for problem in problems.items
        ]

    return ProblemListResponse(
        total=problems.total,
        page=problems.page,
        size=problems.size,
        items=items,
    )


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


async def get_contributed_problem(user_profile: UserProfile, page: int, size: int, db: AsyncSession):
    problems = await problem_repository.find_problems_by_creator_id(user_profile.user_id, page, size, db)
    return problems.map(ProblemSchema.model_validate)


async def get_available_contest_problem(
        page: int,
        size: int,
        keyword: Optional[str],
        user_profile: UserProfile,
        db: AsyncSession
) -> ProblemListResponse:
    page_data = await problem_repository.find_available_problems_by_creator_id_and_keyword(
        page=page,
        page_size=size,
        user_id=user_profile.user_id,
        keyword=keyword,
        db=db)

    serialized = [ProblemSchema.model_validate(problem, from_attributes=True) for problem in page_data.items]

    return ProblemListResponse(
        total=page_data.total,
        page=page_data.page,
        size=page_data.size,
        items=serialized,
    )


async def get_problem(problem_id, db) -> ProblemResponse:
    problem = await problem_repository.find_problem_with_tags_by_id(problem_id, db)
    if not problem or problem.visible == False:
        problem_exceptions.problem_not_found()
    return ProblemResponse.model_validate(problem)
