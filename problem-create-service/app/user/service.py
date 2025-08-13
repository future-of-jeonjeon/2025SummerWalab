from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, exists
from app.user.models import User


async def check_user_exists_by_username(username: str, db: AsyncSession) -> bool:
    # Using exists() is generally more efficient for just checking existence.
    stmt = select(exists().where(User.username == username))
    result = await db.execute(stmt)
    return result.scalar()
