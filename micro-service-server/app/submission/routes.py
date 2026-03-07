from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_database
from app.api.deps import get_userdata
from app.submission import service as submission_service
from app.submission.schemas import ContestProblemStatList, ContestScoreBoard, SubmissionDailyCount, \
    SubmissionListResponse
from app.user.schemas import UserProfile

router = APIRouter(prefix="/api/submission", tags=["submission"])





@router.get("/contest/{contest_id}/problem-stats", response_model=ContestProblemStatList)
async def get_contest_problem_stats(
        contest_id: int,
        problem_ids: Optional[List[int]] = Query(None, description="Filter by specific problem ids"),
        db: AsyncSession = Depends(get_database),
):
    stats = await submission_service.get_contest_problem_stats(contest_id, problem_ids, db)
    return ContestProblemStatList(contest_id=contest_id, stats=stats)




@router.get("", response_model=List[SubmissionListResponse])
async def get_problem_submission(
    problem_id: int = Query(..., ge=1),
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    contest_id: Optional[int] = Query(None, ge=1),
    user_profile: UserProfile = Depends(get_userdata),
    db: AsyncSession = Depends(get_database)):
    return await submission_service.get_problem_submission(
        problem_id=problem_id,
        limit=limit,
        offset=offset,
        contest_id=contest_id,
        user_id=user_profile.user_id,
        db=db,
    )


@router.get("/contest/{contest_id}/scores", response_model=ContestScoreBoard)
async def get_contest_user_scores(
        contest_id: int,
        db: AsyncSession = Depends(get_database),
):
    scores = await submission_service.get_contest_user_scores(contest_id, db)
    return ContestScoreBoard(contest_id=contest_id, scores=scores)


@router.get("/contribution", response_model=List[SubmissionDailyCount])
async def get_contribution_data(
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await submission_service.get_contribution_data(user_profile, db)
