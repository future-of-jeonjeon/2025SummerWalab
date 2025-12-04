from sqlalchemy import Column, Integer, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from app.config.database import Base


class Submission(Base):
    __tablename__ = "submission"
    __table_args__ = {'schema': 'public', 'extend_existing': True}

    id = Column(Text, primary_key=True)
    create_time = Column(DateTime(timezone=True), nullable=False)
    result = Column(Integer, nullable=False)
    contest_id = Column(Integer, nullable=True)
    problem_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=False)
    info = Column(JSONB, nullable=True)
