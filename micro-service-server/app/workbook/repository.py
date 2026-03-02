from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.problem.models import Problem
from app.workbook.models import Workbook, WorkbookProblem
from app.common.page import Page, paginate

WORKBOOK_WITH_RELATIONS = (
    selectinload(Workbook.problems)
    .joinedload(WorkbookProblem.problem)
    .selectinload(Problem.tags),
    selectinload(Workbook.problems).selectinload(WorkbookProblem.tags),
)


async def save(workbook: Workbook, db: AsyncSession) -> Optional[Workbook]:
    db.add(workbook)
    await db.flush()
    await db.refresh(workbook)
    return workbook


async def find_by_id(workbook_id: int, db: AsyncSession) -> Optional[Workbook]:
    stmt = select(Workbook).options(*WORKBOOK_WITH_RELATIONS).where(Workbook.id == workbook_id)
    result = await db.execute(stmt)
    return result.scalars().unique().one_or_none()


async def find_public_paginated(
        db: AsyncSession, 
        page: int, 
        size: int,
        search: Optional[str] = None,
        sort_by: Optional[str] = "created_time",
        sort_order: Optional[str] = "desc",
        category: Optional[str] = None,
        tags: Optional[str] = None
) -> Page[Workbook]:
    from sqlalchemy import or_
    from app.workbook.models import WorkbookProblem
    from app.problem.models import problem_tags_association_table, ProblemTag

    stmt = select(Workbook).options(*WORKBOOK_WITH_RELATIONS).where(Workbook.is_public == True)
    
    if search:
        search_term = f"%{search}%"
        stmt = stmt.where(or_(Workbook.title.ilike(search_term), Workbook.description.ilike(search_term)))
        
    if category:
        stmt = stmt.where(Workbook.category == category)
        
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        if tag_list:
            subq = select(1).select_from(WorkbookProblem).join(
                problem_tags_association_table, WorkbookProblem.problem_id == problem_tags_association_table.c.problem_id
            ).join(
                ProblemTag, ProblemTag.id == problem_tags_association_table.c.problemtag_id
            ).where(
                WorkbookProblem.workbook_id == Workbook.id,
                ProblemTag.name.in_(tag_list)
            )
            stmt = stmt.where(subq.exists())

    if sort_by == 'title':
        order_col = Workbook.title
    else:
        order_col = Workbook.created_time

    if sort_order == 'asc':
        stmt = stmt.order_by(order_col.asc())
    else:
        stmt = stmt.order_by(order_col.desc())

    return await paginate(db, stmt, page, size)


async def delete_by_id(workbook_id: int, db: AsyncSession) -> Optional[Workbook]:
    wb = await db.get(Workbook, workbook_id)
    await db.delete(wb)


async def delete(workbook: Workbook, db: AsyncSession) -> Optional[Workbook]:
    await db.delete(workbook)


async def update_problems(workbook: Workbook, problem_ids: List[int], db: AsyncSession) -> bool:
    result = await db.execute(
        select(WorkbookProblem).where(WorkbookProblem.workbook_id == workbook.id)
    )
    existing_problems = result.scalars().unique().all()

    for workbook_problem in existing_problems:
        await db.delete(workbook_problem)

    for index, problem_id in enumerate(problem_ids):
        workbook_problem = WorkbookProblem(
            workbook_id=workbook.id,
            problem_id=problem_id,
            display_order=index + 1
        )
        db.add(workbook_problem)

    await db.flush()
    await db.refresh(workbook)
    return True


async def find_all_paginated(
        db: AsyncSession, 
        page: int, 
        size: int,
        search: Optional[str] = None,
        sort_by: Optional[str] = "created_time",
        sort_order: Optional[str] = "desc",
        category: Optional[str] = None,
        tags: Optional[str] = None
) -> Page[Workbook]:
    from sqlalchemy import or_
    from app.workbook.models import WorkbookProblem
    from app.problem.models import problem_tags_association_table, ProblemTag

    stmt = select(Workbook).options(*WORKBOOK_WITH_RELATIONS)
    
    if search:
        search_term = f"%{search}%"
        stmt = stmt.where(or_(Workbook.title.ilike(search_term), Workbook.description.ilike(search_term)))
        
    if category:
        stmt = stmt.where(Workbook.category == category)
        
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        if tag_list:
            subq = select(1).select_from(WorkbookProblem).join(
                problem_tags_association_table, WorkbookProblem.problem_id == problem_tags_association_table.c.problem_id
            ).join(
                ProblemTag, ProblemTag.id == problem_tags_association_table.c.problemtag_id
            ).where(
                WorkbookProblem.workbook_id == Workbook.id,
                ProblemTag.name.in_(tag_list)
            )
            stmt = stmt.where(subq.exists())

    if sort_by == 'title':
        order_col = Workbook.title
    else:
        order_col = Workbook.created_time

    if sort_order == 'asc':
        stmt = stmt.order_by(order_col.asc())
    else:
        stmt = stmt.order_by(order_col.desc())

    return await paginate(db, stmt, page, size)


async def find_workbooks_by_creator_id(
        creator_id: int,
        page: int,
        size: int,
        session: AsyncSession
) -> Page[Workbook]:
    stmt = (
        select(Workbook)
        .options(*WORKBOOK_WITH_RELATIONS)
        .where(Workbook.created_by_id == creator_id)
        .order_by(Workbook.id.desc())
    )
    return await paginate(session, stmt, page, size)
