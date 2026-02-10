from fastapi import APIRouter, Depends
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
        page: int = 1,
        limit: int = 20,
        keyword: Optional[str] = None,
        rule_type: Optional[str] = None,
        status: Optional[str] = None,
        db: AsyncSession = Depends(get_database)):
    return await serv.get_contest_list_paginated(page, limit, keyword, rule_type, status, db)


@router.post("", response_model=ContestDataDTO, status_code=status.HTTP_201_CREATED)
async def create_contest(
        create_contest_dto: CreateContestRequest,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.create_contest(create_contest_dto, userdata, db)


@router.put("/", response_model=ContestDataDTO)
@require_role("Admin")
async def update_contest(
        update_contest_dto: ReqUpdateContestDTO,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.update_contest(update_contest_dto, db)


@router.delete("/{contest_id}")
@require_role("Admin")
async def delete_contest(
        contest_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    await serv.delete_contest(contest_id, db)


@router.get("/all", response_model=PaginatedContestResponse)
@require_role("Admin")
async def get_all_contests_admin(
        offset: int = 0,
        limit: int = 10,
        keyword: Optional[str] = None,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await serv.get_all_contests_admin(offset, limit, keyword, userdata.user_id, userdata.admin_type, db)


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
