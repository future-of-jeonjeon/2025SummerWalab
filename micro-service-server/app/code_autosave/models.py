from typing import Optional
from sqlalchemy import String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


from app.common.base_entity import BaseEntity

class ProblemCode(BaseEntity, Base):
    __tablename__ = "micro_problem_code"
    __table_args__ = (
        UniqueConstraint('problem_id', 'user_id', 'language', name='uq_micro_problem_code_pul'),
        {"schema": "public"},
    )
    problem_id: Mapped[int] = mapped_column(ForeignKey("public.problem.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("public.user.id", ondelete="CASCADE"), nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(128), nullable=False)
    code: Mapped[Optional[str]] = mapped_column(Text)


class CustomCode(BaseEntity, Base):
    __tablename__ = "micro_custom_code"
    __table_args__ = (
        UniqueConstraint('user_id', 'file_name', name='uq_micro_custom_code_user_file_name'),
        {"schema": "public"},
    )
    file_name: Mapped[Optional[str]] = mapped_column(Text,nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("public.user.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[Optional[str]] = mapped_column(Text)
