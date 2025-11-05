from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.user.models import User

async def find_by_id(db:AsyncSession, id: int) ->Optional[User]:
    return await db.get(User, id)

async def find_by_username(db: AsyncSession, username: str) -> Optional[User]:
    result = await db.execute(
        select(User).where(User.username == username)
    )
    return result.scalar_one_or_none()
