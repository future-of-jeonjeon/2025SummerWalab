import asyncio
import json
import os
import uuid

import httpx
from dotenv import load_dotenv

from app.config.redis import get_redis
from app.user.schemas import UserData
from app.user import repository as user_repo
from app.config.database import SessionLocal

from fastapi import HTTPException
from pydantic import ValidationError

### 환경변수 setup
load_dotenv()
SSO_INTROSPECT_URL = os.getenv("SSO_INTROSPECT_URL")
REDIS_URL = os.getenv("REDIS_URL")
REDIS_SESSION_PREFIX = os.getenv("REDIS_SESSION_PREFIX")
LOCAL_TOKEN_COOKIE_NAME = os.getenv("LOCAL_TOKEN_COOKIE_NAME")
LOCAL_TOKEN_TTL_SECONDS = int(os.getenv("LOCAL_TOKEN_TTL_SECONDS"))


async def exchange_sso_for_local_token(sso_token: str) -> str:
    if not SSO_INTROSPECT_URL:
        raise HTTPException(status_code=500, detail="SSO_INTROSPECT_URL is not configured")
    timeout = httpx.Timeout(15.0, connect=8.0)
    resp = await _sso_request(sso_token, timeout)
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="SSO unreachable")
    userdata = await _check_and_parse_userdata(resp)
    local_token = await _create_token()
    redis = await get_redis()
    redis_key = f"{REDIS_SESSION_PREFIX}{local_token}"
    print("redis_key = ", redis_key)
    await redis.setex(redis_key, LOCAL_TOKEN_TTL_SECONDS, userdata.model_dump_json())
    return local_token


async def verify_local_token(token: str) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    redis = await get_redis()
    redis_key = f"{REDIS_SESSION_PREFIX}{token}"
    user_data_str = await redis.get(redis_key)
    if not user_data_str:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    try:
        user_data = json.loads(user_data_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Corrupted session data")
    return user_data


async def get_user_session_data(token: str) -> UserData:
    if not token:
        raise HTTPException(status_code=400, detail="Missing token")
    redis = await get_redis()
    redis_key = f"{REDIS_SESSION_PREFIX}{token}"
    user_data_str = await redis.get(redis_key)
    if not user_data_str:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    try:
        return UserData.model_validate_json(user_data_str)
    except ValidationError:
        raise HTTPException(status_code=500, detail="Corrupted session data")

async def sliding_session(token: str):
    if not token:
        raise HTTPException(status_code=400, detail="Missing token")
    redis = await get_redis()
    redis_key = f"{REDIS_SESSION_PREFIX}{token}"
    redis.expire(redis_key, LOCAL_TOKEN_TTL_SECONDS)

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
                raise HTTPException(status_code=503, detail="SSO service temporarily unavailable") from exc
            await asyncio.sleep(1.5 * (attempt + 1))
    return resp


async def _check_and_parse_userdata(resp: httpx.Response):
    user_data = resp.json().get("data")
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid SSO token")
    username = user_data.get("username")
    async with SessionLocal() as db:
        if not await user_repo.check_user_exists_by_username(username, db):
            raise HTTPException(status_code=401, detail="Invalid SSO token")
        user_id = await user_repo.get_user_id_by_username(username, db)

    return UserData(
        user_id=user_id,
        username=username,
        avatar=user_data.get("avatar"),
        admin_type=user_data.get("admin_type"),
    )
