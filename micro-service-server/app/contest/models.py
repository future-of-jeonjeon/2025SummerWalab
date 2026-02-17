from datetime import datetime
from sqlalchemy import func
from typing import Optional

from sqlalchemy import Integer, Text, Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.common.base_entity import BaseEntity


class Contest(Base):
    __tablename__ = "contest"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    real_time_rank: Mapped[bool] = mapped_column(Boolean, nullable=False)
    password: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rule_type: Mapped[str] = mapped_column(Text, nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now())
    last_update_time: Mapped[datetime] = mapped_column(DateTime(timezone=False), onupdate=func.now())
    visible: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("public.user.id"), nullable=False)
    allowed_ip_ranges: Mapped[list] = mapped_column(JSONB, nullable=False)


class AbstractContestRank(Base):
    __abstract__ = True
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("public.user.id"), nullable=False)
    contest_id: Mapped[int] = mapped_column(Integer, ForeignKey("public.contest.id"), nullable=False)
    submission_number: Mapped[int] = mapped_column(Integer, default=0)


class ACMContestRank(AbstractContestRank):
    __tablename__ = "acm_contest_rank"
    accepted_number: Mapped[int] = mapped_column(Integer, default=0)
    total_time: Mapped[int] = mapped_column(Integer, default=0)
    submission_info: Mapped[dict] = mapped_column(JSONB, default=dict)


class OIContestRank(AbstractContestRank):
    __tablename__ = "oi_contest_rank"
    total_score: Mapped[int] = mapped_column(Integer, default=0)
    submission_info: Mapped[dict] = mapped_column(JSONB, default=dict)


class ContestLanguage(BaseEntity, Base):
    __tablename__ = "micro_contest_language"
    __table_args__ = {"schema": "public"}
    contest_id: Mapped[int] = mapped_column(Integer, ForeignKey("public.contest.id"), nullable=False)
    languages: Mapped[list] = mapped_column(JSONB, nullable=False)


class OrganizationContest(BaseEntity, Base):
    __tablename__ = "micro_organization_contest"
    __table_args__ = {"schema": "public"}

    contest_id: Mapped[int] = mapped_column(Integer, ForeignKey("public.contest.id"), nullable=False)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("public.micro_organization.id"), nullable=False)
    is_organization_only: Mapped[bool] = mapped_column(Boolean, nullable=False)


class ContestUser(BaseEntity, Base):
    __tablename__ = "micro_contest_user"
    __table_args__ = (
        UniqueConstraint("contest_id", "user_id", name="uq_micro_contest_user_contest_user"),
        {"schema": "public"},
    )

    contest_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="approved")
    approved_by: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class ContestAnnouncement(Base):
    __tablename__ = "contest_announcement"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    contest_id: Mapped[int] = mapped_column(Integer, ForeignKey("public.contest.id"), nullable=False, index=True)
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("public.user.id"), nullable=False, index=True)
    visible: Mapped[bool] = mapped_column(Boolean, nullable=False)
