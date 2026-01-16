from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Integer, String, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.core.database import Base
from app.problem.models import ProblemTag, problem_tags_association_table
from app.common.base_entity import BaseEntity

if TYPE_CHECKING:
    from app.problem.models import Problem

class Workbook(BaseEntity, Base):
    """문제집 모델"""
    __tablename__ = "micro_workbook"
    __table_args__ = {"schema": "public"}

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[Optional[str]] = mapped_column(String(100))
    created_by_id: Mapped[int] = mapped_column(Integer, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)

    problems: Mapped[List["WorkbookProblem"]] = relationship("WorkbookProblem", back_populates="workbook")


class WorkbookProblem(Base):
    """문제집에 포함된 문제 모델"""
    __tablename__ = "micro_workbook_problem"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    workbook_id: Mapped[int] = mapped_column(Integer, ForeignKey("public.micro_workbook.id", ondelete="CASCADE"), nullable=False)
    problem_id: Mapped[int] = mapped_column(Integer, ForeignKey("public.problem.id"), nullable=False)

    workbook: Mapped["Workbook"] = relationship("Workbook", back_populates="problems", passive_deletes=True)
    problem: Mapped["Problem"] = relationship("Problem", lazy="joined")
    tags: Mapped[List["ProblemTag"]] = relationship(
        "ProblemTag",
        secondary=problem_tags_association_table,
        primaryjoin=lambda: WorkbookProblem.problem_id == problem_tags_association_table.c.problem_id,
        secondaryjoin=lambda: ProblemTag.id == problem_tags_association_table.c.problemtag_id,
        lazy="joined",
        viewonly=True,
    )
