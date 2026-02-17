from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

import app.contest.service as serv
from app.api.deps import get_database
from app.contest.schemas import *
from app.api.deps import get_userdata
from app.user.schemas import UserData
from app.core.auth.guards import require_role

router = APIRouter(prefix="/api/contest", tags=["contest"])


@router.get("", response_model=PaginatedContestResponse)
async def get_contest_list(
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1),
        keyword: Optional[str] = None,
        rule_type: Optional[str] = None,
        status: Optional[str] = None,
        db: AsyncSession = Depends(get_database)):
    return await serv.get_contest_list_paginated(page, size, keyword, rule_type, status, db)


@router.post("", response_model=ContestDataDTO, status_code=status.HTTP_201_CREATED)
async def create_contest(
        create_contest_dto: CreateContestRequest,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.create_contest(create_contest_dto, userdata, db)


@router.get("/organization/{organization_id}")
async def get_organization_contest_list(
        organization_id: int,
        page: int = Query(1, ge=1),
        size: int = Query(10, ge=1),
        db: AsyncSession = Depends(get_database)):
    return await serv.get_organization_contest_list(page, size, organization_id, db)


@router.put("", response_model=ContestDataDTO)
async def update_contest(
        update_contest_dto: ReqUpdateContestDTO,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.update_contest(update_contest_dto, userdata, db)


@router.delete("/{contest_id}")
async def delete_contest(
        contest_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    await serv.delete_contest(contest_id, userdata, db)


@router.get("/all", response_model=PaginatedContestResponse)
@require_role("Admin")
async def get_all_contests_admin(
        page: int = Query(1, ge=1),
        size: int = Query(10, ge=1),
        keyword: Optional[str] = None,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.get_all_contests_admin(page, size, keyword, userdata.user_id, userdata.admin_type, db)


@router.post("/add_problem_from_public")
@require_role("Admin")
async def add_contest_problem_from_public(
        contest_problem_dto: ReqAddContestProblemDTO,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.add_contest_problem(contest_problem_dto, userdata, db)


@router.get("/participated", response_model=List[ContestDTO])
async def get_participated_contest_by_user(
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.get_participated_contest_by_user(userdata, db)


@router.get("/{contest_id}", response_model=ContestDataDTO)
async def get_contest_detail(
        contest_id: int,
        db: AsyncSession = Depends(get_database)):
    return await serv.get_contest_detail(contest_id, db)


# ======================================================================================================================

@router.post("/{contest_id}/participants", response_model=ContestUserStatus)
async def join_contest(
        contest_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.join_contest(contest_id, userdata, db)


@router.get("/{contest_id}/participants", response_model=ContestUserListResponse)
async def list_contest_participants(
        contest_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.list_contest_users(contest_id, userdata, db)


@router.patch("/{contest_id}/participants/{user_id}", response_model=ContestUserDetail)
async def decide_contest_participant(
        contest_id: int,
        user_id: int,
        payload: ContestUserDecisionUpdate,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.decide_contest_user(contest_id, user_id, payload.action, userdata, db)


@router.get("/{contest_id}/participants/me", response_model=ContestUserStatus)
async def get_my_contest_membership(
        contest_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.get_membership_status(contest_id, userdata, db)


@router.get("/{contest_id}/policy", response_model=ContestApprovalPolicy)
async def get_contest_policy(
        contest_id: int,
        db: AsyncSession = Depends(get_database)):
    return await serv.get_approval_policy(contest_id, db)


@router.post("/{contest_id}/policy", response_model=ContestApprovalPolicy)
async def set_contest_policy(
        contest_id: int,
        payload: ContestApprovalPolicy,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.set_approval_policy(contest_id, payload.requires_approval, userdata, db)


# ======================================================================================================================

@router.post("/{contest_id}/announcement", response_model=ContestAnnouncementResponse)
async def create_announcement(
        contest_id: int,
        request_data: CreateContestAnnouncementRequest,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.create_announcement(contest_id, request_data, userdata, db)


@router.put("/{contest_id}/announcement/{announcement_id}", response_model=ContestAnnouncementResponse)
async def update_announcement(
        contest_id: int,
        announcement_id: int,
        request_data: UpdateContestAnnouncementRequest,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.update_announcement(contest_id, announcement_id, request_data, userdata, db)


@router.delete("/{contest_id}/announcement/{announcement_id}")
async def delete_announcement(
        contest_id: int,
        announcement_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.delete_announcement(contest_id, announcement_id, userdata, db)
