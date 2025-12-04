from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import app.contest.service as serv
from app.config.database import get_session
from app.contest.schemas import ContestDTO, ContestRankDTO
from app.security.deps import get_userdata
from app.user.schemas import UserData
from app.utils.security import authorize_roles

router = APIRouter(prefix="/api/contest", tags=["contest"])


@router.get("/participated", response_model=List[ContestDTO])
async def get_participated_contest_by_user(
        user_date: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)):
    return await serv.get_participated_contest_by_user(user_date, db)


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
