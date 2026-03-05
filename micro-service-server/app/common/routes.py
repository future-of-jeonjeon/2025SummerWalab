import datetime

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["common"])


@router.get("/")
async def root():
    return {"status": "ok", "message": "Service is running"}


@router.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
