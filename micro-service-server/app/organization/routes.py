from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_session
from app.organization.schemas import OrganizationCreateData, OrganizationUpdateData
from app.security.deps import get_userdata
from app.user.schemas import UserData
from app.utils.security import authorize_roles
import app.organization.service as organization_serv

router = APIRouter(prefix="/api/organization", tags=["organization"])


@router.post("/")
@authorize_roles("Admin")
async def create_organization(
        data: OrganizationCreateData,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session), ):
    return await organization_serv.create_organization(data, db)


@router.get("")
async def list_organizations(
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=30),
        db: AsyncSession = Depends(get_session), ):
    return await organization_serv.list_organizations(page, size, db)


@router.get("/{organization_id}")
async def get_organization(
        organization_id: int,
        db: AsyncSession = Depends(get_session), ):
    return await organization_serv.get_organization(organization_id, db)


@router.put("/{organization_id}")
@authorize_roles("Admin")
async def update_organization(
        organization_id: int,
        data: OrganizationUpdateData,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session), ):
    return await organization_serv.update_organization(organization_id, data, db)


@router.delete("/{organization_id}")
@authorize_roles("Admin")
async def delete_organization(
        organization_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session), ):
    return await organization_serv.delete_organization(organization_id, db)


@router.post("/{organization_id}/users/{user_id}")
@authorize_roles("Admin")
async def add_organization_user(
        organization_id: int,
        user_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session), ):
    return await organization_serv.add_organization_user(organization_id, user_id, db)


@router.delete("/{organization_id}/users/{user_id}")
@authorize_roles("Admin")
async def delete_organization_user(
        organization_id: int,
        user_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session), ):
    return await organization_serv.delete_organization_user(organization_id, user_id, db)
