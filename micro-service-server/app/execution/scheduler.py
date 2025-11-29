from __future__ import annotations

from contextlib import AbstractAsyncContextManager
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.judge_server.models import JudgeServer
from app.config.database import SessionLocal


@dataclass
class SelectedServer:
    id: int
    service_url: str
    cpu_core: int
    task_number: int


class ChooseJudgeServerAsync(AbstractAsyncContextManager):
    def __init__(self, session: Optional[AsyncSession] = None):
        # A dedicated short-lived session is used for selection/increment/decrement
        # to avoid nested transaction issues with a caller-held session.
        self._external_session = session
        self.server: Optional[SelectedServer] = None

    async def __aenter__(self) -> Optional[SelectedServer]:
        # Single transactional selection + increment
        async with SessionLocal() as session:
            async with session.begin():
                stmt = (
                    select(JudgeServer)
                    .where(JudgeServer.is_disabled.is_(False))
                    .order_by(JudgeServer.task_number)
                    .with_for_update()
                )
                result = await session.execute(stmt)
                servers = [s for s in result.scalars().all() if s.status == "normal"]

                for s in servers:
                    # Use same heuristic: allow up to cpu_core * 2 concurrent tasks
                    if (s.task_number or 0) <= (s.cpu_core or 0) * 2:
                        # Atomic increment using UPDATE judge_server SET task_number = task_number + 1 WHERE id = ...
                        await session.execute(
                            update(JudgeServer)
                            .where(JudgeServer.id == s.id)
                            .values(task_number=JudgeServer.task_number + 1)
                        )
                        self.server = SelectedServer(
                            id=s.id,
                            service_url=s.service_url,
                            cpu_core=s.cpu_core,
                            task_number=(s.task_number or 0) + 1,
                        )
                        return self.server
        return None

    async def __aexit__(self, exc_type, exc, tb):
        if self.server:
            async with SessionLocal() as session:
                async with session.begin():
                    await session.execute(
                        update(JudgeServer)
                        .where(JudgeServer.id == self.server.id)
                        .values(task_number=JudgeServer.task_number - 1)
                    )
        return False
