from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_session
import app.organization_ranking.service as serv

router = APIRouter(prefix="/api/organization_rank", tags=["organization_rank"])

@router.get("/")
async def get_organization_rank(
    limit: int = Query(25, ge=1),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_session),
):
    return await serv.get_organization_rank(limit, offset, db)
