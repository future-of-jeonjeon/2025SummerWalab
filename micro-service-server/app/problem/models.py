from datetime import datetime
from typing import TYPE_CHECKING, List, Optional, Any

from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey, Table, func
from sqlalchemy.dialects.postgresql import JSONB  # PostgreSQL의 JSONB 타입 사용
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.core.database import Base

if TYPE_CHECKING:
    from app.user.models import User

# Many-to-Many 관계를 위한 중간 테이블 정의
# 'public' 스키마를 명시하여 정확한 테이블 참조
problem_tags_association_table = Table(
    'problem_tags', Base.metadata,
    Column('problem_id', Integer, ForeignKey('public.problem.id', ondelete='CASCADE'), primary_key=True),
    Column('problemtag_id', Integer, ForeignKey('public.problem_tag.id', ondelete='CASCADE'), primary_key=True),
    schema='public' # 중간 테이블도 public 스키마에 있다고 가정
)



class ProblemTag(Base):
    __tablename__ = 'problem_tag'
    __table_args__ = {'schema': 'public'}  # problem_tag 테이블도 public 스키마에 있다고 가정
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(Text, unique=True, index=True, nullable=False)




class Problem(Base):
    __tablename__ = 'problem'
    __table_args__ = {'schema': 'public'}  # problem 테이블도 public 스키마에 있다고 가정

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)

    _id: Mapped[str] = mapped_column(Text, unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    input_description: Mapped[str] = mapped_column(Text, nullable=False)
    output_description: Mapped[str] = mapped_column(Text, nullable=False)
    samples: Mapped[list] = mapped_column(JSONB, nullable=False)
    test_case_id: Mapped[str] = mapped_column(Text, nullable=False)
    test_case_score: Mapped[Optional[dict | list | Any]] = mapped_column(JSONB)
    hint: Mapped[Optional[str]] = mapped_column(Text)
    languages: Mapped[list] = mapped_column(JSONB, nullable=False)
    template: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # created_by_id가 User 테이블의 id를 참조하도록 설정
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey('public.user.id'), nullable=False)
    created_by: Mapped["User"] = relationship("User", back_populates="created_problems")
    contest_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('public.contest.id'), nullable=True)

    time_limit: Mapped[int] = mapped_column(Integer, nullable=False)
    memory_limit: Mapped[int] = mapped_column(Integer, nullable=False)
    io_mode: Mapped[dict] = mapped_column(JSONB, nullable=False)

    spj: Mapped[bool] = mapped_column(Boolean, nullable=False)
    spj_language: Mapped[Optional[str]] = mapped_column(Text)
    spj_code: Mapped[Optional[str]] = mapped_column(Text)
    spj_version: Mapped[Optional[str]] = mapped_column(Text)
    spj_compile_ok: Mapped[bool] = mapped_column(Boolean, nullable=False)
    rule_type: Mapped[str] = mapped_column(Text, nullable=False)
    visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now())
    last_update_time: Mapped[datetime] = mapped_column(DateTime(timezone=False), onupdate=func.now())
    difficulty: Mapped[Optional[str]] = mapped_column(Text)
    source: Mapped[Optional[str]] = mapped_column(Text)
    total_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    submission_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    accepted_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    statistic_info: Mapped[dict] = mapped_column(JSONB, nullable=False, default={})
    share_submission: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # is_public 컬럼에 server_default='FALSE'를 추가합니다.
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default='FALSE')

    tags: Mapped[List["ProblemTag"]] = relationship("ProblemTag", secondary=problem_tags_association_table, backref="problems")
