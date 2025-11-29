from starlette import status

import app.user.service as serv
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.user.schemas import UserData, SubUserData
from app.config.database import get_session
from app.security.deps import get_userdata

router = APIRouter(prefix="/api/user", tags=["User"])


@router.post("/check", status_code=status.HTTP_200_OK)
async def check_user_data(
        user_date: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)):
    await serv.check_user_data(user_date, db)
    return


@router.post("/data", response_model=SubUserData)
async def save_user_data(
        sub_user_data: SubUserData,
        user_date: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)) -> SubUserData:
    return await serv.save_user_data(sub_user_data, user_date, db)


@router.get("/data", response_model=SubUserData)
async def get_user_data(
        user_date: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)) -> SubUserData:
    return await serv.get_user_data(user_date, db)


@router.put("/data", response_model=SubUserData)
async def update_user_data(
        sub_user_data: SubUserData,
        user_date: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)) -> SubUserData:
    return await serv.update_user_data(sub_user_data, user_date, db)
