from starlette import status

import app.user.service as serv
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.user.schemas import UserProfile, UserProfileResponse, UpdateUserProfileRequest
from app.api.deps import get_userdata, get_database
from app.core.auth.guards import require_role

router = APIRouter(prefix="/api/user", tags=["User"])


@router.post("/check", status_code=status.HTTP_200_OK)
async def check_user_data(
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    await serv.check_user_data(user_profile, db)
    return


@router.post("/data", response_model=UserProfileResponse)
async def save_user_data(
        user_profile_payload: UpdateUserProfileRequest,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)) -> UserProfileResponse:
    return await serv.save_user_data(user_profile_payload, user_profile, db)


@router.get("/data", response_model=UserProfileResponse)
async def get_user_data(
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)) -> UserProfileResponse:
    return await serv.get_user_data(user_profile, db)


@require_role("Admin")
@router.get("/data/{user_id}", response_model=UserProfileResponse)
async def get_user_data_by_id(
        user_id: int,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)) -> UserProfileResponse:
    return await serv.get_user_data_by_id(user_id, db)


@router.put("/data", response_model=UserProfileResponse)
async def update_user_data(
        user_profile_payload: UpdateUserProfileRequest,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)) -> UserProfileResponse:
    return await serv.update_user_data(user_profile_payload, user_profile, db)
