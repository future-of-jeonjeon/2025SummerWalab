from sqlalchemy import Column, DateTime, Integer, UniqueConstraint
from sqlalchemy.sql import func

from app.config.database import Base


class ContestUser(Base):
    __tablename__ = "micro_contest_user"
    __table_args__ = (
        UniqueConstraint("contest_id", "user_id", name="uq_micro_contest_user_contest_user"),
        {"schema": "public"},
    )

    id = Column(Integer, primary_key=True, index=True)
    contest_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    created_at = Column("created_time", DateTime(timezone=True), server_default=func.now(), nullable=False)


class Contest(Base):
    __tablename__ = "contest"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))
