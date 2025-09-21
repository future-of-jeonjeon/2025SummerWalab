from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.databse import transactional
from app.workbook.models import Workbook, WorkbookProblem

@transactional
async def save(workbook: Workbook, db: AsyncSession) -> Optional[Workbook]:
    db.add(workbook)
    await db.flush()
    await db.refresh(workbook)
    return workbook


async def find_by_id(workbook_id: int, db: AsyncSession) -> Optional[Workbook]:
    from sqlalchemy.orm import selectinload

    stmt = (
        select(Workbook)
        .options(
            selectinload(Workbook.problems).selectinload(WorkbookProblem.problem)
        )
        .where(Workbook.id == workbook_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def find_all_is_public_is_true(db: AsyncSession) -> List[Workbook]:
    stmt = select(Workbook).where(Workbook.is_public == True)
    result = await db.execute(stmt)
    return result.scalars().all()


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

    new_problems: List[WorkbookProblem] = []
    for problem_id in problem_ids:
        workbook_problem = WorkbookProblem(
            workbook_id=workbook.id,
            problem_id=problem_id,
        )
        db.add(workbook_problem)
        new_problems.append(workbook_problem)

    workbook.problems = new_problems
    return True


async def find_all(db: AsyncSession) -> List[Workbook]:
    result = await db.execute(select(Workbook))
    return result.scalars().all()
