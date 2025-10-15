from fastapi import Request

from fastapi import HTTPException
from app.security.security import exchange_sso_for_local_token, get_redis
from dotenv import load_dotenv
import os

from app.utils.logging import logger

load_dotenv()

TOKEN_TTL_SECONDS = int(os.getenv("LOCAL_TOKEN_TTL_SECONDS"))
REDIS_URL = os.getenv("REDIS_URL")
REDIS_SESSION_PREFIX = os.getenv("REDIS_SESSION_PREFIX")
TOKEN_NAME = os.getenv("TOKEN_COOKIE_NAME")


async def login(req):
    token = await _get_token(req)
    session_token = await exchange_sso_for_local_token(token)
    logger.info("Login requested, Token = %s, Session Token = %s", token, session_token)
    return await _create_cookie_data(session_token, TOKEN_TTL_SECONDS)


async def logout(req: Request):
    token = req.cookies.get(TOKEN_NAME)
    logger.info("logout request: token = %s", token)
    redis = await get_redis()
    redis_key = f"{REDIS_SESSION_PREFIX}{token}"
    await redis.delete(redis_key)
    return await _create_cookie_data("", 0)


async def _get_token(req):
    token = req.token
    if not token:
        raise HTTPException(status_code=400, detail="bad request")
    return token


async def _create_cookie_data(value: str, age: int):
    return {
        "key": TOKEN_NAME,
        "value": value,
        "httponly": True,
        "max_age": age,
        "samesite": "Strict",
    }
