import re


from app.core.logger import logger
from app.api.deps import get_database
from app.core.redis import get_redis_code_save
import app.code_autosave.service as autosave_serv


from app.core.settings import settings

CODE_SAVE_PREFIX = settings.REDIS_CODE_SAVE_PREFIX
PROBLEM_KEY_PATTERN = re.compile(
    rf"^(?P<prefix>{re.escape(CODE_SAVE_PREFIX)}):debounce:user:(?P<uid>\d+):problem:(?P<pid>\d+):lang:(?P<lang>[a-zA-Z0-9_]+)$"
)
FILE_KEY_PATTERN = re.compile(
    rf"^(?P<prefix>{re.escape(CODE_SAVE_PREFIX)}):debounce:user:(?P<uid>\d+):file_name:(?P<file_name>.+)$"
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
    if isinstance(debounce_key, bytes):
        debounce_key = debounce_key.decode("utf-8", errors="ignore")
    if not isinstance(debounce_key, str):
        logger.info("skip: debounce key is not a string")
        return
    if not debounce_key.startswith(f"{CODE_SAVE_PREFIX}:debounce:"):
        logger.info("skip: prefix not matched")
        return
    parsed = _parse_debounce_key(debounce_key)
    if not parsed:
        return

    if parsed["kind"] == "problem":
        data_key = autosave_serv.get_data_key(parsed["problem_id"], parsed["language"], parsed["user_id"])
    else:
        data_key = autosave_serv.get_custom_code_data_key(parsed["file_name"], parsed["user_id"])

    code = await redis.get(data_key)
    logger.info(f"redis.get done -> exists={code is not None}")
    if code is None:
        return
    try:
        async for db in get_database():
            if parsed["kind"] == "problem":
                await autosave_serv.save_code_to_database(
                    parsed["problem_id"],
                    parsed["language"],
                    code,
                    parsed["user_id"],
                    db,
                )
            else:
                await autosave_serv.save_custom_code_to_database(
                    parsed["file_name"],
                    code,
                    parsed["user_id"],
                    db,
                )
            break
        await redis.delete(data_key)
    except Exception as e:
        logger.exception(e)
        return


def _parse_debounce_key(key: str):
    problem_match = PROBLEM_KEY_PATTERN.match(key)
    if problem_match:
        return {
            "kind": "problem",
            "user_id": int(problem_match["uid"]),
            "problem_id": int(problem_match["pid"]),
            "language": problem_match["lang"],
        }

    file_match = FILE_KEY_PATTERN.match(key)
    if file_match:
        return {
            "kind": "file",
            "user_id": int(file_match["uid"]),
            "file_name": file_match["file_name"],
        }

    logger.warning(f"parse failed for key={key}")
    return None
