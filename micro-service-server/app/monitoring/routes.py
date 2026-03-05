from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_database
from app.monitoring.schemas import MonitoringResponse
import app.monitoring.service as serv
from app.api.deps import get_userdata
from app.user.schemas import UserProfile
from app.core.auth.guards import require_role

router = APIRouter(prefix="/api/monitor", tags=["monitor"])


@require_role("Admin")
@router.get("/judge-status", response_model=MonitoringResponse)
async def get_judge_server_data(
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)) -> MonitoringResponse:
    return await serv.get_get_judge_server_data(db)
