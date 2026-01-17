from typing import TYPE_CHECKING, List

from sqlalchemy import Column, String, Table, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.core.database import Base

if TYPE_CHECKING:
    from app.user.models import User

micro_organization_member = Table(
    "micro_organization_member",
    Base.metadata,
    Column("organization_id", ForeignKey("public.micro_organization.id", ondelete="CASCADE"), primary_key=True),
    Column("member_id", ForeignKey("public.user.id", ondelete="CASCADE"), primary_key=True),
    schema="public",
)


from app.common.base_entity import BaseEntity

class Organization(BaseEntity, Base):
    __tablename__ = "micro_organization"
    __table_args__ = (
        {"schema": "public"},
    )
    # id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # created_at = Column("created_time", DateTime(timezone=True), server_default=func.now())
    # updated_at = Column("updated_time", DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    members: Mapped[List["User"]] = relationship(
        "User",
        secondary="public.micro_organization_member",
        lazy="selectin",
        passive_deletes=True,
    )
