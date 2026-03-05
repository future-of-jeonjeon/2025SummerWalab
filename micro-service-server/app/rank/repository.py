from typing import Dict, List, Iterable

from sqlalchemy import text, select, desc, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.problem.models import Problem
from app.submission.models import Submission
from app.contest.models import ACMContestRank, OIContestRank
from app.user.models import User, UserData
from app.organization.models import Organization, OrganizationMember
from app.common.page import Page, paginate


async def get_organizations_order_by_rank_acm(
    db: AsyncSession,
    page: int,
    size: int,
) -> Page:
    order = "total_accepted DESC, total_submission ASC, organization_id ASC"
    limit = size
    offset = (page - 1) * size

    sql = text(
        f"""
        SELECT
            o.id AS organization_id,
            o.name AS organization_name,
            o.description AS organization_description,
            COUNT(DISTINCT u.id) AS total_members,
            COALESCE(SUM(up.accepted_number), 0) AS total_accepted,
            COALESCE(SUM(up.submission_number), 0) AS total_submission,
            COALESCE(SUM(up.accepted_number), 0)::double precision
              / NULLIF(COALESCE(SUM(up.submission_number), 0), 0)::double precision AS accuracy,
            COUNT(*) OVER () AS total_count
        FROM public.micro_organization AS o
        LEFT JOIN public.micro_organization_member AS om ON om.organization_id = o.id
        LEFT JOIN public."user" AS u ON u.id = om.user_id
          AND u.admin_type = 'Regular User'
          AND (u.is_disabled IS FALSE OR u.is_disabled IS NULL)
        LEFT JOIN public.user_profile AS up ON up.user_id = u.id AND up.submission_number > 0
        GROUP BY o.id, o.name, o.description
        ORDER BY {order}
        LIMIT :limit OFFSET :offset
        """
    )

    rows = (await db.execute(sql, {"limit": limit, "offset": offset})).fetchall()
    total = int(rows[0][-1]) if rows else 0

    items = [
        {
            "rank": i,
            "organization_id": r[0],
            "name": r[1],
            "description": r[2],
            "total_members": int(r[3] or 0),
            "total_solved": int(r[4] or 0),
            "total_submission": int(r[5] or 0),
            "accuracy": float(r[6] or 0.0),
        }
        for i, r in enumerate(rows, start=offset + 1)
    ]

    return Page(items=items, total=total, page=page, size=size)


# Backward-compatible alias (keep existing import sites working)
get_organizations_order_by_rank_ACM = get_organizations_order_by_rank_acm


async def fetch_contest_problems(db: AsyncSession, contest_id: int) -> List[Problem]:
    stmt = (
        select(Problem)
        .where(Problem.contest_id == contest_id)
        .where(Problem.visible.is_(True))
    )
    rows = await db.execute(stmt)
    problems = list(rows.scalars().all())

    def sort_key(p: Problem):
        # Ensure consistent type to avoid TypeError when mixing int/str
        s = "" if p._id is None else str(p._id)
        try:
            n = int(s)
            return (0, n)
        except Exception:
            return (1, s)

    problems.sort(key=sort_key)
    return problems


async def fetch_contest_submissions(db: AsyncSession, contest_id: int) -> List[Submission]:
    stmt = select(Submission).where(Submission.contest_id == contest_id)
    rows = await db.execute(stmt)
    return list(rows.scalars().all())


async def get_acm_contest_rank(contest_id: int, db: AsyncSession):
    query = select(ACMContestRank, User, UserData).join(User, ACMContestRank.user_id == User.id).outerjoin(UserData, User.id == UserData.user_id).where(ACMContestRank.contest_id == contest_id).order_by(desc(ACMContestRank.accepted_number), ACMContestRank.total_time)
    result = await db.execute(query)
    return result.all()


async def get_oi_contest_rank(contest_id: int, db: AsyncSession):
    query = select(OIContestRank, User, UserData).join(User, OIContestRank.user_id == User.id).outerjoin(UserData, User.id == UserData.user_id).where(OIContestRank.contest_id == contest_id).order_by(desc(OIContestRank.total_score))
    result = await db.execute(query)
    return result.all()
