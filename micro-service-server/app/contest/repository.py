from sqlalchemy import select, desc, func
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime

from app.contest.models import Contest, ACMContestRank, OIContestRank, ContestLanguage
from app.contest_user.models import ContestUser
from app.user.models import User, UserData
from app.problem.models import Problem


async def get_contest_list(db: AsyncSession, limit: int, offset: int, keyword: Optional[str], rule_type: Optional[str], status: Optional[str], created_by_id: Optional[int] = None, visible_only: bool = True):
    # filter conditions
    filters = []
    if visible_only:
        filters.append(Contest.visible == True)
    if keyword:
        filters.append(Contest.title.ilike(f"%{keyword}%"))
    if rule_type:
        filters.append(Contest.rule_type == rule_type)
    if created_by_id:
        filters.append(Contest.created_by_id == created_by_id)
    
    now = datetime.now()
    if status == "1": # Running
        filters.append(Contest.start_time <= now)
        filters.append(Contest.end_time >= now)
    elif status == "-1": # Ended
        filters.append(Contest.end_time < now)
    elif status == "0": # Not Started
        filters.append(Contest.start_time > now)
        
    # Main query
    stmt = select(Contest, ContestLanguage.languages, User, UserData)\
        .join(User, Contest.created_by_id == User.id)\
        .outerjoin(UserData, User.id == UserData.user_id)\
        .outerjoin(ContestLanguage, Contest.id == ContestLanguage.contest_id)\
        .where(*filters)\
        .order_by(desc(Contest.create_time))\
        .offset(offset).limit(limit)
        
    result = await db.execute(stmt)
    contests = result.all()
    
    # Count query
    count_stmt = select(func.count(Contest.id)).where(*filters)
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0
    
    return contests, total


async def find_contest_by_id(contest_id: int, db: AsyncSession) -> Optional[Contest]:
    return await db.get(Contest, contest_id)


async def find_contest_language_by_contest_id(contest_id: int, db: AsyncSession):
    stmt = select(ContestLanguage).where(ContestLanguage.contest_id == contest_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_contest(contest: Contest, db: AsyncSession) -> Contest:
    await db.flush()
    await db.refresh(contest)
    return contest


async def create_contest_language(contest_language: ContestLanguage, db: AsyncSession) -> ContestLanguage:
    db.add(contest_language)
    await db.flush()
    await db.refresh(contest_language)
    return contest_language


async def update_contest_language(contest_language: ContestLanguage, languages: List[str], db: AsyncSession) -> ContestLanguage:
    contest_language.languages = languages
    flag_modified(contest_language, "languages")
    db.add(contest_language)
    await db.flush()
    await db.refresh(contest_language)
    return contest_language

async def exists_display_id_in_contest(contest_id: int, display_id: str, db: AsyncSession) -> bool:
    stmt = select(Problem).where(Problem.contest_id == contest_id, Problem._id == display_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None

async def create_contest(contest: Contest, db: AsyncSession) -> Contest:
    db.add(contest)
    await db.flush()
    await db.refresh(contest)
    return contest

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


async def get_all_contests_with_languages(db: AsyncSession):
    stmt = select(Contest, ContestLanguage.languages, User, UserData).join(User, Contest.created_by_id == User.id).outerjoin(UserData, User.id == UserData.user_id).outerjoin(ContestLanguage, Contest.id == ContestLanguage.contest_id).order_by(desc(Contest.create_time))
    result = await db.execute(stmt)
    return result.all()


async def get_contest_detail_by_id(contest_id: int, db: AsyncSession):
    stmt = select(Contest, ContestLanguage.languages, User, UserData)\
        .join(User, Contest.created_by_id == User.id)\
        .outerjoin(UserData, User.id == UserData.user_id)\
        .outerjoin(ContestLanguage, Contest.id == ContestLanguage.contest_id)\
        .where(Contest.id == contest_id)
    
    result = await db.execute(stmt)
    return result.first()


from sqlalchemy import delete

async def delete_contest(contest_id: int, db: AsyncSession) -> None:
    contest = await db.get(Contest, contest_id)
    if contest:
        await db.delete(contest)
        await db.flush()

async def delete_contest_languages(contest_id: int, db: AsyncSession) -> None:
    await db.execute(delete(ContestLanguage).where(ContestLanguage.contest_id == contest_id))

async def delete_contest_users(contest_id: int, db: AsyncSession) -> None:
    await db.execute(delete(ContestUser).where(ContestUser.contest_id == contest_id))

async def delete_contest_problems(contest_id: int, db: AsyncSession) -> None:
    await db.execute(delete(Problem).where(Problem.contest_id == contest_id))
