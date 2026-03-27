from typing import Any

from sqlalchemy import String, ForeignKey, Integer, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.common.base_entity import BaseEntity
from app.user.models import User


class Todo(BaseEntity, Base):
    __tablename__ = "micro_todo"
    __table_args__ = {"schema": "public"}

    user_id: Mapped[int] = mapped_column(
        ForeignKey("public.user.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    day_todo: Mapped[str] = mapped_column(String(255), nullable=True)
    week_todo: Mapped[str] = mapped_column(String(255), nullable=True)
    month_todo: Mapped[str] = mapped_column(String(255), nullable=True)
    custom_todo: Mapped[str] = mapped_column(String(255), nullable=True)
    goals: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'::jsonb"),
    )

    user = relationship("User", backref="todos", uselist=False)
