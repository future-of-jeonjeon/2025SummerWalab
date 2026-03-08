from typing import Optional, Any, Union
from datetime import datetime
from sqlalchemy import Boolean, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from sqlalchemy import func, DateTime


class Submission(Base):
    __tablename__ = "submission"
    __table_args__ = {'schema': 'public', 'extend_existing': True}

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    contest_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    problem_id: Mapped[int] = mapped_column(Integer, nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[int] = mapped_column(Integer, nullable=False)
    info: Mapped[Union[dict, list, Any]] = mapped_column(JSONB, nullable=False)
    language: Mapped[str] = mapped_column(Text, nullable=False)
    shared: Mapped[bool] = mapped_column(Boolean, nullable=False)
    statistic_info: Mapped[Union[dict, list, Any]] = mapped_column(JSONB, nullable=False)
    username: Mapped[str] = mapped_column(Text, nullable=False)
    ip: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
