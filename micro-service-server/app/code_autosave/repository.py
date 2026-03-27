from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.code_autosave.models import ProblemCode, CustomCode
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


async def get_custom_code_by_file_name_and_user_id(file_name, user_id, db):
    stmt = (
        select(CustomCode)
        .where(CustomCode.file_name == file_name)
        .where(CustomCode.user_id == user_id)
    )
    result = await db.execute(stmt)
    entity = result.scalars().one_or_none()
    return entity.code if entity else ""


async def save_custom_code(entity: CustomCode, db: AsyncSession) -> CustomCode:
    stmt = insert(CustomCode).values(
        file_name=entity.file_name,
        user_id=entity.user_id,
        code=entity.code,
    ).on_conflict_do_update(
        index_elements=["user_id", "file_name"],
        set_={"code": entity.code}
    ).returning(CustomCode)
    result = await db.execute(stmt)
    return result.scalar_one()


async def get_custom_code_list_by_user_id(user_id: int, db: AsyncSession) -> list[CustomCode]:
    stmt = (
        select(CustomCode)
        .where(CustomCode.user_id == user_id)
        .order_by(CustomCode.updated_time.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def delete_custom_code_by_file_name_and_user_id(
        file_name: str,
        user_id: int,
        db: AsyncSession) -> None:
    stmt = (
        delete(CustomCode)
        .where(CustomCode.user_id == user_id)
        .where(CustomCode.file_name == file_name)
    )
    await db.execute(stmt)
    return None
