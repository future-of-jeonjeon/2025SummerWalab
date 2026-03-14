from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.pending.models import Pending, PendingTargetType
from app.common.page import paginate


async def find_by_id(pending_id: int, db: AsyncSession):
    stmt = select(Pending).where(Pending.id == pending_id)
    result = await db.execute(stmt)
    return result.scalar()


async def find_all_by_type(target_type: PendingTargetType, db: AsyncSession, page: int = 1, size: int = 20):
    stmt = select(Pending).where(Pending.target_type == target_type)
    return await paginate(db, stmt, page, size)

async def find_all_by_user_and_type(created_user_id: int, target_type: PendingTargetType, db: AsyncSession, page: int = 1, size: int = 20):
    stmt = select(Pending).where(
        Pending.target_type == target_type,
        Pending.created_user_id == created_user_id
    )
    return await paginate(db, stmt, page, size)


async def save(entity:Pending, db:AsyncSession):
    db.add(entity)
    await db.flush()
    await db.refresh(entity)
    return entity
