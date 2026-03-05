import os
from typing import AsyncGenerator

from app.core.logger import logger
from fastapi import Request, Depends
from app.security import exceptions
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import SessionLocal
from app.user.schemas import UserProfile
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

async def get_background_database() -> AsyncGenerator[AsyncSession, None]:
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


async def get_userdata(request: Request, db: AsyncSession = Depends(get_database)) -> UserProfile:
    token = request.cookies.get(TOKEN_NAME)
    if not token:
        exceptions.unauthorized_access()
    user_profile = await get_user_session_data(token)
    if not user_profile:
        exceptions.invalid_token()
    if not await check_user_exists_by_username(user_profile.username, db):
        exceptions.invalid_token()
    logger.info("auth processed: user_id=%s, name=%s, admin_type=%s", user_profile.user_id, user_profile.username,
                user_profile.admin_type)
    await sliding_session(token)
    return user_profile
