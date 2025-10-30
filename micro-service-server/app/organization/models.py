from sqlalchemy import UniqueConstraint, Column, Integer, DateTime, func, String, Table, ForeignKey
from sqlalchemy.orm import relationship

from app.config.database import Base


micro_organization_member = Table(
    "micro_organization_member",
    Base.metadata,
    Column("organization_id", ForeignKey("public.micro_organization.id", ondelete="CASCADE"), primary_key=True),
    Column("member_id", ForeignKey("public.user.id", ondelete="CASCADE"), primary_key=True),
    UniqueConstraint("organization_id", "member_id", name="uq_micro_org_member_unique"),
    schema="public",
)


class Organization(Base):
    __tablename__ = "micro_organization"
    __table_args__ = (
        {"schema": "public"},
    )
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(String(100), nullable=False, index=True)
    created_at = Column("created_time", DateTime(timezone=True), server_default=func.now())
    updated_at = Column("updated_time", DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    members = relationship(
        "User",
        secondary="public.micro_organization_member",
        lazy="selectin",
        passive_deletes=True,
    )
