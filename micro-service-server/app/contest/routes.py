from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

import app.contest.service as serv
from app.api.deps import get_database, get_database_readonly
from app.contest.schemas import *
from app.api.deps import get_userdata
from app.problem.schemas import ProblemResponse
from app.user.schemas import UserProfile
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
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.create_contest(create_contest_dto, user_profile, db)


@router.get("/organization/{organization_id}")
async def get_organization_contest_list(
        organization_id: int,
        page: int = Query(1, ge=1),
        size: int = Query(10, ge=1),
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.get_organization_contest_list(page, size, organization_id, user_profile, db)


@router.put("", response_model=ContestDataDTO)
async def update_contest(
        update_contest_dto: ReqUpdateContestDTO,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.update_contest(update_contest_dto, user_profile, db)


@router.delete("/{contest_id}")
async def delete_contest(
        contest_id: int,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    await serv.delete_contest(contest_id, user_profile, db)


@router.get("/all", response_model=PaginatedContestResponse)
@require_role("Admin")
async def get_all_contests_admin(
        page: int = Query(1, ge=1),
        size: int = Query(10, ge=1),
        keyword: Optional[str] = None,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.get_all_contests_admin(page, size, keyword, user_profile.user_id, user_profile.admin_type, db)


@router.post("/add_problem_from_public")
async def add_contest_problem_from_public(
        contest_problem_dto: ReqAddContestProblemDTO,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.add_contest_problem(contest_problem_dto, user_profile, db)


@router.get("/{contest_id}/problems", response_model=List[ContestProblemDTO])
async def get_contest_problems(
        contest_id: int,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.get_contest_problems(contest_id, user_profile, db)


@router.put("/{contest_id}/problems", status_code=status.HTTP_204_NO_CONTENT)
async def update_contest_problems(
        contest_id: int,
        payload: List[ContestProblemInputDTO],
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)) -> Response:
    await serv.update_contest_problems(contest_id, payload, user_profile, db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{contest_id}/problems/reindex", status_code=status.HTTP_204_NO_CONTENT)
async def update_contest_problems_display_ids_api(
        contest_id: int,
        problem_ids: list[ContestProblemInputDTO],
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)) -> Response:
    await serv.reindex_contest_problems(contest_id, problem_ids, user_profile, db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/participated", response_model=List[ContestDTO])
async def get_participated_contest_by_user(
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.get_participated_contest_by_user(user_profile, db)


@router.get("/{contest_id}", response_model=ContestDataDTO)
async def get_contest_detail(
        contest_id: int,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.get_contest_detail(contest_id, user_profile, db)


# ======================================================================================================================

@router.post("/{contest_id}/participants", response_model=ContestUserStatus)
async def join_contest(
        contest_id: int,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.join_contest(contest_id, user_profile, db)


@router.post("/{contest_id}/manage/participants", response_model=ContestUserStatus)
async def join_contest_by_user_id_api(
        contest_id: int,
        user_profile: UserProfile = Depends(get_userdata),
        user_id: int = Query(...),
        db: AsyncSession = Depends(get_database)):
    return await serv.join_contest_by_user_id(contest_id, user_profile, user_id, db)


@router.get("/{contest_id}/manage/participants/search", response_model=List[ContestManageUserSearchItem])
async def search_contest_participants_by_keyword_api(
        contest_id: int,
        keyword: str = Query(..., min_length=1),
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.search_contest_users_for_management(contest_id, keyword, user_profile, db)


@router.get("/{contest_id}/participants", response_model=ContestUserListResponse)
async def list_contest_participants(
        contest_id: int,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.list_contest_users(contest_id, user_profile, db)


@router.patch("/{contest_id}/participants/{user_id}", response_model=ContestUserDetail)
async def decide_contest_participant(
        contest_id: int,
        user_id: int,
        payload: ContestUserDecisionUpdate,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.decide_contest_user(contest_id, user_id, payload.action, user_profile, db)


@router.get("/{contest_id}/participants/me", response_model=ContestUserStatus)
async def get_my_contest_membership(
        contest_id: int,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.get_membership_status(contest_id, user_profile, db)


@router.get("/{contest_id}/policy", response_model=ContestApprovalPolicy)
async def get_contest_policy(
        contest_id: int,
        db: AsyncSession = Depends(get_database)):
    return await serv.get_approval_policy(contest_id, db)


@router.post("/{contest_id}/policy", response_model=ContestApprovalPolicy)
async def set_contest_policy(
        contest_id: int,
        payload: ContestApprovalPolicy,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.set_approval_policy(contest_id, payload.requires_approval, user_profile, db)


# ======================================================================================================================

@router.post("/{contest_id}/announcement", response_model=ContestAnnouncementResponse)
async def create_announcement(
        contest_id: int,
        request_data: CreateContestAnnouncementRequest,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.create_announcement(contest_id, request_data, user_profile, db)


@router.put("/{contest_id}/announcement/{announcement_id}", response_model=ContestAnnouncementResponse)
async def update_announcement(
        contest_id: int,
        announcement_id: int,
        request_data: UpdateContestAnnouncementRequest,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.update_announcement(contest_id, announcement_id, request_data, user_profile, db)


@router.delete("/{contest_id}/announcement/{announcement_id}")
async def delete_announcement(
        contest_id: int,
        announcement_id: int,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.delete_announcement(contest_id, announcement_id, user_profile, db)


@router.get("/{contest_id}/problem/{problem_id}", response_model=ProblemResponse)
async def get_contest_problem_api(
        contest_id: int,
        problem_id: int,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database_readonly)) -> ProblemResponse:
    return await serv.get_contest_problem(contest_id, problem_id, user_profile, db)


@router.get("/{contest_id}/me/progress", response_model=ContestProgressResponse)
async def get_contest_progress_api(
        contest_id: int,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database_readonly)) -> ContestProgressResponse:
    return await serv.get_contest_progress(contest_id, user_profile, db)
