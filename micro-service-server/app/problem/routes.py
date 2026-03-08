import asyncio

from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

import app.problem.service as serv
from app.api.deps import get_database, get_userdata, get_database_readonly, get_optional_userdata
from app.problem.schemas import *
from app.core.auth.guards import require_role
from app.user.schemas import UserProfile

router = APIRouter(prefix="/api/problem", tags=["Problem Management"])


@router.post("")
async def create_problem_api(
        request_data: ProblemCreateRequest,
        user_profile: UserProfile = Depends(get_userdata)):
    polling_key = await serv.setup_polling(problem_num=1)
    asyncio.create_task(serv.create_problem(polling_key, request_data, user_profile, is_admin=False))
    return {"polling_key": polling_key}


@router.put("/{problem_id}")
async def update_problem_api(
        problem_id: int,
        request_data: ProblemUpdateRequest,
        user_profile: UserProfile = Depends(get_userdata)):
    polling_key = await serv.setup_polling(problem_num=1)
    asyncio.create_task(serv.update_problem(polling_key, problem_id, request_data, user_profile, is_admin=False))
    return {"polling_key": polling_key}


@router.post("/testcase")
async def upload_test_case(
        file: UploadFile = File(...),
        spj: bool = Query(False),
        user_profile: UserProfile = Depends(get_userdata)):
    return await serv.process_test_case_upload(file, spj)


@router.post("/import")
async def import_problem(
        file: UploadFile = File(...),
        user_profile: UserProfile = Depends(get_userdata)):
    problem_num = await serv.count_problems_in_file(file)
    polling_key = await serv.setup_polling(problem_num)
    file_contents = await file.read()
    filename = file.filename
    asyncio.create_task(
        serv.import_problem_from_file(polling_key, file_contents, filename, user_profile, is_admin=False))
    return {"polling_key": polling_key}


@require_role("Admin")
@router.post("/admin/create")
async def create_problem_admin(
        request_data: ProblemCreateRequest,
        user_profile: UserProfile = Depends(get_userdata)):
    polling_key = await serv.setup_polling(problem_num=1)
    asyncio.create_task(serv.create_problem(polling_key, request_data, user_profile, is_admin=True))
    return {"polling_key": polling_key}


@require_role("Admin")
@router.post("/admin/import")
async def import_problem_admin(
        file: UploadFile = File(...),
        user_profile: UserProfile = Depends(get_userdata)):
    problem_num = await serv.count_problems_in_file(file)
    polling_key = await serv.setup_polling(problem_num)
    asyncio.create_task(serv.import_problem_from_file(polling_key, file, user_profile, is_admin=True))
    return {"polling_key": polling_key}


@router.get("/polling", response_model=ProblemImportPollingStatus)
async def problem_polling(key: str):
    return await serv.import_problem_polling(key)


@router.get("/{problem_id}", response_model=ProblemDetailResponse)
async def get_problem_detail_api(
        problem_id: int,
        db: AsyncSession = Depends(get_database),
        user_profile: UserProfile = Depends(get_optional_userdata)):
    return await serv.get_problem_detail(problem_id, db)


# =======================================================================================================================
# 문제 필터 및 카운트에 필요한 api들

# 태그별 문제수 조회할 때 필요한거
@router.get("/tags/counts")
async def get_tag_count(db: AsyncSession = Depends(get_database)):
    return await serv.get_tag_count(db)


@router.get("/contest/{contest_id}/count")
async def get_contest_problem_count(contest_id: int, db: AsyncSession = Depends(get_database)):
    count = await serv.get_contest_problem_count(contest_id, db)
    return {"contest_id": contest_id, "count": count}


# 태그 필터링, 정렬 한번에 묶어서
@router.get("/list", response_model=ProblemListResponse)
async def get_filter_sorted_problems(
        tags: Optional[List[str]] = Query(None),
        keyword: Optional[str] = Query(None),
        difficulty_min: Optional[int] = Query(None),
        difficulty_max: Optional[int] = Query(None),
        sort_option: Optional[str] = Query("id"),
        order: Optional[str] = Query("asc"),
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=250),
        request_user: Optional[UserProfile] = Depends(get_optional_userdata),
        db: AsyncSession = Depends(get_database)) -> ProblemListResponse:
    return await serv.get_filter_sorted_problems(
        tags,
        keyword,
        difficulty_min,
        difficulty_max,
        sort_option,
        order,
        page,
        size,
        request_user,
        db)


@router.get("/available", response_model=ProblemListResponse)
@require_role("Admin", "OrganizationAdmin", "User")
async def get_available_problems(
        keyword: Optional[str] = Query(None),
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=250),
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)
):
    return await serv.get_available_contest_problem(page, size, keyword, user_profile, db)


@router.get("/contest/search", response_model=ProblemListResponse)
async def get_available_contest_problem(
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=250),
        keyword: Optional[str] = Query(None),
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.get_available_contest_problem(page=page,
                                                    size=size,
                                                    keyword=keyword,
                                                    user_profile=user_profile,
                                                    db=db)


@router.get("/{problem_id}", response_model=ProblemResponse)
async def get_problem_by_id(
        problem_id: int,
        db: AsyncSession = Depends(get_database_readonly)):
    return await serv.get_problem(problem_id, db)
