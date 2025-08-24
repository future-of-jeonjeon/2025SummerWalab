from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, BigInteger
from sqlalchemy.sql import func
from app.config.database import Base


class Problem(Base):
    """OnlineJudge Problem 모델과 동일한 구조"""
    __tablename__ = "problem"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    input_description = Column(Text, nullable=False)
    output_description = Column(Text, nullable=False)
    samples = Column(Text, nullable=False)  # 실제로는 jsonb이지만 Text로 처리
    test_case_id = Column(Text, nullable=False)
    test_case_score = Column(Text, nullable=False)  # 실제로는 jsonb이지만 Text로 처리
    hint = Column(Text)
    languages = Column(Text, nullable=False)  # 실제로는 jsonb이지만 Text로 처리
    template = Column(Text, nullable=False)  # 실제로는 jsonb이지만 Text로 처리
    create_time = Column(DateTime(timezone=True), nullable=False)
    last_update_time = Column(DateTime(timezone=True))
    time_limit = Column(Integer, nullable=False)
    memory_limit = Column(Integer, nullable=False)
    spj = Column(Boolean, nullable=False)
    spj_language = Column(Text)
    spj_code = Column(Text)
    spj_version = Column(Text)
    rule_type = Column(Text, nullable=False)
    visible = Column(Boolean, nullable=False)
    difficulty = Column(Text, nullable=False)
    source = Column(Text)
    submission_number = Column(BigInteger, nullable=False)
    accepted_number = Column(BigInteger, nullable=False)
    created_by_id = Column(Integer, nullable=False)
    _id = Column(Text, nullable=False)
    statistic_info = Column(Text, nullable=False)  # 실제로는 jsonb이지만 Text로 처리
    total_score = Column(Integer, nullable=False)
    contest_id = Column(Integer)
    is_public = Column(Boolean, nullable=False)
    spj_compile_ok = Column(Boolean, nullable=False)
    io_mode = Column(Text, nullable=False)  # 실제로는 jsonb이지만 Text로 처리
    share_submission = Column(Boolean, nullable=False)
