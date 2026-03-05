import asyncio
import json
import uuid

import httpx


from app.core.redis import get_redis
from app.user.schemas import UserProfile
from app.user import repository as user_repo
from app.core.database import SessionLocal

from app.security import exceptions
from pydantic import ValidationError
from app.core.settings import settings

SSO_INTROSPECT_URL = settings.SSO_INTROSPECT_URL
# REDIS_URL = settings.REDIS_URL
REDIS_SESSION_PREFIX = settings.REDIS_SESSION_PREFIX
# LOCAL_TOKEN_COOKIE_NAME = settings.TOKEN_COOKIE_NAME # Assuming this matches
LOCAL_TOKEN_TTL_SECONDS = settings.LOCAL_TOKEN_TTL_SECONDS


async def exchange_sso_for_local_token(sso_token: str) -> str:
    if not SSO_INTROSPECT_URL:
        exceptions.sso_config_error()
    timeout = httpx.Timeout(15.0, connect=8.0)
    resp = await _sso_request(sso_token, timeout)
    if resp.status_code != 200:
        exceptions.sso_unreachable()
    user_profile = await _check_and_parse_userdata(resp)
    local_token = await _create_token()
    redis = await get_redis()
    redis_key = f"{REDIS_SESSION_PREFIX}{local_token}"
    print("redis_key = ", redis_key)
    await redis.setex(redis_key, LOCAL_TOKEN_TTL_SECONDS, user_profile.model_dump_json())
    return local_token


async def verify_local_token(token: str) -> dict:
    if not token:
        exceptions.missing_token_unauthorized()
    redis = await get_redis()
    redis_key = f"{REDIS_SESSION_PREFIX}{token}"
    user_data_str = await redis.get(redis_key)
    if not user_data_str:
        exceptions.invalid_token()
    try:
        user_profile = json.loads(user_data_str)
    except json.JSONDecodeError:
        exceptions.corrupted_session_data()
    return user_profile


async def get_user_session_data(token: str) -> UserProfile:
    if not token:
        exceptions.missing_token_bad_request()
    redis = await get_redis()
    redis_key = f"{REDIS_SESSION_PREFIX}{token}"
    user_data_str = await redis.get(redis_key)
    if not user_data_str:
        exceptions.invalid_token()
    try:
        return UserProfile.model_validate_json(user_data_str)
    except ValidationError:
        exceptions.corrupted_session_data()

async def sliding_session(token: str):
    if not token:
        exceptions.missing_token_bad_request()
    redis = await get_redis()
    redis_key = f"{REDIS_SESSION_PREFIX}{token}"
    await redis.expire(redis_key, LOCAL_TOKEN_TTL_SECONDS)

async def _create_token() -> str:
    return str(uuid.uuid4())


async def _sso_request(sso_token: str, timeout: httpx.Timeout) -> httpx.Response:
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(SSO_INTROSPECT_URL, json={"token": sso_token})
            break
        except httpx.RequestError as exc:
            if attempt == 2:
                exceptions.sso_unavailable(cause=exc)
            await asyncio.sleep(1.5 * (attempt + 1))
    return resp


async def _check_and_parse_userdata(resp: httpx.Response):
    user_profile = resp.json().get("data")
    if not user_profile:
        exceptions.invalid_sso_token()
    username = user_profile.get("username")
    async with SessionLocal() as db:
        if not await user_repo.check_user_exists_by_username(username, db):
            exceptions.invalid_sso_token()
        user_id = await user_repo.get_user_id_by_username(username, db)

    return UserProfile(
        user_id=user_id,
        username=username,
        avatar=user_profile.get("avatar"),
        admin_type=user_profile.get("admin_type"),
    )
