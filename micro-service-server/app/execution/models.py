from __future__ import annotations

from typing import Optional

from sqlalchemy import Column, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB

from app.config.database import Base



class SysOption(Base):
    __tablename__ = "options_sysoptions"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    key = Column(Text, unique=True, index=True, nullable=False)
    value = Column(JSONB, nullable=False)

    @staticmethod
    def get_value_sync(data: dict, key: str, default: Optional[object] = None):
        return data.get(key, default)
