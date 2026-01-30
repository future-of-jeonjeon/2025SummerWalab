from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_database, get_database_readonly
from app.core.auth.guards import require_role
from app.organization.schemas import *
from app.api.deps import get_userdata
from app.user.schemas import UserData
from app.common.page import Page
import app.organization.service as organization_serv

router = APIRouter(prefix="/api/organization", tags=["organization"])


@router.post("", response_model=OrganizationResponse)
@require_role("Admin")
async def create_organization(
        data: OrganizationCreateRequest,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await organization_serv.create_organization(data, db)


@router.get("", response_model=Page[OrganizationListResponse])
async def list_organizations(
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=30),
        db: AsyncSession = Depends(get_database_readonly)):
    return await organization_serv.list_organizations(page, size, db)


@router.get("/{organization_id}", response_model=OrganizationResponse)
async def get_organization(
        organization_id: int,
        db: AsyncSession = Depends(get_database_readonly)):
    return await organization_serv.get_organization(organization_id, db)


@router.put("/{organization_id}", response_model=OrganizationResponse)
async def update_organization(
        organization_id: int,
        data: OrganizationUpdateRequest,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await organization_serv.update_organization(organization_id, data, db)


@router.delete("/{organization_id}")
async def delete_organization(
        organization_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    await organization_serv.delete_organization(organization_id, db)
    return {}


@router.get("/{organization_id}/users", response_model=Page[OrganizationMemberResponse])
async def list_organization_users(
        organization_id: int,
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=30),
        db: AsyncSession = Depends(get_database_readonly)):
    return await organization_serv.list_organization_user(organization_id, page, size, db)


@router.post("/{organization_id}/join-code", response_model=str)
async def code_generate(
        organization_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await organization_serv.organization_join_code(organization_id, userdata, db)


@router.post("/{organization_id}/join", response_model=OrganizationMemberResponse)
async def join_organization(
        join_code: str,
        organization_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    return await organization_serv.join_organization(organization_id, userdata, join_code, db)


@router.delete("/{organization_id}/users/{user_id}")
async def delete_organization_user(
        organization_id: int,
        user_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_database)):
    await organization_serv.delete_organization_user(organization_id, userdata, user_id, db)
    return {}
