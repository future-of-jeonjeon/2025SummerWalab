from typing import List, Optional, Tuple

from sqlalchemy import select, update, func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.contest_user.models import Contest, ContestUser
from app.user.models import User


async def find_by_contest_and_user(contest_id: int, user_id: int, db: AsyncSession) -> Optional[ContestUser]:
    stmt = select(ContestUser).where(
        ContestUser.contest_id == contest_id,
        ContestUser.user_id == user_id,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def upsert_membership(
    contest_id: int,
    user_id: int,
    status: str,
    approver_id: Optional[int],
    db: AsyncSession,
) -> ContestUser:
    stmt = (
        insert(ContestUser)
        .values(
            contest_id=contest_id,
            user_id=user_id,
            status=status,
            approved_by=approver_id if status == "approved" else None,
            approved_at=func.now() if status == "approved" else None,
        )
        .on_conflict_do_update(
            index_elements=["contest_id", "user_id"],
            set_={
                ContestUser.status: status,
                ContestUser.approved_by: approver_id if status == "approved" else None,
                ContestUser.approved_at: func.now() if status == "approved" else None,
                ContestUser.updated_time: func.now(),
            },
        )
        .returning(ContestUser)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


async def list_memberships(contest_id: int, db: AsyncSession) -> List[Tuple[ContestUser, User]]:
    stmt = (
        select(ContestUser, User)
        .join(User, User.id == ContestUser.user_id)
        .where(ContestUser.contest_id == contest_id)
        .order_by(ContestUser.created_time.asc())
    )
    result = await db.execute(stmt)
    return result.all()


async def update_membership_status(
    contest_id: int,
    user_id: int,
    status: str,
    approver_id: int,
    db: AsyncSession,
) -> Optional[ContestUser]:
    stmt = (
        update(ContestUser)
        .where(
            ContestUser.contest_id == contest_id,
            ContestUser.user_id == user_id,
        )
        .values(
            {
                ContestUser.status: status,
                ContestUser.approved_by: approver_id if status == "approved" else None,
                ContestUser.approved_at: func.now() if status == "approved" else None,
                ContestUser.updated_time: func.now(),
            }
        )
        .returning(ContestUser)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_contest_by_id(contest_id: int, db: AsyncSession) -> Optional[Contest]:
    stmt = select(Contest).where(Contest.id == contest_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
