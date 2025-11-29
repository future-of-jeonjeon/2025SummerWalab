from fastapi import HTTPException
from app.organization.models import Organization
from app.utils.database import transactional
from sqlalchemy.ext.asyncio import AsyncSession
from app.organization.schemas import OrganizationCreateData, OrganizationUpdateData

import app.organization.repository as organization_repo
import app.user.repository as user_repo


@transactional
async def create_organization(data: OrganizationCreateData, db: AsyncSession):
    organization = Organization(name=data.name, description=data.description, )
    return await organization_repo.save(organization, db)


async def get_organization(organization_id: int, db: AsyncSession):
    return await _get_organization_by_id(organization_id, db)


@transactional
async def update_organization(organization_id: int, data: OrganizationUpdateData, db: AsyncSession):
    organization = await _get_organization_by_id(organization_id, db)
    organization.name = data.name
    organization.description = data.description
    return organization


@transactional
async def delete_organization(organization_id: int, db: AsyncSession):
    await _get_organization_by_id(organization_id, db)  # null check
    await organization_repo.delete_by_id(organization_id, db)
    return


async def list_organizations(page: int, size: int, db: AsyncSession):
    pass


@transactional
async def add_organization_user(organization_id: int, user_id: int, db: AsyncSession):
    organization = await _get_organization_by_id(organization_id, db)
    user = await user_repo.find_user_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user not in organization.members:
        organization.members.append(user)
    return organization


@transactional
async def delete_organization_user(organization_id: int, user_id: int, db: AsyncSession):
    organization = await _get_organization_by_id(organization_id, db)
    for member in list(organization.members):
        if member.id == user_id:
            organization.members.remove(member)
            break
    return organization


async def _get_organization_by_id(organization_id: int, db: AsyncSession):
    organization = await organization_repo.find_by_id(organization_id, db)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    return organization
