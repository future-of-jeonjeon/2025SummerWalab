from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import app.problem.service as problem_service
from app.api.deps import get_database, get_userdata
from app.core.auth.guards import require_role
from app.problem.schemas import DailyProblemResponse, DailyProblemReselectRequest
from app.user.schemas import UserProfile

router = APIRouter(prefix="/api/problems", tags=["Daily Problem"])


@router.get("/daily", response_model=DailyProblemResponse)
async def get_daily_problem_alias_api(db: AsyncSession = Depends(get_database)):
    return await problem_service.get_or_create_daily_problem(db)


@require_role("Admin")
@router.post("/daily/reselect", response_model=DailyProblemResponse)
async def reselect_daily_problem_alias_api(
        request_data: DailyProblemReselectRequest,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await problem_service.reselect_daily_problem(db, seed=request_data.seed)
