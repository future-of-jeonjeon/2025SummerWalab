from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_database, get_userdata
from app.todo import service
from app.todo.schemas import (
    AttendanceSyncResponse,
    DifficultyStatsResponse,
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
