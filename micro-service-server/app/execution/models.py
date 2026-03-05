from __future__ import annotations
from typing import Optional, Any
from sqlalchemy import Text, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base





class SysOption(Base):
    __tablename__ = "options_sysoptions"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(Text, unique=True, index=True, nullable=False)
    value: Mapped[Any] = mapped_column(JSONB, nullable=False)

    @staticmethod
    def get_value_sync(data: dict, key: str, default: Optional[object] = None):
        return data.get(key, default)
