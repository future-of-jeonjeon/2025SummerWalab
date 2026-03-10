from datetime import datetime
from typing import Union

from pydantic import BaseModel, Field

from app.common.page import Page
from app.pending.models import PendingStatus, PendingTargetType
from app.problem.schemas import ProblemResponse
from app.user.schemas import UserProfileResponse
from app.workbook.schemas import WorkbookResponse


class PendingResponse(BaseModel):
    status: PendingStatus
    target_type: PendingTargetType
    target_id: int
    title: str
    due_at: datetime | None = None
    created_user_data: UserProfileResponse
    target_data: Union[ProblemResponse, WorkbookResponse, None] = None
    completed_at: datetime | None = None
    completed_user_id: int | None = None

    class Config:
        from_attributes = True


class PendingPaginationResponse(Page[PendingResponse]):
    pending: list[PendingResponse] = Field(..., alias="items")
