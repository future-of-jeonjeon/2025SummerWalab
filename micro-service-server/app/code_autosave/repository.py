from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.code_autosave.models import ProblemCode
from sqlalchemy.dialects.postgresql import insert

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
    stmt = insert(ProblemCode).values(
        problem_id=entity.problem_id,
        user_id=entity.user_id,
        language=entity.language,
        code=entity.code,
    ).on_conflict_do_update(
        index_elements=["problem_id", "user_id", "language"],
        set_={"code": entity.code}
    ).returning(ProblemCode)
    result = await db.execute(stmt)
    return result.scalar_one()