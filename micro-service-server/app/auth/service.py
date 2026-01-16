from fastapi import Request

from app.auth import exceptions
from app.security.security import exchange_sso_for_local_token, get_redis

from app.core.logger import logger
from app.core.settings import settings

TOKEN_NAME = settings.TOKEN_COOKIE_NAME

async def login(req):
    token_ttl_seconds = settings.LOCAL_TOKEN_TTL_SECONDS
    token = await _get_token(req)
    session_token = await exchange_sso_for_local_token(token)
    logger.info("Login requested, Token = %s, Session Token = %s", token, session_token)
    return await _create_cookie_data(session_token, token_ttl_seconds)


async def logout(req: Request):
    redis_session_prefix = settings.REDIS_SESSION_PREFIX
    token = req.cookies.get(TOKEN_NAME)
    logger.info("logout request: token = %s", token)
    redis = await get_redis()
    redis_key = f"{redis_session_prefix}{token}"
    await redis.delete(redis_key)
    return await _create_cookie_data("", 0)


async def _get_token(req):
    token = req.token
    if not token:
        exceptions.bad_request()
    return token


async def _create_cookie_data(value: str, age: int):
    return {
        "key": TOKEN_NAME,
        "value": value,
        "httponly": True,
        "max_age": age,
        "samesite": "Strict",
    }
