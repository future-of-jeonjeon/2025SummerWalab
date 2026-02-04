from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_database, get_userdata
from app.todo import service
from app.todo.schemas import (
    TodoResponse, 
    TodoUpdate, 
    RecommendationsResponse,
    SolveCountResponse,
    StreakResponse,
    DifficultyStatsResponse
)
from app.user.schemas import UserData

router = APIRouter(prefix="/api/todo", tags=["todo"])


@router.get("/my", response_model=TodoResponse | None)
async def get_my_todo(
    db: AsyncSession = Depends(get_database),
    current_user: UserData = Depends(get_userdata),
):
    return await service.get_user_todo(db, current_user.user_id)


@router.post("/my", response_model=TodoResponse)
async def set_my_todo(
    data: TodoUpdate,
    db: AsyncSession = Depends(get_database),
    current_user: UserData = Depends(get_userdata),
):
    return await service.set_user_todo(db, current_user.user_id, data)


@router.get("/recommendations", response_model=RecommendationsResponse)
async def get_recommendations(
    current_user: UserData = Depends(get_userdata),
):
    return service.get_recommendations()


@router.get("/stats/solve-count", response_model=SolveCountResponse)
async def get_solve_count_stats(
    db: AsyncSession = Depends(get_database),
    current_user: UserData = Depends(get_userdata),
):
    return await service.get_user_stats(db, current_user.user_id)


@router.get("/stats/streak", response_model=StreakResponse)
async def get_streak_stats(
    db: AsyncSession = Depends(get_database),
    current_user: UserData = Depends(get_userdata),
):
    return await service.get_user_streak(db, current_user.user_id)


@router.get("/stats/difficulty", response_model=DifficultyStatsResponse)
async def get_difficulty_stats(
    db: AsyncSession = Depends(get_database),
    current_user: UserData = Depends(get_userdata),
):
    return await service.get_difficulty_stats_service(db, current_user.user_id)
