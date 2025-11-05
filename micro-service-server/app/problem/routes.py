from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_session
from app.problem.service import ProblemService
from app.problem.schemas import ProblemListResponse

router = APIRouter(prefix="/api/problem", tags=["Problem Management"])


# 문제 필터 및 카운트에 필요한 api들

# 태그별 문제수 조회할 때 필요한거
@router.get("/tags/counts")
async def get_tag_count(db: AsyncSession = Depends(get_session)):
    service = ProblemService(db)
    return await service.get_tag_count()


@router.get("/contest/{contest_id}/count")
async def get_contest_problem_count(contest_id: int, db: AsyncSession = Depends(get_session)):
    service = ProblemService(db)
    count = await service.get_contest_problem_count(contest_id)
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
        db: AsyncSession = Depends(get_session)
):
    service = ProblemService(db)
    return await service.get_filter_sorted_problems(tags, sort_option, order, page, page_size)
