from sqlalchemy.ext.asyncio import AsyncSession
from app.code_autosave.models import ProblemCode
from app.core.redis import get_redis_code_save
from app.user.schemas import UserData
import app.code_autosave.repository as autosave_repo
from app.core.settings import settings

CODE_SAVE_PREFIX = settings.REDIS_CODE_SAVE_PREFIX


async def get_code(problem_id, language, user_id: int, db: AsyncSession):
    code = await _get_code_by_redis(problem_id, language, user_id)
    if code:
        return code
    record = await autosave_repo.find_by_problem_id_and_user_id_and_language(problem_id, user_id, language, db)
    if not record:
        return ""
    return record.code


async def save_code(problem_id: int, language, code, userdata: UserData):
    await _save_code_to_redis(problem_id, language, code, userdata.user_id)
    return


async def _get_code_by_redis(problem_id, language, user_id: int) -> str:
    redis = await get_redis_code_save()
    key = get_data_key(problem_id, language, user_id)
    data = await redis.get(key)
    return data


async def _save_code_to_redis(problem_id: int, language: str, code: str, user_id: int):
    code_save_ttl_seconds = settings.CODE_SAVE_TTL_SECONDS
    redis = await get_redis_code_save()
    data_key = get_data_key(problem_id, language, user_id)
    debounce_key = _get_debounce_key(problem_id, language, user_id)
    await redis.set(data_key, code)
    await redis.setex(debounce_key, code_save_ttl_seconds, "1")  # "1" -> dummy
    return



async def save_code_to_database(problem_id: int, language: str, code: str, user_id: int, db: AsyncSession):
    current_data = await autosave_repo.find_by_problem_id_and_user_id_and_language(problem_id, user_id, language, db)
    entity = ProblemCode(problem_id=problem_id, user_id=user_id, language=language, code=code)
    if current_data:
        entity.id = current_data.id

    await autosave_repo.save(entity, db)
    return


def get_data_key(problem_id: int, language: str, user_id: int) -> str:
    return f"{CODE_SAVE_PREFIX}:data:user:{user_id}:problem:{problem_id}:lang:{language}"


def _get_debounce_key(problem_id: int, language: str, user_id: int) -> str:
    return f"{CODE_SAVE_PREFIX}:debounce:user:{user_id}:problem:{problem_id}:lang:{language}"
