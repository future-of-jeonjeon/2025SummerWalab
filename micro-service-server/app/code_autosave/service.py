from sqlalchemy.ext.asyncio import AsyncSession
from app.common.page import Page
from app.core.settings import settings
from app.code_autosave.schemas import CustomCodeResponse, SolvedCodeResponse
from app.core.redis import get_redis_code_save
from app.user.schemas import UserProfile
from app.code_autosave.models import ProblemCode, CustomCode

import app.code_autosave.repository as autosave_repository
import app.submission.repository as submission_repository
import app.problem.repository as problem_repository
CODE_SAVE_PREFIX = settings.REDIS_CODE_SAVE_PREFIX


def _get_extension_by_language(language: str) -> str:
    normalized = (language or "").strip().lower()
    mapping = {
        "c": "c",
        "gcc": "c",
        "cpp": "cpp",
        "c++": "cpp",
        "g++": "cpp",
        "java": "java",
        "python": "py",
        "python2": "py",
        "python3": "py",
        "go": "go",
        "golang": "go",
        "javascript": "js",
        "js": "js",
        "nodejs": "js",
    }
    return mapping.get(normalized, normalized or "txt")


def _sanitize_file_stem(raw: str) -> str:
    invalid = set('\\/:*?"<>|')
    sanitized = "".join("_" if ch in invalid else ch for ch in (raw or "").strip())
    return sanitized if sanitized else "untitled"


async def get_problem_code(problem_id, language, user_id: int, db: AsyncSession):
    code = await _get_code_by_redis(problem_id, language, user_id)
    if code:
        return code
    record = await autosave_repository.find_by_problem_id_and_user_id_and_language(problem_id, user_id, language, db)
    if not record:
        return ""
    return record.code


async def save_problem_code(problem_id: int, language, code, user_profile: UserProfile):
    await _save_problem_code_to_redis(problem_id, language, code, user_profile.user_id)
    return


async def _get_code_by_redis(problem_id, language, user_id: int) -> str:
    redis = await get_redis_code_save()
    key = get_data_key(problem_id, language, user_id)
    data = await redis.get(key)
    return data


async def _save_problem_code_to_redis(problem_id: int, language: str, code: str, user_id: int):
    code_save_ttl_seconds = settings.CODE_SAVE_TTL_SECONDS
    redis = await get_redis_code_save()
    data_key = get_data_key(problem_id, language, user_id)
    debounce_key = _get_debounce_key(problem_id, language, user_id)
    await redis.set(data_key, code)
    await redis.setex(debounce_key, code_save_ttl_seconds, "1")  # "1" -> dummy
    return


async def _save_custom_code_to_redis(file_name: str, code: str, user_id: int):
    code_save_ttl_seconds = settings.CODE_SAVE_TTL_SECONDS
    redis = await get_redis_code_save()
    data_key = get_custom_code_data_key(file_name, user_id)
    debounce_key = _get_custom_code_debounce_key(file_name, user_id)
    await redis.set(data_key, code)
    await redis.setex(debounce_key, code_save_ttl_seconds, "1")  # "1" -> dummy
    return


async def save_code_to_database(problem_id: int, language: str, code: str, user_id: int, db: AsyncSession):
    current_data = await autosave_repository.find_by_problem_id_and_user_id_and_language(problem_id, user_id, language,
                                                                                         db)
    entity = ProblemCode(problem_id=problem_id, user_id=user_id, language=language, code=code)
    if current_data:
        entity.id = current_data.id

    await autosave_repository.save(entity, db)
    return


async def save_custom_code_to_database(file_name: str, code: str, user_id: int, db: AsyncSession):
    entity = CustomCode(file_name=file_name, user_id=user_id, code=code)
    await autosave_repository.save_custom_code(entity, db)
    return


def get_data_key(problem_id: int, language: str, user_id: int) -> str:
    return f"{CODE_SAVE_PREFIX}:data:user:{user_id}:problem:{problem_id}:lang:{language}"


def get_custom_code_data_key(file_name: str, user_id: int) -> str:
    return f"{CODE_SAVE_PREFIX}:data:user:{user_id}:file_name:{file_name}"


def _get_debounce_key(problem_id: int, language: str, user_id: int) -> str:
    return f"{CODE_SAVE_PREFIX}:debounce:user:{user_id}:problem:{problem_id}:lang:{language}"


def _get_custom_code_debounce_key(file_name: str, user_id: int) -> str:
    return f"{CODE_SAVE_PREFIX}:debounce:user:{user_id}:file_name:{file_name}"


async def get_code_by_file_name(file_name, user_profile, db) -> CustomCodeResponse:
    redis = await get_redis_code_save()
    data_key = get_custom_code_data_key(file_name, user_profile.user_id)
    code = await redis.get(data_key)
    if code is None:
        code = await autosave_repository.get_custom_code_by_file_name_and_user_id(file_name, user_profile.user_id, db)
    if code is None:
        code = ""
    return CustomCodeResponse(file_name=file_name, code=code)


async def get_all_custom_code(user_profile: UserProfile, db: AsyncSession) -> list[CustomCodeResponse]:
    entities = await autosave_repository.get_custom_code_list_by_user_id(user_profile.user_id, db)
    return [
        CustomCodeResponse(
            file_name=str(entity.file_name or ""),
            code=str(entity.code or ""),
        )
        for entity in entities
        if str(entity.file_name or "").strip()
    ]


async def get_all_solved_problem_code(
        user_profile: UserProfile,
        page: int,
        size: int,
        db: AsyncSession) -> Page[SolvedCodeResponse]:
    submissions_page = await submission_repository.find_solved_submission_by_user_id_paginated(
        user_id=user_profile.user_id,
        page=page,
        size=size,
        db=db,
    )
    problem_ids = list({submission.problem_id for submission in submissions_page.items})
    title_map: dict[int, str] = {}
    if problem_ids:
        for problem_id in problem_ids:
            problem = await problem_repository.find_problem_by_id(problem_id, db)
            if problem is not None:
                title_map[int(problem.id)] = str(problem.title)

    items: list[SolvedCodeResponse] = []
    for submission in submissions_page.items:
        file_stem = _sanitize_file_stem(title_map.get(submission.problem_id, str(submission.problem_id)))
        extension = _get_extension_by_language(submission.language)
        items.append(
            SolvedCodeResponse(
                id=int(submission.problem_id),
                file_name=f"{file_stem}.{extension}",
                language=submission.language or "",
                code=submission.code or "",
            )
        )

    return Page(
        items=items,
        total=submissions_page.total,
        page=submissions_page.page,
        size=submissions_page.size,
    )


async def create_custom_code(request_data, user_profile: UserProfile, db: AsyncSession):
    file_name = (request_data.file_name or "").strip()
    if not file_name:
        return None
    code = request_data.code or ""
    await _save_custom_code_to_redis(file_name, code, user_profile.user_id)
    await save_custom_code_to_database(file_name, code, user_profile.user_id, db)
    return None


async def save_custom_code(request_data, user_profile: UserProfile, db: AsyncSession):
    file_name = (request_data.file_name or "").strip()
    if not file_name:
        return None
    code = request_data.code or ""
    await _save_custom_code_to_redis(file_name, code, user_profile.user_id)
    await save_custom_code_to_database(file_name, code, user_profile.user_id, db)
    return None


async def delete_custom_code(file_name: str, user_profile: UserProfile, db: AsyncSession):
    redis = await get_redis_code_save()
    await redis.delete(get_custom_code_data_key(file_name, user_profile.user_id))
    await redis.delete(_get_custom_code_debounce_key(file_name, user_profile.user_id))
    await autosave_repository.delete_custom_code_by_file_name_and_user_id(file_name, user_profile.user_id, db)
    return


async def rename_custom_code(old_file_name: str, new_file_name: str, user_profile: UserProfile, db: AsyncSession):
    old_name = (old_file_name or "").strip()
    new_name = (new_file_name or "").strip()
    if not old_name or not new_name or old_name == new_name:
        return None

    redis = await get_redis_code_save()
    old_data_key = get_custom_code_data_key(old_name, user_profile.user_id)
    code = await redis.get(old_data_key)
    if code is None:
        code = await autosave_repository.get_custom_code_by_file_name_and_user_id(old_name, user_profile.user_id, db)
    if code is None:
        code = ""

    await _save_custom_code_to_redis(new_name, code, user_profile.user_id)
    await save_custom_code_to_database(new_name, code, user_profile.user_id, db)

    await redis.delete(old_data_key)
    await redis.delete(_get_custom_code_debounce_key(old_name, user_profile.user_id))
    await autosave_repository.delete_custom_code_by_file_name_and_user_id(old_name, user_profile.user_id, db)
    return None
