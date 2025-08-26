from datetime import datetime

from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.dialects.postgresql import JSONB  # PostgreSQL의 JSONB 타입 사용
from sqlalchemy.orm import relationship

# Base는 app.config.database.py에서 정의된 것을 사용합니다.
from app.config.database import Base

# User 모델은 app.user.models.py에서 임포트합니다.

# Many-to-Many 관계를 위한 중간 테이블 정의
# 'public' 스키마를 명시하여 정확한 테이블 참조
problem_tags_association_table = Table(
    'problem_tags', Base.metadata, # <--- 이 부분을 'problem_tags'로 변경합니다!
    Column('problem_id', Integer, ForeignKey('public.problem.id'), primary_key=True),
    Column('problemtag_id', Integer, ForeignKey('public.problem_tag.id'), primary_key=True),
    schema='public' # 중간 테이블도 public 스키마에 있다고 가정
)



class ProblemTag(Base):
    __tablename__ = 'problem_tag'
    __table_args__ = {'schema': 'public'}  # problem_tag 테이블도 public 스키마에 있다고 가정
    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, unique=True, index=True, nullable=False)


class Problem(Base):
    __tablename__ = 'problem'
    __table_args__ = {'schema': 'public'}  # problem 테이블도 public 스키마에 있다고 가정

    id = Column(Integer, primary_key=True, index=True)
    _id = Column(Text, unique=True, index=True, nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    input_description = Column(Text, nullable=False)
    output_description = Column(Text, nullable=False)
    samples = Column(JSONB, nullable=False)  # JSONB 사용
    test_case_id = Column(Text, nullable=False)
    test_case_score = Column(JSONB)  # JSONB 사용
    hint = Column(Text)
    languages = Column(JSONB, nullable=False)  # JSONB 사용
    template = Column(JSONB, nullable=False)  # JSONB 사용
    create_time = Column(DateTime, nullable=False, default=datetime.now)
    last_update_time = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # created_by_id가 User 테이블의 id를 참조하도록 설정
    created_by_id = Column(Integer, ForeignKey('public.user.id'), nullable=False)  # 'public.user.id'로 정확히 참조
    created_by = relationship("User", back_populates="created_problems")  # 양방향 관계 설정

    time_limit = Column(Integer, nullable=False)
    memory_limit = Column(Integer, nullable=False)
    io_mode = Column(JSONB, nullable=False)  # JSONB 사용

    spj = Column(Boolean, nullable=False)
    spj_language = Column(Text)
    spj_code = Column(Text)
    spj_version = Column(Text)
    spj_compile_ok = Column(Boolean, nullable=False)
    rule_type = Column(Text, nullable=False)
    visible = Column(Boolean, nullable=False, default=True)
    difficulty = Column(Text)
    source = Column(Text)
    total_score = Column(Integer, nullable=False, default=0)
    submission_number = Column(Integer, nullable=False, default=0)
    accepted_number = Column(Integer, nullable=False, default=0)
    statistic_info = Column(JSONB, nullable=False, default={})  # JSONB 사용
    share_submission = Column(Boolean, nullable=False, default=False)

    # is_public 컬럼에 server_default='FALSE'를 추가합니다.
    is_public = Column(Boolean, nullable=False, default=True, server_default='FALSE')

    tags = relationship("ProblemTag", secondary=problem_tags_association_table, backref="problems")
