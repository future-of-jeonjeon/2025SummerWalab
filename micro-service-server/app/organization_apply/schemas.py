import enum
from typing import Optional
from pydantic import BaseModel
from app.user.schemas import UserData


class OrganizationApplyStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class OrganizationApplyCreate(BaseModel):
    name: str
    img_url: Optional[str] = None
    description: str


class OrganizationApplyResponse(BaseModel):
    id: str  # Redis Key UUID
    name: str
    img_url: Optional[str]
    description: str
    applicant_id: int
    applicant_name: str
    status: OrganizationApplyStatus = OrganizationApplyStatus.PENDING
    admin_comment: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class OrganizationApplyHandleRequest(BaseModel):
    status: OrganizationApplyStatus  # APPROVED or REJECTED
    admin_comment: Optional[str] = None
