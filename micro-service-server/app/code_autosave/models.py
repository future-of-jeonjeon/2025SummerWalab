from sqlalchemy import Column, Integer, String, DateTime, func, Text, ForeignKey, UniqueConstraint
from app.config.database import Base


class ProblemCode(Base):
    __tablename__ = "micro_problem_code"
    __table_args__ = (
        UniqueConstraint('problem_id', 'user_id', 'language', name='uq_micro_problem_code_pul'),
        {"schema": "public"},
    )

    id = Column(Integer, primary_key=True, index=True)

    problem_id = Column(ForeignKey("public.problem.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(ForeignKey("public.user.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(String(128), nullable=False)
    code = Column(Text)

    created_at = Column("created_time", DateTime(timezone=True), server_default=func.now())
    updated_at = Column("updated_time", DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
