import os
from typing import AsyncGenerator

from app.core.logger import logger
from fastapi import Request, Depends
from app.security import exceptions
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import SessionLocal
from app.user.schemas import UserData
from app.user.repository import check_user_exists_by_username
from app.security.security import get_user_session_data, sliding_session

from app.core.settings import settings

TOKEN_NAME = settings.TOKEN_COOKIE_NAME


async def get_database() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_database_readonly() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def get_userdata(request: Request, db: AsyncSession = Depends(get_database)) -> UserData:
    token = request.cookies.get(TOKEN_NAME)
    if not token:
        exceptions.unauthorized_access()
    userdata = await get_user_session_data(token)
    if not userdata:
        exceptions.invalid_token()
    if not await check_user_exists_by_username(userdata.username, db):
        exceptions.invalid_token()
    logger.info("auth processed: user_id=%s, name=%s, admin_type=%s", userdata.user_id, userdata.username,
                userdata.admin_type)
    await sliding_session(token)
    return userdata
