from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_database, get_userdata
from app.core.auth.guards import require_role
from app.user.schemas import UserProfile
from app.organization_apply import service
from app.organization_apply.schemas import (
    OrganizationApplyCreate, 
    OrganizationApplyResponse, 
    OrganizationApplyHandleRequest
)

router = APIRouter(prefix="/api/organization/apply", tags=["Organization Apply"])


@router.post("")
async def create_organization_application(
    payload: OrganizationApplyCreate,
    user_profile: UserProfile = Depends(get_userdata)
):
    """일반 유저가 단체 신청서를 작성하여 Redis에 저장합니다."""
    apply_id = await service.create_apply(payload, user_profile.user_id, user_profile.username)
    return {"apply_id": apply_id, "message": "단체 신청이 접수되었습니다. 관리자 승인 후 생성됩니다."}


@router.get("/list", response_model=List[OrganizationApplyResponse])
@require_role("Admin")
async def get_organization_applications(
    user_profile: UserProfile = Depends(get_userdata)
):
    """관리자가 Redis에 저장된 단체 신청 목록을 조회합니다."""
    # Note: Redis implementation here doesn't support easy offset pagination yet, 
    # returning full list for now as expected volume is low.
    return await service.get_applies()


@router.post("/{apply_id}/handle")
@require_role("Admin")
async def handle_organization_application(
    apply_id: str,
    payload: OrganizationApplyHandleRequest,
    user_profile: UserProfile = Depends(get_userdata),
    db: AsyncSession = Depends(get_database)
):
    """관리자가 단체 신청을 승인하거나 거절합니다."""
    await service.handle_apply(apply_id, payload, db)
    await db.commit()
    return {"message": "처리가 완료되었습니다."}
