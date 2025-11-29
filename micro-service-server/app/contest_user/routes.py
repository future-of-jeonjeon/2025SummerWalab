from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_session
from app.contest_user.schemas import (
    ContestUserDecisionRequest,
    ContestUserJoinRequest,
    ContestUserListResponse,
    ContestUserStatus,
    ContestUserDetail,
)
from app.contest_user import service as contest_user_service
from app.security.deps import get_userdata
from app.user.DTO import UserData

router = APIRouter(prefix="/api/contest-users", tags=["contest-user"])


@router.get("/{contest_id}/me", response_model=ContestUserStatus)
async def get_my_contest_membership(
    contest_id: int,
    userdata: UserData = Depends(get_userdata),
    db: AsyncSession = Depends(get_session),
):
    return await contest_user_service.get_membership_status(contest_id, userdata, db)


@router.post("/", response_model=ContestUserStatus)
async def join_contest(
    payload: ContestUserJoinRequest,
    userdata: UserData = Depends(get_userdata),
    db: AsyncSession = Depends(get_session),
):
    return await contest_user_service.join_contest(payload.contest_id, userdata, db)


@router.get("/{contest_id}/registrations", response_model=ContestUserListResponse)
async def list_contest_registrations(
    contest_id: int,
    userdata: UserData = Depends(get_userdata),
    db: AsyncSession = Depends(get_session),
):
    return await contest_user_service.list_contest_users(contest_id, userdata, db)


@router.post("/{contest_id}/decision", response_model=ContestUserDetail)
async def decide_contest_user(
    contest_id: int,
    payload: ContestUserDecisionRequest,
    userdata: UserData = Depends(get_userdata),
    db: AsyncSession = Depends(get_session),
):
    return await contest_user_service.decide_contest_user(contest_id, payload, userdata, db)
