from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import exceptions
from app.security.security import (
    exchange_sso_for_local_token,
    get_redis,
    get_user_session_data,
    get_user_session_key,
)

from app.core.logger import logger
from app.core.settings import settings

import app.user.exceptions as user_exception
import app.user.repository as user_repository
import app.auth.repository as auth_repository

TOKEN_NAME = settings.TOKEN_COOKIE_NAME


async def login(req, db: AsyncSession):
    token_ttl_seconds = settings.LOCAL_TOKEN_TTL_SECONDS
    token = await _get_token(req)
    session_token = await exchange_sso_for_local_token(token)
    logger.info("Login requested, Token = %s, Session Token = %s", token, session_token)
    try:
        user_profile = await get_user_session_data(session_token)
        if user_profile:
            import app.todo.service as todo_service

            await todo_service.sync_user_attendance(db, user_profile.user_id)
    except Exception as exc:
        logger.exception("Attendance sync failed during login: %s", exc)
    return await _create_cookie_data(session_token, token_ttl_seconds)


async def logout(req: Request, db: AsyncSession):
    redis_session_prefix = settings.REDIS_SESSION_PREFIX
    token = req.cookies.get(TOKEN_NAME)
    logger.info("logout request: token = %s", token)

    user_id = None
    if token:
        try:
            user_profile = await get_user_session_data(token)
            user_id = user_profile.user_id
        except Exception:
            user_id = None

    if user_id is not None:
        await _clear_user_sessions(user_id, db)

    if token:
        redis = await get_redis()
        redis_key = f"{redis_session_prefix}{token}"
        await redis.delete(redis_key)

    return await _create_cookie_data("", 0)


async def user_session_reset(user_id: int, db: AsyncSession):
    await _clear_user_sessions(user_id, db, raise_if_missing=True)


async def all_user_session_reset_api(db: AsyncSession):
    await user_repository.delete_all_sessions(db)
    redis = await get_redis()
    keys = await redis.keys(f"{settings.REDIS_SESSION_PREFIX}*")
    if keys:
        await redis.delete(*keys)


async def _clear_user_sessions(user_id: int, db: AsyncSession, raise_if_missing: bool = False):
    user = await user_repository.find_user_by_id(user_id, db)
    if not user:
        if raise_if_missing:
            user_exception.user_not_found()
        return

    raw_session_keys = user.session_keys if user.session_keys is not None else []
    session_keys = raw_session_keys if isinstance(raw_session_keys, list) else []
    for session_key in session_keys:
        if not session_key:
            continue
        await auth_repository.delete_session_by_key(db, session_key)
    user.session_keys = []

    redis = await get_redis()
    user_session_key = get_user_session_key(user_id)
    local_token = await redis.get(user_session_key)
    if isinstance(local_token, bytes):
        local_token = local_token.decode("utf-8")
    if local_token:
        await redis.delete(f"{settings.REDIS_SESSION_PREFIX}{local_token}")
    await redis.delete(user_session_key)

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
