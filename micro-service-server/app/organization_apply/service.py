from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.organization_apply.schemas import (
    OrganizationApplyCreate, 
    OrganizationApplyResponse, 
    OrganizationApplyHandleRequest,
    OrganizationApplyStatus
)
from app.organization_apply import repository as apply_repo
from app.organization import repository as org_repo
from app.organization.models import Organization, OrganizationMember, OrganizationRole
from typing import List


async def create_apply(payload: OrganizationApplyCreate, user_id: int, user_name: str) -> str:
    """유저의 단체 신청을 접수하여 Redis에 저장합니다."""
    data = payload.dict()
    return await apply_repo.save_apply(user_id, user_name, data)


async def get_applies() -> List[OrganizationApplyResponse]:
    """모든 신청 현황을 Redis에서 조회하여 반환합니다."""
    raw_list = await apply_repo.get_all_applies()
    results = []
    for raw in raw_list:
        results.append(OrganizationApplyResponse(
            id=raw["id"],
            name=raw["data"]["name"],
            img_url=raw["data"].get("img_url"),
            description=raw["data"]["description"],
            applicant_id=raw["applicant_id"],
            applicant_name=raw["applicant_name"],
            status=OrganizationApplyStatus.PENDING,
            created_at=raw["created_at"]
        ))
    
    # 생성일 기준 내림차순 정렬
    results.sort(key=lambda x: x.created_at, reverse=True)
    return results


async def handle_apply(apply_id: str, payload: OrganizationApplyHandleRequest, db: AsyncSession):
    """관리자가 신청을 승인하거나 거절하여 처리합니다."""
    apply_data = await apply_repo.find_by_id(apply_id)
    if not apply_data:
        raise HTTPException(status_code=404, detail="신청 내역을 찾을 수 없습니다.")
        
    if payload.status == OrganizationApplyStatus.APPROVED:
        # 1. 실제 단체 생성 (DB)
        new_org = Organization(
            name=apply_data["data"]["name"],
            description=apply_data["data"]["description"],
            img_url=apply_data["data"].get("img_url")
        )
        saved_org = await org_repo.save(new_org, db)
        
        # 2. 신청자에게 최고 관리자 권한 부여
        org_member = OrganizationMember(
            organization_id=saved_org.id,
            user_id=apply_data["applicant_id"],
            role=OrganizationRole.ORG_SUPER_ADMIN
        )
        await org_repo.save_organization_member(org_member, db)
        
    # 처리가 완료되면 Redis에서 제거
    await apply_repo.delete_apply(apply_id)
    return True
