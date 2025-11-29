from datetime import datetime

import app.monitoring.repository as repo

from sqlalchemy.ext.asyncio import AsyncSession

from app.monitoring.schemas import MonitoringResponse


async def get_get_judge_server_data(db: AsyncSession) -> MonitoringResponse:
    max_wait_time = await repo.get_max_wait_time(db)
    queue_size = await repo.get_queue_size(db)
    submission_rate = await repo.get_submission_rate(db)
    history_list = await repo.get_history_query(db)
    return MonitoringResponse(
        max_wait_time=max_wait_time,
        queue_size=queue_size,
        submission_rate=submission_rate,
        history=history_list,
        timestamp=datetime.utcnow(),
    )
