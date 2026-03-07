from datetime import datetime

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from app.common.page import Page


class ContestProblemInputDTO(BaseModel):
    problem_id: int
    display_id: str


class ContestDTO(BaseModel):
    contest_id: int
    title: str
    start_time: datetime
    end_time: datetime


class ContestCreatedByDTO(BaseModel):

    id: int
    username: str
    realName: Optional[str] = None


class ContestDataDTO(BaseModel):
    id: int
    title: str
    description: str
    startTime: datetime
    endTime: datetime
    createTime: datetime
    ruleType: str
    visible: bool
    real_time_rank: bool
    allowed_ip_ranges: list[str]
    password: Optional[str] = None
    status: str
    createdBy: ContestCreatedByDTO
    participants: int
    languages: list[str]
    problemCount: int = 0
    is_organization_only: bool = False
    requires_approval: bool = False
    organization_id: Optional[int] = None
    organization_name: Optional[str] = None


class CreateContestRequest(BaseModel):
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    rule_type: str
    password: Optional[str] = None
    visible: bool
    real_time_rank: bool
    allowed_ip_ranges: list[str]
    is_organization_only: bool = False
    requires_approval: Optional[bool] = False
    languages: list[str]
    organization_id:int
    problems: Optional[List[ContestProblemInputDTO]] = []


class ReqUpdateContestDTO(BaseModel):
    id: int
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    rule_type: str
    password: Optional[str] = None
    visible: bool
    real_time_rank: bool
    allowed_ip_ranges: list[str]
    requires_approval: Optional[bool] = False
    is_organization_only: Optional[bool] = None
    languages: list[str]
    organization_id: int
    problems: Optional[List[ContestProblemInputDTO]] = []


class ReqAddContestProblemDTO(BaseModel):
    contest_id: int
    problem_id: int
    display_id: str


class ContestProblemDTO(BaseModel):
    id: int
    display_id: str = Field(..., alias="_id")
    title: str
    difficulty: Optional[str] = None
    submission_number: int = 0
    accepted_number: int = 0
    status: int = 0

    class Config:
        populate_by_name = True
    

class PaginatedContestResponse(Page[ContestDataDTO]):
    results: List[ContestDataDTO] = Field(..., alias="items")


ParticipationStatus = Literal["approved", "pending", "rejected"]


class ContestUserJoinRequest(BaseModel):
    contest_id: int = Field(..., gt=0)


class ContestUserStatus(BaseModel):
    contest_id: int
    user_id: int
    joined: bool
    joined_at: datetime | None = None
    is_admin: bool = False
    status: ParticipationStatus | None = None
    requires_approval: bool = False


class ContestApprovalPolicy(BaseModel):
    contest_id: int
    requires_approval: bool


class ContestUserDetail(BaseModel):
    user_id: int
    username: str | None = None
    status: ParticipationStatus
    applied_at: datetime | None = None
    decided_at: datetime | None = None
    decided_by: int | None = None


class ContestUserListResponse(BaseModel):
    approved: list[ContestUserDetail]
    pending: list[ContestUserDetail]


class ContestUserDecisionRequest(BaseModel):
    user_id: int
    action: Literal["approve", "reject"]


class ContestUserDecisionUpdate(BaseModel):
    action: Literal["approve", "reject"]


class ContestProgressResponse(BaseModel):
    total: int = Field(..., ge=0)
    solved: int = Field(..., ge=0)
    total_score: int = Field(..., ge=0)


class CreateContestAnnouncementRequest(BaseModel):
    title: str
    content: str
    visible: bool = True


class UpdateContestAnnouncementRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    visible: Optional[bool] = None


class ContestAnnouncementResponse(BaseModel):
    id: int
    contest_id: int
    title: str
    content: str
    visible: bool
    created_at: datetime
    updated_at: datetime
    created_by: str

    @classmethod
    def from_entity(cls, entity, creator) -> "ContestAnnouncementResponse":
        return cls(
            id=entity.id,
            contest_id=entity.contest_id,
            title=entity.title,
            content=entity.content,
            visible=entity.visible,
            created_at=entity.create_time,
            updated_at=entity.create_time,
            created_by=str
        )
