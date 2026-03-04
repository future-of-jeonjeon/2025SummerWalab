from sqlalchemy.ext.asyncio import AsyncSession
from app.common.page import Page
from app.user.schemas import UserProfile
from app.workbook.models import Workbook, WorkbookProblem
from app.workbook.schemas import WorkbookCreate, WorkbookUpdate, WorkbookResponse as WorkbookSchema, WorkbookResponse
from typing import List, Optional
from app.user import exceptions as user_exceptions
from app.workbook import exceptions
import app.user.repository as user_repo
import app.workbook.repository as workbook_repo


async def create_workbook(
        workbook_data: WorkbookCreate,
        user_profile: UserProfile,
        db: AsyncSession,
        problems_data: Optional[list[int]] = None,
) -> Workbook:
    user = await user_repo.find_user_by_username(db, user_profile.username)
    if not user:
        user_exceptions.user_not_found()
    workbook = _create_workbook_by_data(workbook_data, user.id)
    saved_workbook = await workbook_repo.save(workbook, db)

    provided_problem_ids = problems_data if problems_data is not None else getattr(workbook_data, "problem_ids", [])
    if provided_problem_ids:
        await workbook_repo.update_problems(saved_workbook, provided_problem_ids, db)
        refreshed = await workbook_repo.find_by_id(saved_workbook.id, db)
        if refreshed:
            saved_workbook = refreshed

    return saved_workbook


async def get_workbook(workbook_id: int, user_profile: UserProfile, db: AsyncSession) -> Workbook:
    workbook = await workbook_repo.find_by_id(workbook_id, db)
    if not workbook:
        exceptions.workbook_not_found()
    if not workbook.is_public and not user_profile.admin_type.__contains__("Admin"):
        exceptions.workbook_forbidden()
    user = await user_repo.find_user_by_id(workbook.created_by_id, db)
    if not user:
        user_exceptions.user_not_found()
    await _enrich_workbook(workbook, user.username)
    return workbook


async def get_workbooks(
    db: AsyncSession, 
    page: int = 1, 
    size: int = 20,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_time",
    sort_order: Optional[str] = "desc",
    category: Optional[str] = None,
    tags: Optional[str] = None) -> Page[WorkbookResponse]:
    workbooks_page = await workbook_repo.find_all_paginated(db, page, size, search, sort_by, sort_order, category, tags)
    for workbook in workbooks_page.items:
        user = await user_repo.find_user_by_id(workbook.created_by_id, db)
        if not user:
            user_exceptions.user_not_found()
            
        await _enrich_workbook(workbook, user.username)
    return workbooks_page.map(WorkbookResponse.model_validate)


async def get_public_workbooks(
    db: AsyncSession, 
    page: int = 1, 
    size: int = 20,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_time",
    sort_order: Optional[str] = "desc",
    category: Optional[str] = None,
    tags: Optional[str] = None) -> Page[WorkbookResponse]:
    workbooks_page = await workbook_repo.find_public_paginated(db, page, size, search, sort_by, sort_order, category, tags)
    for workbook in workbooks_page.items:
        user = await user_repo.find_user_by_id(workbook.created_by_id, db)
        if not user:
            user_exceptions.user_not_found()
            
        await _enrich_workbook(workbook, user.username)
    return workbooks_page.map(WorkbookResponse.model_validate)

async def update_workbook(workbook_id: int, workbook_data: WorkbookUpdate, db: AsyncSession) -> Optional[Workbook]:
    workbook = await workbook_repo.find_by_id(workbook_id, db)
    if not workbook:
        exceptions.workbook_not_found()
    workbook = _update_workbook_data(workbook, workbook_data)
    return await workbook_repo.save(workbook, db)


async def delete_workbook(workbook_id: int, db: AsyncSession):
    workbook = await workbook_repo.find_by_id(workbook_id, db)
    if not workbook:
        exceptions.workbook_not_found()
    await workbook_repo.delete(workbook, db)

async def get_workbook_problems(workbook_id: int, user_profile: UserProfile, db: AsyncSession) -> List[WorkbookProblem]:
    workbook = await workbook_repo.find_by_id(workbook_id, db)
    if not workbook:
        exceptions.workbook_not_found()
    if not workbook.is_public and not user_profile.admin_type.__contains__("Admin"):
        exceptions.workbook_forbidden()
    return workbook.problems


async def update_workbook_problems(workbook_id: int, problem_ids: list[int], db: AsyncSession) -> bool:
    workbook = await workbook_repo.find_by_id(workbook_id, db)
    if not workbook:
        exceptions.workbook_not_found()

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


async def _enrich_workbook(workbook: Workbook, username: str):
    workbook.writer = username
    tags = set()
    for wp in workbook.problems:
        for tag in wp.tags:
            tags.add(tag.name)
    workbook.tags = list(tags)
    workbook.problem_count = len(workbook.problems)
    return workbook


async def get_contributed_workbooks(user_profile: UserProfile, page: int, size: int, db: AsyncSession) -> Page[WorkbookSchema]:
    workbooks_page = await workbook_repo.find_workbooks_by_creator_id(user_profile.user_id, page, size, db)
    for workbook in workbooks_page.items:
        user = await user_repo.find_user_by_id(workbook.created_by_id, db)
        if not user:
            user_exceptions.user_not_found()
            
        await _enrich_workbook(workbook, user.username)
    return workbooks_page.map(WorkbookSchema.model_validate)
