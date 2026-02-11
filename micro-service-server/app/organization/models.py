from typing import List
import enum

from sqlalchemy import String, ForeignKey, UniqueConstraint, Index, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship, backref

from app.core.database import Base
from app.common.base_entity import BaseEntity
from app.user.models import UserData


class OrganizationRole(str, enum.Enum):
    MEMBER = "MEMBER"
    ORG_ADMIN = "ORG_ADMIN"
    ORG_SUPER_ADMIN = "ORG_SUPER_ADMIN"


class Organization(BaseEntity, Base):
    __tablename__ = "micro_organization"
    __table_args__ = {"schema": "public"}

    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    img_url: Mapped[str] = mapped_column(String(512), nullable=True)
    description: Mapped[str] = mapped_column(String(100), nullable=False)

    member_links: Mapped[List["OrganizationMember"]] = relationship(
        "OrganizationMember",
        back_populates="organization",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
    )


class OrganizationMember(BaseEntity, Base):
    __tablename__ = "micro_organization_member"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_org_user"),
        Index("ix_org_member_org_id", "organization_id"),
        Index("ix_org_member_user_id", "user_id"),
        {"schema": "public"},
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("public.micro_organization.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("public.user.id", ondelete="CASCADE"),
        nullable=False,
    )

    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="member_links",
        lazy="selectin",
    )

    user: Mapped["UserData"] = relationship(
        "UserData",
        backref=backref("organization_links", lazy="selectin", viewonly=True),
        lazy="selectin",
        foreign_keys=[user_id],  
        primaryjoin="OrganizationMember.user_id == UserData.user_id", 
    )

    role: Mapped[OrganizationRole] = mapped_column(
        SAEnum(OrganizationRole, name="organization_role"),
        nullable=False,
        default=OrganizationRole.MEMBER,
    )
