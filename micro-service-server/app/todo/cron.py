import asyncio
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.api.deps import get_background_database
from app.core.logger import logger
import app.todo.service as todo_service

SEOUL_TZ = ZoneInfo("Asia/Seoul")
MAX_RETRIES = 3


async def _run_todo_rollover_job(target_date, source: str) -> None:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with get_background_database() as db:
                archived = await todo_service.rollover_due_goals(db, target_date=target_date)
            logger.info(
                "[todo-rollover] source=%s date=%s archived=%s attempt=%s",
                source,
                target_date.isoformat(),
                archived,
                attempt,
            )
            return
        except Exception as exc:
            logger.exception(
                "[todo-rollover] source=%s date=%s attempt=%s failed: %s",
                source,
                target_date.isoformat(),
                attempt,
                exc,
            )
            if attempt < MAX_RETRIES:
                await asyncio.sleep(min(30, attempt * 5))


async def todo_rollover_cron_bot() -> None:
    logger.info("[todo-rollover] cron bot started timezone=Asia/Seoul schedule='0 0 * * *'")

    today = datetime.now(SEOUL_TZ).date()
    await _run_todo_rollover_job(today, source="startup")

    while True:
        now = datetime.now(SEOUL_TZ)
        next_midnight = datetime.combine(now.date() + timedelta(days=1), time.min, tzinfo=SEOUL_TZ)
        sleep_seconds = max((next_midnight - now).total_seconds(), 1)
        await asyncio.sleep(sleep_seconds)
        run_date = datetime.now(SEOUL_TZ).date()
        await _run_todo_rollover_job(run_date, source="cron")
