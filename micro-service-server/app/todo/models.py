from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from sqlalchemy import BigInteger, Date, DateTime, Enum as SAEnum, ForeignKey, Integer, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.base_entity import BaseEntity
from app.core.database import Base


class GoalPeriod(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class GoalType(str, Enum):
    SOLVE_COUNT = "SOLVE_COUNT"
    ATTENDANCE = "ATTENDANCE"
    TIER_SOLVE = "TIER_SOLVE"


GOAL_PERIOD_ENUM = SAEnum(
    GoalPeriod,
    name="goal_period_enum",
    values_callable=lambda enum_cls: [item.value for item in enum_cls],
    validate_strings=True,
)

GOAL_TYPE_ENUM = SAEnum(
    GoalType,
    name="goal_type_enum",
    values_callable=lambda enum_cls: [item.value for item in enum_cls],
    validate_strings=True,
)


class Todo(BaseEntity, Base):
    __tablename__ = "micro_todo"
    __table_args__ = {"schema": "public"}

    user_id: Mapped[int] = mapped_column(
        ForeignKey("public.user.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    last_attendance_on: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)

    user = relationship("User", backref="todos", uselist=False)
    goals = relationship("Goal", back_populates="todo", cascade="all, delete-orphan")
    results = relationship("TodoResult", back_populates="todo", cascade="all, delete-orphan")


class Goal(BaseEntity, Base):
    __tablename__ = "micro_goal"
    __table_args__ = {"schema": "public"}

    todo_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("public.micro_todo.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period: Mapped[GoalPeriod] = mapped_column(
        GOAL_PERIOD_ENUM,
        nullable=False,
        index=True,
    )
    type: Mapped[GoalType] = mapped_column(
        GOAL_TYPE_ENUM,
        nullable=False,
        index=True,
    )
    target_count: Mapped[int] = mapped_column(Integer, nullable=False)
    count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    difficulty: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    custom_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    start_day: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_day: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    todo = relationship("Todo", back_populates="goals")


class TodoResult(BaseEntity, Base):
    __tablename__ = "micro_todoresult"
    __table_args__ = (
        UniqueConstraint("goal_id", "start_day", "end_day", name="uq_micro_todoresult_goal_period"),
        {"schema": "public"},
    )

    todo_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("public.micro_todo.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    goal_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    period: Mapped[GoalPeriod] = mapped_column(
        GOAL_PERIOD_ENUM,
        nullable=False,
        index=True,
    )
    type: Mapped[GoalType] = mapped_column(
        GOAL_TYPE_ENUM,
        nullable=False,
        index=True,
    )
    target_count: Mapped[int] = mapped_column(Integer, nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False)
    difficulty: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    custom_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    start_day: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_day: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    is_success: Mapped[bool] = mapped_column(nullable=False, default=False, server_default=text("false"))
    archived_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    todo = relationship("Todo", back_populates="results")
