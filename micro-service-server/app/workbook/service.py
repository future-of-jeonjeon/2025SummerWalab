from sqlalchemy.ext.asyncio import AsyncSession
from app.user.DTO import UserData
from app.workbook.models import Workbook, WorkbookProblem
from app.workbook.schemas import WorkbookCreate, WorkbookUpdate
from typing import List, Optional
from fastapi import HTTPException
import app.user.user_repository as user_repo
import app.workbook.repository as workbook_repo


async def create_workbook(
        workbook_data: WorkbookCreate,
        userdata: UserData,
        db: AsyncSession,
        *,
        problems_data: Optional[list[int]] = None,
) -> Workbook:
    user = await user_repo.find_by_username(db, userdata.username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    workbook = _create_workbook_by_data(workbook_data, user.id)
    saved_workbook = await workbook_repo.save(workbook, db)

    provided_problem_ids = problems_data if problems_data is not None else getattr(workbook_data, "problem_ids", [])
    if provided_problem_ids:
        await workbook_repo.update_problems(saved_workbook, provided_problem_ids, db)
        refreshed = await workbook_repo.find_by_id(saved_workbook.id, db)
        if refreshed:
            saved_workbook = refreshed

    return saved_workbook


async def get_workbook(workbook_id: int, userdata: UserData, db: AsyncSession) -> Workbook:
    workbook = await workbook_repo.find_by_id(workbook_id, db)
    if not workbook:
        raise HTTPException(status_code=404, detail="WorkBook not found")
    if not workbook.is_public and not userdata.admin_type.__contains__("Admin"):
        raise HTTPException(status_code=403, detail="Permission error")
    return workbook


async def get_workbooks(db: AsyncSession) -> List[Workbook]:
    ## TODO : 이후 pagination 방식으로 개선 필요
    return await workbook_repo.find_all(db)


async def get_public_workbooks(db: AsyncSession) -> List[Workbook]:
    ## TODO : 이후 pagination 방식으로 개선 필요
    return await workbook_repo.find_all_is_public_is_true(db)


async def update_workbook(workbook_id: int, workbook_data: WorkbookUpdate, db: AsyncSession) -> Optional[Workbook]:
    workbook = await workbook_repo.find_by_id(workbook_id, db)
    if not workbook:
        raise HTTPException(status_code=404, detail="WorkBook not found")
    workbook = _update_workbook_data(workbook, workbook_data)
    return await workbook_repo.save(workbook, db)


async def delete_workbook(workbook_id: int, db: AsyncSession):
    workbook = await workbook_repo.find_by_id(workbook_id, db)
    if not workbook:
        raise HTTPException(status_code=404, detail="WorkBook not found")
    await workbook_repo.delete(workbook, db)

async def get_workbook_problems(workbook_id: int, db: AsyncSession) -> List[WorkbookProblem]:
    ## TODO : is_public -> false 인 경우 처리 필요
    workbook = await workbook_repo.find_by_id(workbook_id, db)
    if not workbook:
        raise HTTPException(status_code=404, detail="WorkBook not found")
    return workbook.problems


async def update_workbook_problems(workbook_id: int, problem_ids: list[int], db: AsyncSession) -> bool:
    workbook = await workbook_repo.find_by_id(workbook_id, db)
    if not workbook:
        raise HTTPException(status_code=404, detail="WorkBook not found")

    return await workbook_repo.update_problems(workbook, problem_ids, db)


def _create_workbook_by_data(workbook_data: WorkbookCreate, user_id: int):
    return Workbook(
        title=workbook_data.title,
        description=workbook_data.description,
        category=workbook_data.category,
        created_by_id=user_id,
        is_public=workbook_data.is_public,
    )


def _update_workbook_data(workbook: Workbook, workbook_data: WorkbookUpdate):
    workbook.title = workbook_data.title
    workbook.description = workbook_data.description
    workbook.category = workbook_data.category
    workbook.is_public = workbook_data.is_public
    return workbook
