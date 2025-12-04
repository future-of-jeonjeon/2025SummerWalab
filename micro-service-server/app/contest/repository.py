from sqlalchemy import *
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.contest.models import Contest, ACMContestRank, OIContestRank
from app.contest_user.models import ContestUser
from app.user.models import User, UserData


async def get_participated_contest_by_user_id(user_id: int, db: AsyncSession) -> List[Contest]:
    result = await db.execute(select(Contest)
    .join(ContestUser, ContestUser.contest_id == Contest.id).where(
        ContestUser.user_id == user_id))
    return result.scalars().all()


async def get_acm_contest_rank(contest_id: int, db: AsyncSession):
    query = select(ACMContestRank, User, UserData).join(User, ACMContestRank.user_id == User.id).outerjoin(UserData, User.id == UserData.user_id).where(ACMContestRank.contest_id == contest_id).order_by(desc(ACMContestRank.accepted_number), ACMContestRank.total_time)
    result = await db.execute(query)
    return result.all()


async def get_oi_contest_rank(contest_id: int, db: AsyncSession):
    query = select(OIContestRank, User, UserData).join(User, OIContestRank.user_id == User.id).outerjoin(UserData, User.id == UserData.user_id).where(OIContestRank.contest_id == contest_id).order_by(desc(OIContestRank.total_score))
    result = await db.execute(query)
    return result.all()
