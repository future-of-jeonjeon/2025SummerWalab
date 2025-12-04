from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_session
from app.security.deps import get_userdata
from app.submission import service as submission_service
from app.submission.schemas import ContestProblemStatList, ContestScoreBoard, SubmissionDailyCount
from app.user.schemas import UserData

router = APIRouter(prefix="/api/submission", tags=["submission"])


@router.get("/contest/{contest_id}/problem-stats", response_model=ContestProblemStatList)
async def get_contest_problem_stats(
        contest_id: int,
        problem_ids: Optional[List[int]] = Query(None, description="Filter by specific problem ids"),
        db: AsyncSession = Depends(get_session),
):
    stats = await submission_service.get_contest_problem_stats(contest_id, problem_ids, db)
    return ContestProblemStatList(contest_id=contest_id, stats=stats)


@router.get("/contest/{contest_id}/scores", response_model=ContestScoreBoard)
async def get_contest_user_scores(
        contest_id: int,
        db: AsyncSession = Depends(get_session),
):
    scores = await submission_service.get_contest_user_scores(contest_id, db)
    return ContestScoreBoard(contest_id=contest_id, scores=scores)


@router.get("/contribution", response_model=List[SubmissionDailyCount])
async def get_contribution_data(
        user_data: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)):
    return await submission_service.get_contribution_data(user_data, db)
