import asyncio
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.api.deps import get_background_database
from app.core.logger import logger
import app.problem.service as problem_service

SEOUL_TZ = ZoneInfo("Asia/Seoul")
MAX_RETRIES = 3


async def _run_daily_selection_job(target_date, source: str) -> None:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with get_background_database() as db:
                result = await problem_service.get_or_create_daily_problem(db, target_date=target_date)
            logger.info(
                "[daily-problem] source=%s date=%s problem_id=%s attempt=%s",
                source,
                result.date,
                result.problem_id,
                attempt,
            )
            return
        except Exception as exc:
            logger.exception(
                "[daily-problem] source=%s date=%s attempt=%s failed: %s",
                source,
                target_date.isoformat(),
                attempt,
                exc,
            )
            if attempt < MAX_RETRIES:
                await asyncio.sleep(min(30, attempt * 5))


async def daily_problem_cron_bot() -> None:
    logger.info("[daily-problem] cron bot started timezone=Asia/Seoul schedule='0 0 * * *'")

    # Ensure a daily challenge exists even after a restart.
    today = datetime.now(SEOUL_TZ).date()
    await _run_daily_selection_job(today, source="startup")

    while True:
        now = datetime.now(SEOUL_TZ)
        next_midnight = datetime.combine(now.date() + timedelta(days=1), time.min, tzinfo=SEOUL_TZ)
        sleep_seconds = max((next_midnight - now).total_seconds(), 1)
        await asyncio.sleep(sleep_seconds)
        run_date = datetime.now(SEOUL_TZ).date()
        await _run_daily_selection_job(run_date, source="cron")
