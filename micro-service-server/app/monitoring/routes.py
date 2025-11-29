from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_session
from app.monitoring.schemas import MonitoringResponse
import app.monitoring.service as serv
from app.security.deps import get_userdata
from app.user.schemas import UserData
from app.utils.security import authorize_roles

router = APIRouter(prefix="/api/monitor", tags=["monitor"])


@authorize_roles("Admin")
@router.get("/judge-status", response_model=MonitoringResponse)
async def get_judge_server_data(
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session)) -> MonitoringResponse:
    return await serv.get_get_judge_server_data(db)
