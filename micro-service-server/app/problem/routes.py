import os
import asyncio
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

import app.problem.service as serv
from app.api.deps import get_database, get_userdata
from app.problem.schemas import *
from app.core.auth.guards import require_role
from app.user.schemas import UserData

router = APIRouter(prefix="/api/problem", tags=["Problem Management"])


@require_role("Admin")
@router.post("/import")
async def import_problem(
        file: UploadFile = File(...),
        user_data: UserData = Depends(get_userdata)):
    problem_num = await serv.count_problems_in_file(file)
    polling_key = await serv.setup_polling(problem_num)
    asyncio.create_task(serv.import_problem_from_file(polling_key, file, user_data))
    return {"polling_key": polling_key}


@require_role("Admin")
@router.get("/import/polling", response_model=ProblemImportPollingStatus)
async def import_problem_polling_api(key: str):
    return await serv.import_problem_polling(key)


# =======================================================================================================================
# 문제 필터 및 카운트에 필요한 api들

# 태그별 문제수 조회할 때 필요한거
@router.get("/tags/counts")
async def get_tag_count(db: AsyncSession = Depends(get_database)):
    return await serv.get_tag_count(db)


@router.get("/counts")
async def get_tag_count(db: AsyncSession = Depends(get_database)):
    return await serv.get_problem_count(db)


@router.get("/contest/{contest_id}/count")
async def get_contest_problem_count(contest_id: int, db: AsyncSession = Depends(get_database)):
    count = await serv.get_contest_problem_count(contest_id, db)
    return {"contest_id": contest_id, "count": count}


# 태그 필터링, 정렬 한번에 묶어서
@router.get("/list", response_model=ProblemListResponse)
async def get_filter_sorted_problems(
        # 태그로 필털이할 때 태그값 받음
        tags: Optional[List[str]] = Query(None),
        # 정렬옵션 넣을 때 받을 변수, 기본값 : id
        sort_option: Optional[str] = Query("id"),
        # 오름, 내림차순 받을 변수, 기본은 오름차순
        order: Optional[str] = Query("asc"),
        # 페이지네이션 관련
        page: int = Query(1, ge=1),
        page_size: int = Query(20, ge=1, le=250),
        db: AsyncSession = Depends(get_database)
):
    return await serv.get_filter_sorted_problems(tags, sort_option, order, page, page_size, db)
