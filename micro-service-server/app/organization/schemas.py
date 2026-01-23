from typing import Optional
from pydantic import BaseModel
from app.organization.models import OrganizationRole, Organization, OrganizationMember
from app.user.schemas import SubUserData


class OrganizationMemberResponse(BaseModel):
    id: int
    organization_id: int
    user: SubUserData
    role: OrganizationRole

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, entity: OrganizationMember):
        return cls(
            id=entity.id,
            organization_id=entity.organization_id,
            user=SubUserData.from_orm(entity.user),
            role=entity.role
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
    img_url: Optional[str]
    description: Optional[str]


class OrganizationUpdateRequest(BaseModel):
    name: Optional[str]
    img_url: Optional[str]
    description: Optional[str]
