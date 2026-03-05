from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict


class NotificationPayload(BaseModel):
    title: str
    message: str
    link: Optional[str] = None


class NotificationResponse(BaseModel):
    id: int
    payload: NotificationPayload
    created_time: datetime
    is_checked: bool = False
    model_config = ConfigDict(from_attributes=True)


class NotificationCreateData(BaseModel):
    user_id: int
    payload: NotificationPayload


class NotificationCheckResponse(BaseModel):
    unchecked_num: int
