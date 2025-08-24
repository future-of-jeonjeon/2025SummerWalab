from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.sql import func
from app.config.database import Base
from app.problem.models import Problem


class Workbook(Base):
    """문제집 모델"""
    __tablename__ = "workbook"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    created_by_id = Column(Integer, nullable=False, default=1)  # 하드코딩: user_id = 1
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 나중에 유저 정보를 받아올 때 활성화
    # creator = relationship("User", back_populates="workbooks", foreign_keys=[created_by_id])
    # problems = relationship("WorkbookProblem", back_populates="workbook")


class WorkbookProblem(Base):
    """문제집에 포함된 문제 모델"""
    __tablename__ = "workbook_problem"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    workbook_id = Column(Integer, ForeignKey("public.workbook.id"), nullable=False)
    problem_id = Column(Integer, ForeignKey("public.problem.id"), nullable=False)
    order = Column(Integer, nullable=False)  # order_index -> order로 변경
    added_time = Column(DateTime(timezone=True), server_default=func.now())  # created_at -> added_time으로 변경
    
    # 나중에 관계 설정이 필요할 때 활성화
    # workbook = relationship("Workbook", back_populates="problems")
    # problem = relationship("Problem")
