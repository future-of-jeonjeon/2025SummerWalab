from typing import Iterable, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.submission import repository as submission_repo
from app.submission.models import Submission
from app.submission.schemas import ContestProblemStat, ContestUserScore, SubmissionDailyCount, SubmissionListResponse
from app.user.schemas import UserProfile
from app.core.logger import logger


async def get_contest_problem_stats(
        contest_id: int,
        problem_ids: Optional[Iterable[int]],
        db: AsyncSession,
) -> List[ContestProblemStat]:
    stats = await submission_repo.fetch_contest_problem_stats(
        db,
        contest_id=contest_id,
        problem_ids=problem_ids,
    )
    logger.info(f"Fetched problem stats for contest {contest_id}")
    return [ContestProblemStat(**item) for item in stats]


async def get_contest_user_scores(
        contest_id: int,
        db: AsyncSession,
) -> List[ContestUserScore]:
    scores = await submission_repo.fetch_contest_user_scores(
        db,
        contest_id=contest_id,
    )
    logger.info(f"Fetched user scores for contest {contest_id}")
    return [ContestUserScore(**item) for item in scores]


async def get_contribution_data(user_profile: UserProfile, db: AsyncSession) -> List[SubmissionDailyCount]:
    rows = await submission_repo.get_user_submissions_by_year(user_profile.user_id, db)
    return [
        SubmissionDailyCount(date=row.date, count=row.count)
        for row in rows
    ]

async def get_problem_submission(
    problem_id: int,
    limit: int,
    offset: int,
    contest_id: Optional[int],
    user_id: Optional[int],
    db: AsyncSession,) -> list[SubmissionListResponse]:
    submission_list: list[Submission] = await submission_repo.fetch_problem_submissions(
        problem_id=problem_id,
        contest_id=contest_id,
        user_id=user_id,
        limit=limit,
        offset=offset,
        db=db,
    )

    return [
        SubmissionListResponse(
            id=submission.id,
            create_time=submission.create_time,
            result=submission.result,
            contest_id=submission.contest_id,
            problem_id=submission.problem_id,
            user_id=submission.user_id,
        )
        for submission in submission_list
    ]