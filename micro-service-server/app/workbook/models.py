from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.config.database import Base
from app.problem.models import Problem


class Workbook(Base):
    """문제집 모델"""
    __tablename__ = "micro_workbook"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    created_by_id = Column(Integer, nullable=False)
    is_public = Column(Boolean, default=False)
    created_at = Column("created_time", DateTime(timezone=True), server_default=func.now())
    updated_at = Column("updated_time", DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    problems = relationship("WorkbookProblem", back_populates="workbook")


class WorkbookProblem(Base):
    """문제집에 포함된 문제 모델"""
    __tablename__ = "micro_workbook_problem"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    workbook_id = Column(Integer, ForeignKey("public.micro_workbook.id"), nullable=False)
    problem_id = Column(Integer, ForeignKey("public.problem.id"), nullable=False)

    workbook = relationship("Workbook", back_populates="problems")
    problem = relationship("Problem")
