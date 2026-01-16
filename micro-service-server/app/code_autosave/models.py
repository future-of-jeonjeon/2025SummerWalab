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

    # id = Column(Integer, primary_key=True, index=True)

    problem_id: Mapped[int] = mapped_column(ForeignKey("public.problem.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("public.user.id", ondelete="CASCADE"), nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(128), nullable=False)
    code: Mapped[Optional[str]] = mapped_column(Text)

    # created_at = Column("created_time", DateTime(timezone=True), server_default=func.now())
    # updated_at = Column("updated_time", DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
