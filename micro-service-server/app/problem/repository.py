from typing import List, Optional, Sequence, Tuple
from sqlalchemy import Select, func, select, update, or_, union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import ColumnElement
from app.problem.models import Problem, ProblemTag, problem_tags_association_table


def _public_problem_filter() -> ColumnElement:
    return (
            Problem.is_public.is_(True)
            & Problem.visible.is_(True)
            & Problem.contest_id.is_(None)
    )


async def fetch_all_problems(session: AsyncSession) -> List[Problem]:
    stmt = (
        select(Problem)
        .options(selectinload(Problem.tags))
        .order_by(Problem._id)
    )
    result = await session.execute(stmt)
    return result.scalars().all()


async def fetch_tag_counts(session: AsyncSession) -> Sequence[Tuple[str, int]]:
    visibility_filter = _public_problem_filter()
    stmt = (
        select(ProblemTag.name, func.count(problem_tags_association_table.c.problem_id))
        .join(problem_tags_association_table, ProblemTag.id == problem_tags_association_table.c.problemtag_id)
        .join(Problem, Problem.id == problem_tags_association_table.c.problem_id)
        .where(visibility_filter)
        .group_by(ProblemTag.name)
        .order_by(func.count(problem_tags_association_table.c.problem_id).desc())
    )
    result = await session.execute(stmt)
    return result.all()


from app.common.page import Page, paginate


async def fetch_filtered_problems(
        session: AsyncSession,
        *,
        tags: Optional[List[str]],
        keyword: Optional[str] = None,
        difficulty: Optional[int] = None,
        ordering: ColumnElement,
        page: int,
        page_size: int,
) -> Page[Problem]:
    from sqlalchemy import or_
    visibility_filter = _public_problem_filter()
    base_stmt: Select = (
        select(Problem)
        .options(selectinload(Problem.tags))
        .where(visibility_filter)
    )

    if tags:
        tagged_problem_ids_stmt = (
            select(problem_tags_association_table.c.problem_id)
            .join(ProblemTag, ProblemTag.id == problem_tags_association_table.c.problemtag_id)
            .join(Problem, Problem.id == problem_tags_association_table.c.problem_id)
            .where(
                ProblemTag.name.in_(tags),
            )
            .where(visibility_filter)
            .distinct()
        )
        base_stmt = base_stmt.where(Problem.id.in_(tagged_problem_ids_stmt))

    if keyword:
        search_term = f"%{keyword}%"
        base_stmt = base_stmt.where(or_(Problem.title.ilike(search_term), Problem._id.ilike(search_term)))

    if difficulty:
        base_stmt = base_stmt.where(or_(
            Problem.difficulty.ilike(f"%Lv.%{difficulty}%"),
            Problem.difficulty.ilike(f"%Lv.{difficulty}%"),
            Problem.difficulty == str(difficulty)
        ))

    stmt = base_stmt.order_by(ordering)
    return await paginate(session, stmt, page, page_size)


async def count_contest_problems(session: AsyncSession, contest_id: int) -> int:
    stmt = (
        select(func.count())
        .select_from(Problem)
        .where(Problem.contest_id == contest_id)
        .where(Problem.visible.is_(True))
    )
    result = await session.execute(stmt)
    return result.scalar() or 0


async def get_or_create_tag(session: AsyncSession, tag_name: str) -> ProblemTag:
    stmt = select(ProblemTag).where(ProblemTag.name == tag_name)
    result = await session.execute(stmt)
    tag = result.scalar_one_or_none()

    if not tag:
        tag = ProblemTag(name=tag_name)
        session.add(tag)
        await session.flush()  # To get the ID

    return tag


async def create_problems(session: AsyncSession, problems: List[Problem]) -> List[Problem]:
    session.add_all(problems)
    await session.commit()
    await session.commit()

    # Re-fetch problems with tags loaded to avoid MissingGreenlet error
    ids = [p.id for p in problems]
    stmt = select(Problem).options(selectinload(Problem.tags)).where(Problem.id.in_(ids))
    result = await session.execute(stmt)
    return result.scalars().all()


async def count_problem(session: AsyncSession) -> int:
    visibility_filter = _public_problem_filter()
    stmt = select(func.count()).select_from(Problem).where(visibility_filter)
    result = await session.execute(stmt)
    return result.scalar() or 0


async def find_problem_by_id(problem_id: int, session: AsyncSession) -> Optional[Problem]:
    return await session.get(Problem, problem_id)


async def create_problem(session: AsyncSession, problem: Problem) -> Problem:
    session.add(problem)
    await session.flush()
    await session.refresh(problem)
    return problem


async def find_problems_by_contest_id(session: AsyncSession, contest_id: int) -> List[Problem]:
    stmt = select(Problem).where(Problem.contest_id == contest_id)
    result = await session.execute(stmt)
    return result.scalars().all()


async def delete_problems(session: AsyncSession, problems: List[Problem]):
    for problem in problems:
        await session.delete(problem)
    await session.flush()


async def find_problem_with_tags_by_id(problem_id: int, session: AsyncSession) -> Optional[Problem]:
    stmt = select(Problem).options(selectinload(Problem.tags)).where(Problem.id == problem_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def update_problem_languages_by_contest_id(session: AsyncSession, contest_id: int, languages: List[str]):
    stmt = (
        update(Problem)
        .where(Problem.contest_id == contest_id)
        .values(languages=languages)
    )
    await session.execute(stmt)


async def find_problems_by_creator_id(
        creator_id: int,
        page: int,
        size: int,
        session: AsyncSession) -> Page[Problem]:
    stmt = (select(Problem)
            .options(selectinload(Problem.tags))
            .where(Problem.created_by_id == creator_id)
            .order_by(Problem.id.desc()))
    return await paginate(session, stmt, page, size)


async def find_available_problems_by_creator_id_and_keyword(
        page: int,
        page_size: int,
        user_id: int,
        keyword: str | None,
        db: AsyncSession,
):
    visibility = (
            Problem.is_public.is_(True)
            & Problem.visible.is_(True)
            & Problem.contest_id.is_(None)
    )
    author = (Problem.created_by_id == user_id)

    public_ids = (_apply_keyword(keyword, select(Problem.id).where(visibility)))
    mine_ids = _apply_keyword(keyword, select(Problem.id).where(author))

    ids_union = union(public_ids, mine_ids).subquery()
    stmt = (
        select(Problem)
        .join(ids_union, ids_union.c.id == Problem.id)
        .options(selectinload(Problem.tags))
        .order_by(Problem.id.desc())
    )

    return await paginate(db, stmt, page, page_size)


def _apply_keyword(keyword, stmt):
    if not keyword:
        return stmt
    term = f"%{keyword}%"
    return stmt.where(or_(
        Problem.title.ilike(term),
        Problem._id.ilike(term),
    ))
