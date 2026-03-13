from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.notification.models import NotificationCategory

class NotificationPayload(BaseModel):
    message: str


class NotificationResponse(BaseModel):
    id: int
    payload: NotificationPayload
    category: NotificationCategory
    created_time: datetime
    is_checked: bool = False
    model_config = ConfigDict(from_attributes=True)


class NotificationCreateData(BaseModel):
    user_id: int
    payload: NotificationPayload
    category: NotificationCategory


class NotificationCheckResponse(BaseModel):
    unchecked_num: int
