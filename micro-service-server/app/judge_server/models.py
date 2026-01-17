from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Integer, Text, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class JudgeServer(Base):
    __tablename__ = "judge_server"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    hostname: Mapped[str] = mapped_column(Text, nullable=False)
    ip: Mapped[Optional[str]] = mapped_column(Text)
    judger_version: Mapped[str] = mapped_column(Text, nullable=False)
    cpu_core: Mapped[int] = mapped_column(Integer, nullable=False)
    memory_usage: Mapped[Optional[int]] = mapped_column(Integer)
    cpu_usage: Mapped[Optional[int]] = mapped_column(Integer)
    last_heartbeat: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now())
    task_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    service_url: Mapped[Optional[str]] = mapped_column(Text)
    is_disabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    @property
    def status(self) -> str:
        if not self.last_heartbeat:
            return "abnormal"
        now_utc = datetime.now(timezone.utc)
        lh = self.last_heartbeat
        if lh.tzinfo is None:
            lh_utc = lh.replace(tzinfo=timezone.utc)
        else:
            lh_utc = lh.astimezone(timezone.utc)
        if (now_utc - lh_utc).total_seconds() > 6:
            return "abnormal"
        return "normal"
