from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_database, get_userdata
import app.execution.service as execution_service
from app.execution.schemas import *
from app.user.schemas import UserProfile

router = APIRouter(prefix="/api/execution", tags=["execution"])

MAX_CPU_TIME = 3000
MAX_MEMORY_MB = 128


@router.post("/run")
# @required_login() # 현재 guard 에서 에러 발생중
async def run_code(
        req: RunRequest,
        session: AsyncSession = Depends(get_database),
        user_profile: UserProfile = Depends(get_userdata)
):
    result = await execution_service.run_code_service(
        session=session,
        req=RunCodeRequest(
            language=req.language,
            src=req.code,
            stdin=req.input,
            max_cpu_time=MAX_CPU_TIME,
            max_memory_mb=MAX_MEMORY_MB
        )
    )
    return result
