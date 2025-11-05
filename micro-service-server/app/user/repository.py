from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, exists
from app.user.models import User

async def check_user_exists_by_username(username: str, db: AsyncSession) -> bool:
    stmt = select(exists().where(User.username == username))
    result = await db.execute(stmt)
    return result.scalar()

async def get_user_id_by_username(username: str, db: AsyncSession) -> int:
    stmt = select(User.id).where(User.username == username)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def find_by_id(user_id: int, db: AsyncSession) -> User | None:
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()