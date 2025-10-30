from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.database import transactional
from app.problem.models import Problem
from app.workbook.models import Workbook, WorkbookProblem

WORKBOOK_WITH_RELATIONS = (
    selectinload(Workbook.problems)
    .joinedload(WorkbookProblem.problem)
    .selectinload(Problem.tags),
    selectinload(Workbook.problems).selectinload(WorkbookProblem.tags),
)


@transactional
async def save(workbook: Workbook, db: AsyncSession) -> Optional[Workbook]:
    db.add(workbook)
    await db.flush()
    await db.refresh(workbook)
    return workbook


async def find_by_id(workbook_id: int, db: AsyncSession) -> Optional[Workbook]:
    stmt = select(Workbook).options(*WORKBOOK_WITH_RELATIONS).where(Workbook.id == workbook_id)
    result = await db.execute(stmt)
    return result.scalars().unique().one_or_none()


async def find_all_is_public_is_true(db: AsyncSession) -> List[Workbook]:
    stmt = select(Workbook).options(*WORKBOOK_WITH_RELATIONS).where(Workbook.is_public == True)
    result = await db.execute(stmt)
    return result.scalars().unique().all()


@transactional
async def delete_by_id(workbook_id: int, db: AsyncSession) -> Optional[Workbook]:
    wb = await db.get(Workbook, workbook_id)
    await db.delete(wb)


@transactional
async def delete(workbook: Workbook, db: AsyncSession) -> Optional[Workbook]:
    await db.delete(workbook)


@transactional
async def update_problems(workbook: Workbook, problem_ids: List[int], db: AsyncSession) -> bool:
    result = await db.execute(
        select(WorkbookProblem).where(WorkbookProblem.workbook_id == workbook.id)
    )
    existing_problems = result.scalars().all()

    for workbook_problem in existing_problems:
        await db.delete(workbook_problem)

    for problem_id in problem_ids:
        workbook_problem = WorkbookProblem(
            workbook_id=workbook.id,
            problem_id=problem_id,
        )
        db.add(workbook_problem)

    await db.flush()
    await db.refresh(workbook)
    return True


async def find_all(db: AsyncSession) -> List[Workbook]:
    stmt = select(Workbook).options(*WORKBOOK_WITH_RELATIONS)
    result = await db.execute(stmt)
    return result.scalars().unique().all()
