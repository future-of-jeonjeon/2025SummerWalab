import re


from app.core.logger import logger
from app.api.deps import get_database
from app.core.redis import get_redis_code_save
import app.code_autosave.service as autosave_serv


from app.core.settings import settings

CODE_SAVE_PREFIX = settings.REDIS_CODE_SAVE_PREFIX
KEY_PATTERN = re.compile(
    rf"^(?P<prefix>{re.escape(CODE_SAVE_PREFIX)}):debounce:user:(?P<uid>\d+):problem:(?P<pid>\d+):lang:(?P<lang>[a-zA-Z0-9_]+)$"
)

async def code_save_listener():
    redis = await get_redis_code_save()
    pubsub = redis.pubsub()
    await pubsub.subscribe("__keyevent@10__:expired")
    logger.info("listener subscribed to __keyevent@10__:expired")
    async for msg in pubsub.listen():
        if msg["type"] == "message":
            await _code_save(redis, msg["data"])


async def _code_save(redis, debounce_key):
    logger.info(f"code save initialized")
    if not debounce_key.startswith(f"{CODE_SAVE_PREFIX}:debounce:"):
        logger.info("skip: prefix not matched")
        return
    user_id, problem_id, language = _parse_debounce_key(debounce_key)
    data_key = autosave_serv.get_data_key(problem_id, language, user_id)
    code = await redis.get(data_key)
    logger.info(f"redis.get done -> exists={code is not None}")
    if code is None:
        return
    try:
        async for db in get_database():
            await autosave_serv.save_code_to_database(problem_id, language, code, user_id, db)
            break
        await redis.delete(data_key)
    except Exception as e:
        return
    await redis.delete(data_key)


def _parse_debounce_key(key: str):
    match = KEY_PATTERN.match(key)
    if not match:
        logger.warning(f"parse failed for key={key}")
        return None
    return int(match["uid"]), int(match["pid"]), match["lang"]
