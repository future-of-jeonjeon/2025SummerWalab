from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_userdata, get_database
from app.core.auth.guards import require_role
from app.pending.models import PendingStatus, PendingTargetType
from app.user.schemas import UserProfile

import app.pending.service as pending_service

router = APIRouter(prefix="/api/pending", tags=["pending"])


@require_role("Admin")
@router.post("/{pending_id}")
async def process_pending_api(
        pending_id: int,
        status: PendingStatus = Query(...),
        request_user: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await pending_service.process_pending(pending_id, status, request_user, db)


@require_role("Admin")
@router.post("")
async def get_pendings_api(
        target_type: PendingTargetType = Query(...),
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=250),
        request_user: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await pending_service.get_pending(target_type, page, size, db)
