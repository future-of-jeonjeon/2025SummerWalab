from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, exists, text, update, or_
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


async def find_userdata_by_student_id(student_id: str, db: AsyncSession):
    stmt = select(UserData).where(UserData.student_id == student_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def save_user_data(user_data: UserData, db) -> UserData:
    db.add(user_data)
    await db.flush()
    await db.refresh(user_data)
    return user_data


async def delete_all_sessions(db: AsyncSession):
    await db.execute(text("DELETE FROM public.django_session"))
    await db.execute(update(User).values(session_keys=[]))


async def get_all_users(db):
    stmt = select(User)
    result = await db.execute(stmt)
    return result.scalars().all()


async def search_users_by_name_or_student_id(keyword: str, db: AsyncSession, limit: int = 10):
    normalized = keyword.strip()
    if not normalized:
        return []

    stmt = (
        select(User.id, User.username, UserData.student_id, UserData.name)
        .join(UserData, UserData.user_id == User.id)
        .where(
            or_(
                UserData.student_id.ilike(f"%{normalized}%"),
                UserData.name.ilike(f"%{normalized}%"),
            )
        )
        .order_by(UserData.name.asc(), User.id.asc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.all()
