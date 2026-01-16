from typing import Optional, Any
from datetime import datetime
from sqlalchemy import Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from sqlalchemy import func, DateTime


class Submission(Base):
    __tablename__ = "submission"
    __table_args__ = {'schema': 'public', 'extend_existing': True}

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now())
    result: Mapped[int] = mapped_column(Integer, nullable=False)
    contest_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    problem_id: Mapped[int] = mapped_column(Integer, nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    info: Mapped[Optional[dict | list | Any]] = mapped_column(JSONB, nullable=True)
