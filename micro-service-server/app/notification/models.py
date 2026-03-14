from enum import Enum
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.common.base_entity import BaseEntity
from app.core.database import Base


class NotificationCategory(str, Enum):
    SYSTEM = "SYSTEM"
    ORGANIZATION = "ORGANIZATION"
    WORKBOOK = "WORKBOOK"
    PROBLEM = "PROBLEM"


class Notification(Base, BaseEntity):
    __tablename__ = "micro_notification"
    __table_args__ = {"schema": "public"}
    user_id: Mapped[int] = mapped_column(ForeignKey("public.user.id", ondelete="CASCADE"), nullable=False,
                                         default=False)
    category: Mapped[NotificationCategory] = mapped_column(
        SAEnum(NotificationCategory),
        index=True
    )
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    is_checked: Mapped[bool] = mapped_column(Boolean, nullable=False)
