from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_userdata, get_database_readonly, get_database
from app.user.schemas import UserProfile

import app.notification.service as notification_service

router = APIRouter(prefix="/api/notification", tags=["notifications"])


@router.get("")
async def get_user_notification_api(
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await notification_service.get_user_notification(user_profile, db)


@router.get("/check")
async def check_user_notification_api(
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database_readonly)):
    return await notification_service.count_user_unchecked_notification(user_profile, db)


@router.post("/read")
async def mark_all_notifications_as_read_api(
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    await notification_service.mark_all_as_read(user_profile, db)
    return