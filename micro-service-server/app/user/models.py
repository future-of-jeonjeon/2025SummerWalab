from datetime import datetime
from sqlalchemy import func
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.core.database import Base
from app.common.base_entity import BaseEntity

if TYPE_CHECKING:
    from app.problem.models import Problem

DEFAULT_LANGUAGE_PREFERENCES = ["c", "cpp", "python", "java", "javascript", "go"]


class User(Base):
    __tablename__ = "user"
    __table_args__ = {'schema': 'public'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now())
    password: Mapped[str] = mapped_column(String(128), nullable=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    username: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    admin_type: Mapped[str] = mapped_column(Text, nullable=False)
    reset_password_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reset_password_token_expire_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    auth_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    two_factor_auth: Mapped[bool] = mapped_column(Boolean, nullable=False)
    tfa_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    open_api: Mapped[bool] = mapped_column(Boolean, nullable=False)
    open_api_appkey: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_disabled: Mapped[bool] = mapped_column(Boolean, nullable=False)
    problem_permission: Mapped[str] = mapped_column(Text, nullable=False)
    session_keys: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_problems: Mapped[List["Problem"]] = relationship("Problem", back_populates="created_by")


class UserData(BaseEntity, Base):
    __tablename__ = "micro_userdata"
    __table_args__ = {'schema': 'public'}

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("public.user.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    student_id: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    major_id: Mapped[int] = mapped_column(Integer, nullable=False)
    user: Mapped["User"] = relationship("User", lazy="selectin")

    dark_mode_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    language_preferences: Mapped[list[str]] = mapped_column(JSONB, nullable=False,
                                                            default=lambda: DEFAULT_LANGUAGE_PREFERENCES.copy())
