from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.workbook import exceptions
from app.api.deps import get_userdata
from app.user.schemas import UserProfile
from app.core.auth.guards import require_role
from app.workbook.schemas import WorkbookCreate, WorkbookResponse, WorkbookProblem
from app.api.deps import get_database
from sqlalchemy.ext.asyncio import AsyncSession
import app.workbook.service as serv
from app.common.page import Page

router = APIRouter(prefix="/api/workbook", tags=["workbook"])


@router.post("/", response_model=WorkbookResponse)
async def create_workbook(
        workbook: WorkbookCreate,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.create_workbook(workbook, user_profile, db)


@router.get("/", response_model=Page[WorkbookResponse])
async def get_public_workbooks(
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1),
        search: Optional[str] = None,
        sort_by: Optional[str] = "created_time",
        sort_order: Optional[str] = "desc",
        category: Optional[str] = None,
        tags: Optional[str] = None,
        db: AsyncSession = Depends(get_database)):
    return await serv.get_public_workbooks(db, page, size, search, sort_by, sort_order, category, tags)


@router.get("/all", response_model=Page[WorkbookResponse])
@require_role("Admin")
async def get_workbooks(
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1),
        search: Optional[str] = None,
        sort_by: Optional[str] = "created_time",
        sort_order: Optional[str] = "desc",
        category: Optional[str] = None,
        tags: Optional[str] = None,
        user_profile: UserProfile = Depends(get_userdata),  # 보안검사용
        db: AsyncSession = Depends(get_database)):
    return await serv.get_workbooks(db, page, size, search, sort_by, sort_order, category, tags)


@router.get("/{workbook_id}", response_model=WorkbookResponse)
async def get_workbook(
        workbook_id: int,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.get_workbook(workbook_id, user_profile, db)


@router.put("/{workbook_id}", response_model=WorkbookResponse)
@require_role("Admin")
async def update_workbook(
        workbook_id: int,
        workbook: WorkbookCreate,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    updated_workbook = await serv.update_workbook(workbook_id, workbook, db)
    if not updated_workbook:
        exceptions.workbook_not_found()
    return updated_workbook


@router.delete("/{workbook_id}")
async def delete_workbook(
        workbook_id: int,
        db: AsyncSession = Depends(get_database)):
    await serv.delete_workbook(workbook_id, db)


@router.get("/{workbook_id}/problems", response_model=list[WorkbookProblem])
async def get_workbook_problems(
        workbook_id: int,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.get_workbook_problems(workbook_id, user_profile, db)


@router.put("/{workbook_id}/problems")
@require_role("Admin")
async def update_workbook_problems(
        workbook_id: int,
        problems_data: dict,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.update_workbook_problems(workbook_id, problems_data.get("problems", []), db)
