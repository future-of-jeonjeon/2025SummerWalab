import os, re
from dotenv import load_dotenv

from app.utils.logging import logger
from app.config.database import get_session
from app.config.redis import get_redis_code_save
import app.code_autosave.service as autosave_serv
from app.utils.logging import logger

load_dotenv()
CODE_SAVE_PREFIX = os.getenv("REDIS_CODE_SAVE_PREFIX")
LOCAL_TOKEN_COOKIE_NAME = os.getenv("LOCAL_TOKEN_COOKIE_NAME")
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
    logger.info(f"debounce_key={debounce_key}")
    if not debounce_key.startswith(f"{CODE_SAVE_PREFIX}:debounce:"):
        logger.info("skip: prefix not matched")
        return
    user_id, problem_id, language = _parse_debounce_key(debounce_key)
    logger.info(f"parsed uid={user_id} pid={problem_id} lang={language}")
    data_key = autosave_serv.get_data_key(problem_id, language, user_id)
    logger.info(f"data_key={data_key}")
    logger.info("try redis.get")
    code = await redis.get(data_key)
    logger.info(f"redis.get done -> exists={code is not None}")
    if code is None:
        logger.info("no code found for data_key; skip persist")
        return
    logger.info("about to open db session (get_session)")
    try:
        async for db in get_session():
            logger.info("db session acquired; calling save_code_to_database")
            await autosave_serv.save_code_to_database(problem_id, language, code, user_id, db)
            logger.info("save_code_to_database returned")
            break
        logger.info(f"deleting data_key={data_key}")
        await redis.delete(data_key)
        logger.info("redis.delete done")
    except Exception as e:
        logger.error(f"auto_save_persist failed: {e}")
        return
    await redis.delete(data_key)
    logger.info(f"code save success: problem = {problem_id} user = {user_id} lang = {language}")


def _parse_debounce_key(key: str):
    match = KEY_PATTERN.match(key)
    if not match:
        logger.warning(f"parse failed for key={key}")
        return None
    return int(match["uid"]), int(match["pid"]), match["lang"]
