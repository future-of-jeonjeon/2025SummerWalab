from typing import List, Optional, Sequence, Tuple

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import ColumnElement

from app.problem.models import Problem, ProblemTag, problem_tags_association_table


async def fetch_all_problems(session: AsyncSession) -> List[Problem]:
    stmt = (
        select(Problem)
        .options(selectinload(Problem.tags))
        .order_by(Problem._id)
    )
    result = await session.execute(stmt)
    return result.scalars().all()


async def fetch_tag_counts(session: AsyncSession) -> Sequence[Tuple[str, int]]:
    stmt = (
        select(ProblemTag.name, func.count(problem_tags_association_table.c.problem_id))
        .join(problem_tags_association_table, ProblemTag.id == problem_tags_association_table.c.problemtag_id)
        .join(Problem, Problem.id == problem_tags_association_table.c.problem_id)
        .group_by(ProblemTag.name)
        .order_by(func.count(problem_tags_association_table.c.problem_id).desc())
    )
    result = await session.execute(stmt)
    return result.all()


async def fetch_filtered_problems(
    session: AsyncSession,
    *,
    tags: Optional[List[str]],
    ordering: ColumnElement,
    page: int,
    page_size: int,
) -> Tuple[List[Problem], int]:
    base_stmt: Select = select(Problem).options(selectinload(Problem.tags))
    tagged_problem_ids_stmt: Optional[Select] = None

    if tags:
        tagged_problem_ids_stmt = (
            select(problem_tags_association_table.c.problem_id)
            .join(ProblemTag, ProblemTag.id == problem_tags_association_table.c.problemtag_id)
            .where(ProblemTag.name.in_(tags))
            .group_by(problem_tags_association_table.c.problem_id)
            .having(func.count(func.distinct(ProblemTag.name)) == len(tags))
        )
        base_stmt = base_stmt.where(Problem.id.in_(tagged_problem_ids_stmt))

    offset = max(page - 1, 0) * page_size
    paginated_stmt = base_stmt.order_by(ordering).offset(offset).limit(page_size)

    result = await session.execute(paginated_stmt)
    problems = result.scalars().all()

    if tagged_problem_ids_stmt is not None:
        count_stmt = select(func.count()).select_from(tagged_problem_ids_stmt.subquery())
    else:
        count_stmt = select(func.count()).select_from(Problem)

    total_result = await session.execute(count_stmt)
    total_count = total_result.scalar() or 0

    return problems, total_count


async def count_contest_problems(session: AsyncSession, contest_id: int) -> int:
    stmt = (
        select(func.count())
        .select_from(Problem)
        .where(Problem.contest_id == contest_id)
        .where(Problem.visible.is_(True))
    )
    result = await session.execute(stmt)
    return result.scalar() or 0
