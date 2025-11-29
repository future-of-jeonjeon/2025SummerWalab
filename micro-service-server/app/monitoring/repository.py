from sqlalchemy import select, func
from datetime import datetime, timedelta
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.monitoring.schemas import SubmissionHistoryItem
from app.submission.models import Submission

JUDGE_STATUS_PENDING = 6  # 대기중
JUDGE_STATUS_JUDGING = 7  # 채점중


async def get_queue_size(db: AsyncSession) -> int:
    stmt = select(func.count(Submission.id)).where(Submission.result.in_([JUDGE_STATUS_PENDING, JUDGE_STATUS_JUDGING]))
    output = await db.execute(stmt)
    count = output.scalar() or 0
    return count


async def get_max_wait_time(db: AsyncSession) -> int:
    stmt = select(Submission.create_time).where(
        Submission.result.in_([JUDGE_STATUS_PENDING, JUDGE_STATUS_JUDGING])).order_by(
        Submission.create_time.asc()).limit(1)
    result = await db.execute(stmt)
    oldest_created_at = result.scalar_one_or_none()
    if oldest_created_at is None:
        return 0
    now = datetime.utcnow()
    wait_seconds = int((now - oldest_created_at).total_seconds())
    return max(wait_seconds, 0)


async def get_submission_rate(db: AsyncSession) -> int:
    one_minute_ago = datetime.utcnow() - timedelta(minutes=1)
    stmt = select(func.count(Submission.id)).where(Submission.create_time >= one_minute_ago)
    result = await db.execute(stmt)
    count_last_minute = result.scalar() or 0
    return count_last_minute

async def get_history_query(db: AsyncSession) -> List[SubmissionHistoryItem]:
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)

    stmt = (
        select(
            func.to_char(Submission.create_time, 'HH24:MI').label('time_str'),
            func.count(Submission.id).label('count'),
        )
        .where(Submission.create_time >= one_hour_ago)
        .group_by('time_str')
        .order_by('time_str')
    )

    result = await db.execute(stmt)
    rows = result.fetchall()

    history = [
        SubmissionHistoryItem(time=row.time_str, count=row.count)
        for row in rows
    ]

    return history
