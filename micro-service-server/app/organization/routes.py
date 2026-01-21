from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_database, get_database_readonly
from app.core.auth.guards import require_role
from app.organization.schemas import OrganizationCreateData, OrganizationUpdateData
from app.api.deps import get_userdata
from app.user.schemas import UserData
import app.organization.service as organization_serv

router = APIRouter(prefix="/api/organization", tags=["organization"])


@router.post("/")
@require_role("Admin")
async def create_organization(
        data: OrganizationCreateData,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await organization_serv.create_organization(data, db)


@router.get("/")
async def list_organizations(
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=30),
        db: AsyncSession = Depends(get_database_readonly)):
    return await organization_serv.list_organizations(page, size, db)


@router.get("/{organization_id}")
async def get_organization(
        organization_id: int,
        db: AsyncSession = Depends(get_database_readonly)):
    return await organization_serv.get_organization(organization_id, db)


@router.put("/{organization_id}")
@require_role("Admin")
async def update_organization(
        organization_id: int,
        data: OrganizationUpdateData,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await organization_serv.update_organization(organization_id, data, db)


@router.delete("/{organization_id}")
@require_role("Admin")
async def delete_organization(
        organization_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await organization_serv.delete_organization(organization_id, db)


@router.post("/{organization_id}/users/{user_id}")
async def add_organization_user(
        organization_id: int,
        user_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await organization_serv.add_organization_user(organization_id=organization_id, request_user=userdata,
                                                         target_user_id=user_id, db=db)


@router.delete("/{organization_id}/users/{user_id}")
@require_role("Admin")
async def delete_organization_user(
        organization_id: int,
        user_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await organization_serv.delete_organization_user(organization_id, user_id, db)
