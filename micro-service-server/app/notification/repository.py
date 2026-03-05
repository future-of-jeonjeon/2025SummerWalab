from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.notification.models import Notification


async def find_notifications_by_user_id(user_id: int, db: AsyncSession) -> list[Notification]:
    stmt = (
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_time.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


async def find_unchecked_notification_by_user_id(user_id, db) -> list[Notification]:
    stmt = (
        select(Notification)
        .where(Notification.user_id == user_id)
        .where(Notification.is_checked == False)
        .order_by(Notification.created_time.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


async def save_notification(entity: Notification, db: AsyncSession) -> Notification:
    db.add(entity)
    await db.flush()
    await db.refresh(entity)
    return entity
