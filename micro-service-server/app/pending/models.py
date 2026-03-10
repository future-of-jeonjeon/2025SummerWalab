from datetime import datetime
from enum import Enum

from sqlalchemy import Enum as SAEnum, BigInteger, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.common.base_entity import BaseEntity
from app.core.database import Base


class PendingStatus(str, Enum):
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
    EXPIRED = "EXPIRED"


class PendingTargetType(str, Enum):
    PROBLEM = "PROBLEM"
    WORKBOOK = "WORKBOOK"
    CONTEST_USER = "CONTEST_USER"
    Organization = "Organization"


class Pending(Base, BaseEntity):
    __tablename__ = "micro_pending"
    __table_args__ = {"schema": "public"}

    status: Mapped[PendingStatus] = mapped_column(SAEnum(PendingStatus), index=True)
    target_type: Mapped[PendingTargetType] = mapped_column(SAEnum(PendingTargetType), index=True)
    target_id: Mapped[int] = mapped_column(BigInteger, index=True)

    title: Mapped[str] = mapped_column(String(200))
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    created_user_id: Mapped[int] = mapped_column(BigInteger, index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
