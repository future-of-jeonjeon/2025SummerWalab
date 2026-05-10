import io
import json
import os
import random
import uuid
import zipfile
from datetime import datetime, date, timedelta
from typing import Union
from zoneinfo import ZoneInfo

from fastapi import UploadFile
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_background_database
from app.contest.models import OrganizationContest, ContestLanguage
from app.core.logger import logger
from app.core.settings import settings
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
import app.problem.repository as problem_repository
import app.contest.repository as contest_repository
import app.problem.exceptions as problem_exceptions
import app.contest.exceptions as contest_exceptions

POLLING_SESSION_TIME = 3600
SEOUL_TZ = ZoneInfo("Asia/Seoul")
DAILY_PROBLEM_LOCK_KEY = 2026040301
PROBLEM_FILE_SCHEMA_VERSION = 1
PROBLEM_EQUALITY_FIELDS = (
    "_id",
    "title",
    "description",
    "input_description",
    "output_description",
    "samples",
    "test_case_id",
    "test_case_score",
    "hint",
    "languages",
    "template",
    "time_limit",
    "memory_limit",
    "io_mode",
    "spj",
    "spj_language",
    "spj_code",
    "spj_version",
    "spj_compile_ok",
    "rule_type",
    "visible",
    "difficulty",
    "source",
    "total_score",
    "share_submission",
    "is_public",
    "tags",
)
EXPORT_LANGUAGE_TO_EXTENSION = {
    "Python3": ".py",
    "C++": ".cpp",
    "C": ".c",
    "Java": ".java",
    "Golang": ".go",
    "Go": ".go",
    "JavaScript": ".js",
}


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


def _build_problem_file_payload(problem: Problem) -> ProblemFilePayloadV1:
    return ProblemFilePayloadV1(
        _id=problem._id,
        title=problem.title,
        description=problem.description,
        input_description=problem.input_description,
        output_description=problem.output_description,
        samples=problem.samples or [],
        test_case_id=problem.test_case_id,
        test_case_score=problem.test_case_score or [],
        hint=problem.hint,
        languages=problem.languages or [],
        template=problem.template or {},
        time_limit=problem.time_limit,
        memory_limit=problem.memory_limit,
        io_mode=problem.io_mode or {"io_mode": "standard", "input": "input.txt", "output": "output.txt"},
        spj=bool(problem.spj),
        spj_language=problem.spj_language,
        spj_code=problem.spj_code,
        spj_version=problem.spj_version,
        spj_compile_ok=bool(problem.spj_compile_ok),
        rule_type=problem.rule_type,
        visible=bool(problem.visible),
        difficulty=problem.difficulty,
        source=problem.source,
        total_score=int(problem.total_score or 0),
        share_submission=bool(problem.share_submission),
        is_public=bool(problem.is_public),
        tags=sorted([tag.name for tag in (problem.tags or []) if getattr(tag, "name", None)]),
    )


def _migrate_problem_file_payload(raw: dict) -> dict:
    version = raw.get("schemaVersion")
    if version == PROBLEM_FILE_SCHEMA_VERSION:
        return raw
    problem_exceptions.export_unsupported_version(version)
    return raw


def _parse_problem_file(file_contents: bytes) -> ProblemFileEnvelope:
    try:
        raw = json.loads(file_contents.decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        problem_exceptions.export_invalid_json(str(exc))

    migrated = _migrate_problem_file_payload(raw)
    try:
        return ProblemFileEnvelope.model_validate(migrated)
    except ValidationError as exc:
        problem_exceptions.export_validation_error(str(exc))


def build_problem_semantic_identity(problem: Problem | ProblemFilePayloadV1) -> dict:
    if isinstance(problem, ProblemFilePayloadV1):
        dump = problem.model_dump(by_alias=True)
    else:
        dump = _build_problem_file_payload(problem).model_dump(by_alias=True)
    return {k: dump.get(k) for k in PROBLEM_EQUALITY_FIELDS}


async def export_problem_file(problem_id: int, db: AsyncSession) -> dict:
    problem = await problem_repository.find_problem_with_tags_by_id(problem_id, db)
    if not problem:
        problem_exceptions.problem_not_found()
    envelope = ProblemFileEnvelope(
        schemaVersion=PROBLEM_FILE_SCHEMA_VERSION,
        problem=_build_problem_file_payload(problem),
    )
    return envelope.model_dump(by_alias=True)


async def import_problem_file(
        file_contents: bytes,
        user_profile: UserProfile,
        is_admin: bool,
        db: AsyncSession) -> ProblemFileImportResponse:
    envelope = _parse_problem_file(file_contents)
    payload = envelope.problem

    try:
        info_json = utils.load_test_case_info(payload.test_case_id)
    except Exception:  # noqa: BLE001
        problem_exceptions.test_case_not_found(payload.test_case_id)

    test_cases_info = info_json.get("test_cases", {})
    sorted_keys = sorted(test_cases_info.keys(), key=lambda x: int(x) if x.isdigit() else x)
    info_list = [test_cases_info[key] for key in sorted_keys]

    create_data = CreateProblemData(
        title=payload.title,
        description=payload.description,
        input_description=payload.input_description,
        output_description=payload.output_description,
        samples=[Sample.model_validate(item) for item in payload.samples],
        time_limit=payload.time_limit,
        memory_limit=payload.memory_limit,
        languages=payload.languages,
        template=payload.template,
        difficulty=payload.difficulty or "",
        tags=payload.tags,
        hint=payload.hint,
        source=payload.source,
        spj=payload.spj,
        spj_code=payload.spj_code,
        spj_language=payload.spj_language,
        rule_type=payload.rule_type,
        io_mode=payload.io_mode,
        test_case_score=payload.test_case_score or [],
        visible=payload.visible,
    )
    problem = utils.create_problem_from_data(
        data=create_data,
        display_id=payload.display_id,
        test_case_id=payload.test_case_id,
        test_case_list=info_list,
    )
    problem.created_by_id = user_profile.user_id
    problem.spj_version = payload.spj_version
    problem.spj_compile_ok = payload.spj_compile_ok
    problem.total_score = payload.total_score
    problem.share_submission = payload.share_submission
    problem.is_public = payload.is_public if is_admin else False
    problem.visible = payload.visible if is_admin else True
    problem.tags = await _process_tags(db, payload.tags)

    try:
        problem = await problem_repository.save(db, problem)
    except IntegrityError:
        problem_exceptions.invalid_metadata("Duplicate display id(_id) already exists")

    return ProblemFileImportResponse(id=problem.id, _id=problem._id)


async def validate_problem_round_trip(problem_id: int, db: AsyncSession) -> ProblemRoundTripCompareResponse:
    problem = await problem_repository.find_problem_with_tags_by_id(problem_id, db)
    if not problem:
        problem_exceptions.problem_not_found()

    export_data = await export_problem_file(problem_id, db)
    restored_payload = _parse_problem_file(json.dumps(export_data).encode("utf-8")).problem
    original_identity = build_problem_semantic_identity(problem)
    restored_identity = build_problem_semantic_identity(restored_payload)
    return ProblemRoundTripCompareResponse(
        equals=(original_identity == restored_identity),
        original=original_identity,
        restored=restored_identity,
    )


def _build_problem_md_for_export(problem: Problem, tags: list[str]) -> str:
    metadata: dict[str, object] = {
        "title": problem.title,
        "time_limit": problem.time_limit,
        "memory_limit": problem.memory_limit,
        "languages": problem.languages or [],
        "template": problem.template or {},
        "level": problem.difficulty or "0",
        "tags": tags,
        "source": problem.source or "",
        # export zip 재가져오기 전용 훅: 기존 사용자 zip은 영향 없음
        "skip_solution_validation": True,
    }

    default_io_mode = {"io_mode": "Standard IO", "input": "input.txt", "output": "output.txt"}
    io_mode = problem.io_mode or default_io_mode
    if io_mode != default_io_mode:
        metadata["io_mode"] = io_mode

    if problem.rule_type and problem.rule_type != "ACM":
        metadata["rule_type"] = problem.rule_type

    if problem.spj:
        metadata["spj"] = True
        if problem.spj_code:
            metadata["spj_code"] = problem.spj_code
        if problem.spj_language:
            metadata["spj_language"] = problem.spj_language

    if problem.rule_type == "OI" and (problem.test_case_score or []):
        metadata["test_case_score"] = problem.test_case_score

    if not bool(problem.visible):
        metadata["visible"] = False

    lines: list[str] = ["---"]
    for key, value in metadata.items():
        lines.append(f"{key}: {json.dumps(value, ensure_ascii=False)}")
    lines.append("---")
    lines.append("")

    lines.append("## description")
    lines.append(problem.description or "")
    lines.append("")
    lines.append("## input_description")
    lines.append(problem.input_description or "")
    lines.append("")
    lines.append("## output_description")
    lines.append(problem.output_description or "")
    lines.append("")
    lines.append("## hint")
    lines.append(problem.hint or "")
    lines.append("")
    lines.append("## samples")
    for sample in (problem.samples or []):
        lines.append("### input")
        lines.append(sample.get("input", ""))
        lines.append("### output")
        lines.append(sample.get("output", ""))
        lines.append("")
    return "\n".join(lines)


def _build_solution_file_for_export(problem: Problem) -> tuple[str, str]:
    languages = problem.languages or []
    preferred = languages[0] if languages else "Python3"
    extension = EXPORT_LANGUAGE_TO_EXTENSION.get(preferred, ".py")
    template = problem.template or {}
    code = template.get(preferred) or template.get("Python3") or "print()"
    return f"solution{extension}", code


def _collect_test_case_files(problem: Problem) -> list[tuple[str, bytes]]:
    info = utils.load_test_case_info(problem.test_case_id)
    test_case_dir = os.path.join(settings.TEST_CASE_DATA_PATH, problem.test_case_id)
    test_cases_info = info.get("test_cases", {})
    sorted_keys = sorted(test_cases_info.keys(), key=lambda x: int(x) if x.isdigit() else x)
    files: list[tuple[str, bytes]] = []
    for key in sorted_keys:
        case = test_cases_info[key]
        input_name = case.get("input_name")
        output_name = case.get("output_name")
        if input_name:
            input_path = os.path.join(test_case_dir, input_name)
            with open(input_path, "rb") as f:
                files.append((f"test/{input_name}", f.read()))
        if output_name:
            output_path = os.path.join(test_case_dir, output_name)
            if os.path.exists(output_path):
                with open(output_path, "rb") as f:
                    files.append((f"test/{output_name}", f.read()))
    return files


async def export_problem_zip(problem_id: int, db: AsyncSession) -> tuple[bytes, str]:
    problem = await problem_repository.find_problem_with_tags_by_id(problem_id, db)
    if not problem:
        problem_exceptions.problem_not_found()

    tags = sorted([tag.name for tag in (problem.tags or []) if getattr(tag, "name", None)])
    folder_name = f"problem-{problem._id}"
    md_content = _build_problem_md_for_export(problem, tags)
    solution_name, solution_code = _build_solution_file_for_export(problem)
    test_files = _collect_test_case_files(problem)

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"{folder_name}/problem.md", md_content)
        zf.writestr(f"{folder_name}/{solution_name}", solution_code)
        for relative_path, content in test_files:
            zf.writestr(f"{folder_name}/{relative_path}", content)
    zip_buffer.seek(0)
    return zip_buffer.getvalue(), f"{folder_name}.zip"


async def export_problems_zip(problem_ids: list[int], db: AsyncSession) -> tuple[bytes, str]:
    if not problem_ids:
        problem_exceptions.invalid_metadata("problem_ids is required")

    zip_buffer = io.BytesIO()
    found_count = 0
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for problem_id in problem_ids:
            problem = await problem_repository.find_problem_with_tags_by_id(problem_id, db)
            if not problem:
                continue
            found_count += 1
            tags = sorted([tag.name for tag in (problem.tags or []) if getattr(tag, "name", None)])
            folder_name = f"problem-{problem._id}"
            md_content = _build_problem_md_for_export(problem, tags)
            solution_name, solution_code = _build_solution_file_for_export(problem)
            test_files = _collect_test_case_files(problem)

            zf.writestr(f"{folder_name}/problem.md", md_content)
            zf.writestr(f"{folder_name}/{solution_name}", solution_code)
            for relative_path, content in test_files:
                zf.writestr(f"{folder_name}/{relative_path}", content)

    if found_count == 0:
        problem_exceptions.problem_not_found()

    zip_buffer.seek(0)
    filename = "problem-export.zip" if found_count > 1 else f"problem-{problem_ids[0]}.zip"
    return zip_buffer.getvalue(), filename


async def create_problem(
        polling_key: str,
        request_data: ProblemCreateRequest,
        user_profile: UserProfile,
        is_admin: bool,
        contest_id: int | None = None,
        is_contest: bool = False):
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
                problem.visible = True
                problem.is_public = False
            problem = await problem_repository.save(db, problem)
            if not is_admin and not is_contest:
                await pending_service.create_pending(PendingTargetType.PROBLEM, problem.id, user_profile, db)
            if not is_admin and is_contest:
                problem = await _set_problem_contest_language(contest_id, problem, db)
        await _set_redis_polling_state(polling_key, "done", 1, 0, 1, problem_id=problem.id)
    except Exception as e:
        logger.error(f"Failed to create problem: {e}")
        error_code = _extract_error_code(e)
        utils.remove_test_case_directory([request_data.test_case_id])
        await _set_redis_polling_state(polling_key, "error", 0, 1, 1, error_code)


async def _set_problem_contest_language(contest_id: int, problem: Problem, db: AsyncSession) -> Problem:
    contest_language: ContestLanguage = await contest_repository.find_contest_language_by_contest_id(contest_id, db)
    if not contest_language:
        contest_exceptions.contest_not_found()
    problem.contest_id = contest_id
    problem.languages = contest_language.languages
    return problem


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
        is_admin: bool,
        contest_id: int | None = None,
        display_id_start_point: int | None = None,
        is_contest: bool = False) -> str | None:
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
            if is_contest:
                for offset, problem in enumerate(problems, start=0):
                    problem._id = str(display_id_start_point + offset)
                    problem.visible = False
                    problem.contest_id = contest_id
                    contest_language: ContestLanguage = await contest_repository.find_contest_language_by_contest_id(
                        contest_id, db)
                    problem.languages = contest_language.languages
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
    skip_solution_validation = bool(meta_data.get("skip_solution_validation", False))
    if not skip_solution_validation:
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
    io_mode = problem.io_mode if isinstance(problem.io_mode, dict) else {"io_mode": "standard", "input": "input.txt",
                                                                         "output": "output.txt"}
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


def choose_daily_problem_id(
        problem_ids: list[int],
        yesterday_problem_id: int | None,
        seed: int | None = None) -> int:
    if not problem_ids:
        problem_exceptions.problem_not_found()

    candidates = list(problem_ids)
    if yesterday_problem_id is not None and len(candidates) > 1:
        filtered = [problem_id for problem_id in candidates if problem_id != yesterday_problem_id]
        if filtered:
            candidates = filtered

    rng = random.Random(seed) if seed is not None else random.SystemRandom()
    return int(rng.choice(candidates))


def _to_daily_response(entity) -> DailyProblemResponse:
    return DailyProblemResponse(
        date=entity.challenge_date.isoformat(),
        selected_at=entity.selected_at,
        problem_id=entity.problem.id,
        title=entity.problem.title,
        description=entity.problem.description,
    )


async def _create_daily_problem(
        db: AsyncSession,
        *,
        challenge_date: date,
        seed: int | None = None) -> DailyProblemResponse:
    await problem_repository.lock_daily_problem_selection(db, DAILY_PROBLEM_LOCK_KEY)

    existing = await problem_repository.find_daily_problem_by_date(db, challenge_date)
    if existing:
        return _to_daily_response(existing)

    problem_ids = await problem_repository.find_daily_candidate_problem_ids(db)
    yesterday_problem_id = await problem_repository.find_daily_problem_by_problem_date(db, challenge_date - timedelta(days=1))
    selected_problem_id = choose_daily_problem_id(problem_ids, yesterday_problem_id, seed=seed)

    try:
        created = await problem_repository.create_daily_problem(
            db,
            problem_id=selected_problem_id,
            challenge_date=challenge_date,
            selected_at=datetime.now(SEOUL_TZ),
        )
    except IntegrityError:
        # Another instance may have committed first after lock wait boundaries.
        await db.rollback()
        entity = await problem_repository.find_daily_problem_by_date(db, challenge_date)
        if not entity:
            raise
        return _to_daily_response(entity)

    return _to_daily_response(created)


async def get_or_create_daily_problem(
        db: AsyncSession,
        *,
        target_date: date | None = None) -> DailyProblemResponse:
    challenge_date = target_date or datetime.now(SEOUL_TZ).date()
    entity = await problem_repository.find_daily_problem_by_date(db, challenge_date)
    if entity:
        return _to_daily_response(entity)
    return await _create_daily_problem(db, challenge_date=challenge_date)


async def reselect_daily_problem(
        db: AsyncSession,
        *,
        seed: int | None = None,
        target_date: date | None = None) -> DailyProblemResponse:
    challenge_date = target_date or datetime.now(SEOUL_TZ).date()
    await problem_repository.lock_daily_problem_selection(db, DAILY_PROBLEM_LOCK_KEY)

    problem_ids = await problem_repository.find_daily_candidate_problem_ids(db)
    yesterday_problem_id = await problem_repository.find_daily_problem_by_problem_date(db, challenge_date - timedelta(days=1))
    selected_problem_id = choose_daily_problem_id(problem_ids, yesterday_problem_id, seed=seed)

    existing = await problem_repository.find_daily_problem_by_date(db, challenge_date)
    if existing:
        existing.problem_id = selected_problem_id
        existing.selected_at = datetime.now(SEOUL_TZ)
        await db.flush()
        await db.refresh(existing)
        refreshed = await problem_repository.find_daily_problem_by_date(db, challenge_date)
        return _to_daily_response(refreshed)

    return await _create_daily_problem(db, challenge_date=challenge_date, seed=seed)
