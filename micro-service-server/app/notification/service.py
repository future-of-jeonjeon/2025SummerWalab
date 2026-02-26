from sqlalchemy.ext.asyncio import AsyncSession

from app.notification.models import *
from app.notification.schemas import *
from app.user.models import UserData
import app.notification.repository as notification_repo


async def get_user_notification(
        user_data: UserData,
        db: AsyncSession) -> list[NotificationResponse]:
    notifications_list: list[Notification] = await (notification_repo
                                                    .find_notifications_by_user_id(user_id=user_data.id, db=db))
    for notification in notifications_list:
        notification.is_checked = True
    notifications_response_list = [NotificationResponse.model_validate(notification) for notification in
                                   notifications_list]
    return notifications_response_list


async def add_user_notification(notification_data: NotificationCreateData, db: AsyncSession):
    entity = Notification(
        user_id=notification_data.user_id,
        payload=notification_data.payload.model_dump(),
        is_checked=False,
    )
    await notification_repo.save_notification(entity, db)
    return


async def count_user_unchecked_notification(
        user_data: UserData,
        db: AsyncSession) -> NotificationCheckResponse:
    notifications_list: list[Notification] = await  notification_repo.find_unchecked_notification_by_user_id(
        user_id=user_data.user_id, db=db)
    return NotificationCheckResponse(unchecked_num=len(notifications_list))
