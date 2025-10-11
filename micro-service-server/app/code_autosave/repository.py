from typing import Optional

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.code_autosave.models import ProblemCode


async def find_by_problem_id_and_user_id_and_language(
        problem_id: int,
        user_id: int,
        language: str,
        db: AsyncSession) -> Optional[ProblemCode]:
    stmt = (select(ProblemCode)
            .where(ProblemCode.problem_id == problem_id)
            .where(ProblemCode.user_id == user_id)
            .where(ProblemCode.language == language)
            )
    result = await db.execute(stmt)
    return result.scalars().one_or_none()


async def save(entity: ProblemCode, db: AsyncSession) -> ProblemCode:
    db.add(entity)
    await db.flush()
    await db.refresh(entity)
    return entity