from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_database
import app.rank.service as serv

router = APIRouter(prefix="/api/rank", tags=["rank"])

@router.get("/organization")
async def get_organization_rank(
    limit: int = Query(25, ge=1),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_database),
):
    return await serv.get_organization_rank(limit, offset, db)


@router.get("/contest/{contest_id}")
async def get_contest_user_rank(
    contest_id: int,
    db: AsyncSession = Depends(get_database),
):
    return await serv.get_contest_user_rank(contest_id, db)
