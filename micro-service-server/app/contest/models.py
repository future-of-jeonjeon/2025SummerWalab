from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB

from app.config.database import Base


class Contest(Base):
    __tablename__ = "contest"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    real_time_rank = Column(Boolean, nullable=False)
    password = Column(Text, nullable=True)
    rule_type = Column(Text, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    create_time = Column(DateTime(timezone=True), nullable=False)
    last_update_time = Column(DateTime(timezone=True), nullable=False)
    visible = Column(Boolean, nullable=False)
    created_by_id = Column(Integer, ForeignKey("public.user.id"), nullable=False)
    allowed_ip_ranges = Column(JSONB, nullable=False)


class AbstractContestRank(Base):
    __abstract__ = True
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.user.id"), nullable=False)
    contest_id = Column(Integer, ForeignKey("public.contest.id"), nullable=False)
    submission_number = Column(Integer, default=0)


class ACMContestRank(AbstractContestRank):
    __tablename__ = "acm_contest_rank"
    accepted_number = Column(Integer, default=0)
    total_time = Column(Integer, default=0)
    submission_info = Column(JSONB, default=dict)


class OIContestRank(AbstractContestRank):
    __tablename__ = "oi_contest_rank"
    total_score = Column(Integer, default=0)
    submission_info = Column(JSONB, default=dict)
