from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, exists
from app.user.models import User, UserData


async def check_user_exists_by_username(username: str, db: AsyncSession) -> bool:
    stmt = select(exists().where(User.username == username))
    result = await db.execute(stmt)
    return result.scalar()


async def get_user_id_by_username(username: str, db: AsyncSession) -> int:
    stmt = select(User.id).where(User.username == username)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def find_user_by_id(user_id: int, db: AsyncSession) -> User | None:
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def find_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    result = await db.execute(
        select(User).where(User.username == username)
    )
    return result.scalar_one_or_none()


async def find_sub_userdata_by_user_id(user_id: int, db: AsyncSession):
    stmt = select(UserData).where(UserData.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def save_user_data(user_data: UserData, db) -> UserData:
    db.add(user_data)
    await db.flush()
    await db.refresh(user_data)
    return user_data
