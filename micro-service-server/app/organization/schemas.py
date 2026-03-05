from typing import Optional
from pydantic import BaseModel
from app.organization.models import OrganizationRole, Organization, OrganizationMember
from app.user.schemas import UserProfile


class OrganizationMemberResponse(BaseModel):
    id: int
    organization_id: int
    user: UserProfile
    role: OrganizationRole

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, entity: OrganizationMember):
        return cls(
            id=entity.id,
            organization_id=entity.organization_id,
            user=UserProfile(
                user_id=entity.user.user.id,
                username=entity.user.user.username,
                avatar="",
                admin_type=entity.user.user.admin_type
            ),
            role=entity.role
        )

class OrganizationListResponse(BaseModel):
    id: int
    img_url: Optional[str]
    name: str
    description: Optional[str]

    @classmethod
    def from_orm(cls, entity: Organization) -> "OrganizationListResponse":
        return cls(
            id=entity.id,
            img_url=entity.img_url,
            name=entity.name,
            description=entity.description,
        )

class OrganizationResponse(BaseModel):
    id: int
    img_url: Optional[str]
    name: str
    description: Optional[str]
    members: list[OrganizationMemberResponse]

    @classmethod
    def from_orm(cls, entity: Organization) -> "OrganizationResponse":
        return cls(
            id=entity.id,
            img_url=entity.img_url,
            name=entity.name,
            description=entity.description,
            members=[
                OrganizationMemberResponse.from_orm(member)
                for member in entity.member_links
            ]
        )


class OrganizationMemberUpdateRequest(BaseModel):
    user_id: int
    role: int  # | 0 USER | 1 ADMIN | 2 SUPER ADMIN |


class OrganizationCreateRequest(BaseModel):
    name: str
    img_url: Optional[str] = None
    description: Optional[str] = None


class OrganizationUpdateRequest(BaseModel):
    name: Optional[str] = None
    img_url: Optional[str] = None
    description: Optional[str] = None
