from __future__ import annotations
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.database import get_session
from app.execution.service import ExecutionService

router = APIRouter(prefix="/api/execution", tags=["execution"])

MAX_CPU_TIME = 5000
MAX_MEMORY_MB = 512

class RunRequest(BaseModel):
    language: str = Field(..., description="Language name : Python3, C, C++, JavaScript, Golang")
    code: str = Field(..., description="Source code to execute")
    input: str = Field("", description="Stdin for the program")

@router.post("/run")
async def run_code(req: RunRequest, session: AsyncSession = Depends(get_session)):
    svc = ExecutionService(session)
    result = await svc.run_code(
        language=req.language,
        src=req.code,
        stdin=req.input,
        max_cpu_time=MAX_CPU_TIME,
        max_memory_mb=MAX_MEMORY_MB,
    )
    return result
