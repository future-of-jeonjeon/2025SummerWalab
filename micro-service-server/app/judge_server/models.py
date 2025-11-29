from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, Text, Boolean, DateTime

from app.config.database import Base


class JudgeServer(Base):
    __tablename__ = "judge_server"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    hostname = Column(Text, nullable=False)
    ip = Column(Text)
    judger_version = Column(Text, nullable=False)
    cpu_core = Column(Integer, nullable=False)
    memory_usage = Column(Integer)
    cpu_usage = Column(Integer)
    last_heartbeat = Column(DateTime(timezone=False), nullable=False)
    create_time = Column(DateTime(timezone=False))
    task_number = Column(Integer, nullable=False, default=0)
    service_url = Column(Text)
    is_disabled = Column(Boolean, nullable=False, default=False)

    @property
    def status(self) -> str:
        if not self.last_heartbeat:
            return "abnormal"
        now_utc = datetime.now(timezone.utc)
        lh = self.last_heartbeat
        if lh.tzinfo is None:
            # Assume DB-stored naive timestamp is UTC
            lh_utc = lh.replace(tzinfo=timezone.utc)
        else:
            lh_utc = lh.astimezone(timezone.utc)
        if (now_utc - lh_utc).total_seconds() > 6:
            return "abnormal"
        return "normal"
