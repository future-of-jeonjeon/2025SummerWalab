from sqlalchemy import select, desc, update
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Tuple
from sqlalchemy import and_
from app.contest.models import *

from app.user.models import User, UserData
from app.problem.models import Problem

from sqlalchemy import delete
from app.common.page import Page, paginate


async def get_contest_list(db: AsyncSession, page: int, size: int, keyword: Optional[str], rule_type: Optional[str],
                           status: Optional[str], created_by_id: Optional[int] = None,
                           visible_only: bool = True) -> Page:
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
    if status == "1":
        filters.append(Contest.start_time <= now)
        filters.append(Contest.end_time >= now)
    elif status == "-1":
        filters.append(Contest.end_time < now)
    elif status == "0":
        filters.append(Contest.start_time > now)
    stmt = (
        select(Contest, ContestLanguage.languages, User, UserData)
        .join(User, Contest.created_by_id == User.id)
        .outerjoin(UserData, User.id == UserData.user_id)
        .outerjoin(ContestLanguage, Contest.id == ContestLanguage.contest_id)
        .where(*filters)
        .order_by(desc(Contest.create_time))
    )
    return await paginate(db, stmt, page, size)


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


async def update_contest_language(contest_language: ContestLanguage, languages: List[str],
                                  db: AsyncSession) -> ContestLanguage:
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


async def get_all_contests_with_languages(db: AsyncSession):
    stmt = select(Contest, ContestLanguage.languages, User, UserData).join(User,
                                                                           Contest.created_by_id == User.id).outerjoin(
        UserData, User.id == UserData.user_id).outerjoin(ContestLanguage,
                                                         Contest.id == ContestLanguage.contest_id).order_by(
        desc(Contest.create_time))
    result = await db.execute(stmt)
    return result.all()


async def count_contest_participants_by_contest_id(contest_id, db: AsyncSession):
    stmt = select(func.count()).select_from(ContestUser).where(ContestUser.contest_id == contest_id)
    result = await db.execute(stmt)
    return result.scalar() or 0


async def get_contest_detail_by_id(contest_id: int, db: AsyncSession):
    stmt = select(Contest, ContestLanguage.languages, User, UserData) \
        .join(User, Contest.created_by_id == User.id) \
        .outerjoin(UserData, User.id == UserData.user_id) \
        .outerjoin(ContestLanguage, Contest.id == ContestLanguage.contest_id) \
        .where(Contest.id == contest_id)

    result = await db.execute(stmt)
    return result.first()


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


async def create_organization_contest(organization_contest: OrganizationContest,
                                      db: AsyncSession) -> OrganizationContest:
    db.add(organization_contest)
    await db.flush()
    await db.refresh(organization_contest)
    return organization_contest


async def get_contest_list_page_by_organization_id(organization_id, page, size, db):
    stmt = (select(Contest).join(OrganizationContest, Contest.id == OrganizationContest.contest_id)
            .where(OrganizationContest.organization_id == organization_id)
            .order_by(desc(OrganizationContest.created_time)))
    return await paginate(db, stmt, page, size)


async def find_organization_contest_by_contest_id(contest_id, db):
    stmt = select(OrganizationContest).where(OrganizationContest.contest_id == contest_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
    #
    #
    # stmt = delete(OrganizationContest).where(OrganizationContest.contest_id == contest_id)
    # await db.execute(stmt)


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
        .where(ContestUser.contest_id == contest_id, ContestUser.user_id > 0)
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


async def upsert_policy(contest_id: int, requires_approval: bool, db: AsyncSession) -> ContestUser:
    stmt = (
        insert(ContestUser)
        .values(
            contest_id=contest_id,
            user_id=0,
            status="policy_requires" if requires_approval else "policy_auto",
            approved_by=None,
            approved_at=None,
        )
        .on_conflict_do_update(
            index_elements=["contest_id", "user_id"],
            set_={
                ContestUser.status: "policy_requires" if requires_approval else "policy_auto",
                ContestUser.updated_time: func.now(),
            },
        )
        .returning(ContestUser)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


async def get_policy(contest_id: int, db: AsyncSession) -> bool:
    stmt = select(ContestUser.status).where(ContestUser.contest_id == contest_id, ContestUser.user_id == 0)
    result = await db.execute(stmt)
    status = result.scalar_one_or_none()
    if status is None:
        return True
    return status == "policy_requires"


async def get_contest_by_id(contest_id: int, db: AsyncSession) -> Optional[Contest]:
    stmt = select(Contest).where(Contest.id == contest_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def save_announcement(entity, db):
    db.add(entity)
    await db.flush()
    await db.refresh(entity)
    return entity


async def find_announcement_by_announcement_id(announcement_id, db):
    stmt = select(ContestAnnouncement).where(ContestAnnouncement.id == announcement_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def delete_contest_announcement_by_announcement_id(announcement_id, db):
    stmt = delete(ContestAnnouncement).where(ContestAnnouncement.id == announcement_id)
    await db.execute(stmt)
    return


async def find_contest_user_by_contest_id_and_user_id(contest_id, user_id, db):
    stmt = select(ContestUser).where(
        and_(ContestUser.contest_id == contest_id,
             ContestUser.user_id == user_id
             )
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()