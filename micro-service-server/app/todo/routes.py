from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_database, get_userdata
from app.todo import service
from app.todo.models import GoalPeriod, GoalType
from app.todo.schemas import (
    AttendanceSyncResponse,
    DifficultyStatsResponse,
    GoalHistoryOverviewResponse,
    GoalHistoryPageResponse,
    RecommendationsResponse,
    SolveCountResponse,
    TodoResponse,
    TodoUpdate,
)
from app.user.schemas import UserProfile

router = APIRouter(prefix="/api/todo", tags=["todo"])


@router.get("/my", response_model=TodoResponse)
async def get_my_todo(
    db: AsyncSession = Depends(get_database),
    user_profile: UserProfile = Depends(get_userdata),
):
    return await service.get_user_todo(db, user_profile.user_id)


@router.post("/my", response_model=TodoResponse)
async def set_my_todo(
    data: TodoUpdate,
    db: AsyncSession = Depends(get_database),
    user_profile: UserProfile = Depends(get_userdata),
):
    return await service.set_user_todo(db, user_profile.user_id, data)


@router.get("/history", response_model=GoalHistoryOverviewResponse)
async def get_goal_history(
    db: AsyncSession = Depends(get_database),
    user_profile: UserProfile = Depends(get_userdata),
):
    return await service.get_user_goal_history_overview(db, user_profile.user_id)


@router.get("/history/group", response_model=GoalHistoryPageResponse)
async def get_goal_history_group(
    period: GoalPeriod,
    type: GoalType,
    target: int = Query(..., ge=1),
    difficulty: Optional[int] = Query(None, ge=1, le=5),
    custom_days: Optional[int] = Query(None, ge=1, le=365),
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1, le=50),
    start_day_from: Optional[date] = Query(None),
    end_day_to: Optional[date] = Query(None),
    status: Optional[str] = Query(None, pattern="^(success|failure)$"),
    db: AsyncSession = Depends(get_database),
    user_profile: UserProfile = Depends(get_userdata),
):
    return await service.get_user_goal_history_group_page(
        db,
        user_profile.user_id,
        period=period,
        goal_type=type,
        target=target,
        difficulty=difficulty,
        custom_days=custom_days,
        page=page,
        page_size=page_size,
        start_day_from=start_day_from,
        end_day_to=end_day_to,
        status=status,
    )


@router.get("/recommendations", response_model=RecommendationsResponse)
async def get_recommendations(
    user_profile: UserProfile = Depends(get_userdata),
):
    return await service.get_recommendations()


@router.get("/stats/solve-count", response_model=SolveCountResponse)
async def get_solve_count_stats(
    db: AsyncSession = Depends(get_database),
    user_profile: UserProfile = Depends(get_userdata),
):
    return await service.get_user_stats(db, user_profile.user_id)


@router.post("/attendance/sync", response_model=AttendanceSyncResponse)
async def sync_attendance(
    db: AsyncSession = Depends(get_database),
    user_profile: UserProfile = Depends(get_userdata),
):
    return await service.sync_user_attendance(db, user_profile.user_id)


@router.get("/stats/difficulty", response_model=DifficultyStatsResponse)
async def get_difficulty_stats(
    db: AsyncSession = Depends(get_database),
    user_profile: UserProfile = Depends(get_userdata),
):
    return await service.get_difficulty_stats_service(db, user_profile.user_id)
