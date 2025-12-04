from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

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
