from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


from app.common.base_entity import BaseEntity

class ContestUser(BaseEntity, Base):
    __tablename__ = "micro_contest_user"
    __table_args__ = (
        UniqueConstraint("contest_id", "user_id", name="uq_micro_contest_user_contest_user"),
        {"schema": "public"},
    )

    contest_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="approved")
    approved_by: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
