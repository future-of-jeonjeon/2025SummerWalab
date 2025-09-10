from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import Column, Integer, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import JSONB

from app.config.database import Base


class JudgeServer(Base):
    __tablename__ = "judge_server"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    hostname = Column(Text, nullable=False)
    ip = Column(Text)
    judger_version = Column(Text, nullable=False)
    cpu_core = Column(Integer, nullable=False)
    memory_usage = Column(Integer)  # store as percentage * 100 or MB depending backend
    cpu_usage = Column(Integer)
    last_heartbeat = Column(DateTime(timezone=False), nullable=False)
    create_time = Column(DateTime(timezone=False))
    task_number = Column(Integer, nullable=False, default=0)
    service_url = Column(Text)
    is_disabled = Column(Boolean, nullable=False, default=False)

    @property
    def status(self) -> str:
        # Align with OnlineJudge/conf/models.py: abnormal if last heartbeat > 6s ago.
        # Normalize timezone awareness to UTC to avoid naive/aware subtraction errors.
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


class SysOption(Base):
    __tablename__ = "options_sysoptions"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    key = Column(Text, unique=True, index=True, nullable=False)
    value = Column(JSONB, nullable=False)

    @staticmethod
    def get_value_sync(data: dict, key: str, default: Optional[object] = None):
        return data.get(key, default)
