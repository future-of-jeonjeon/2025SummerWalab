from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

import app.contest.service as serv
from app.config.database import get_session
from app.contest.schemas import *
from app.security.deps import get_userdata
from app.user.schemas import UserData
from app.utils.security import authorize_roles

router = APIRouter(prefix="/api/contest", tags=["contest"])


@router.get("", response_model=PaginatedContestResponse)
async def get_contest_list(
        page: int = 1,
        limit: int = 20,
        keyword: Optional[str] = None,
        rule_type: Optional[str] = None,
        status: Optional[str] = None,
        db: AsyncSession = Depends(get_session)):
    return await serv.get_contest_list_paginated(page, limit, keyword, rule_type, status, db)


@router.post("", response_model=ContestDataDTO, status_code=status.HTTP_201_CREATED)
@authorize_roles("Admin")
async def create_contest(
        create_contest_dto: ReqCreateContestDTO,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)):
    return await serv.create_contest(create_contest_dto, userdata, db)


@router.put("/", response_model=ContestDataDTO)
@authorize_roles("Admin")
async def update_contest(
        update_contest_dto: ReqUpdateContestDTO,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)):
    return await serv.update_contest(update_contest_dto, db)


@router.delete("/{contest_id}")
@authorize_roles("Admin")
async def delete_contest(
        contest_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)):
    await serv.delete_contest(contest_id, db)


@router.get("/all", response_model=PaginatedContestResponse)
@authorize_roles("Admin")
async def get_all_contests_admin(
        offset: int = 0,
        limit: int = 10,
        keyword: Optional[str] = None,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)):
    return await serv.get_all_contests_admin(offset, limit, keyword, userdata.user_id, userdata.admin_type, db)


@router.post("/add_problem_from_public")
@authorize_roles("Admin")
async def add_contest_problem_from_public(
        contest_problem_dto: ReqAddContestProblemDTO,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)):
    return await serv.add_contest_problem(contest_problem_dto, userdata, db)


@router.get("/participated", response_model=List[ContestDTO])
async def get_participated_contest_by_user(
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)):
    return await serv.get_participated_contest_by_user(userdata, db)


@router.get("/rank", response_model=List[ContestRankDTO])
async def get_contest_rank(
        contest_id: int,
        db: AsyncSession = Depends(get_session)):
    return await serv.get_contest_rank_public(contest_id, db)


@authorize_roles("Admin")
@router.get("/rank/all", response_model=List[ContestRankDTO])
async def get_contest_rank_all_data(
        contest_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)):
    return await serv.get_contest_rank_admin(contest_id, db)


@router.get("/{contest_id}", response_model=ContestDataDTO)
async def get_contest_detail(
        contest_id: int,
        db: AsyncSession = Depends(get_session)):
    return await serv.get_contest_detail(contest_id, db)
