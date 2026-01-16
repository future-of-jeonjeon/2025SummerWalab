from app.organization import exceptions
from app.user import exceptions as user_exceptions
from app.organization.models import Organization
from sqlalchemy.ext.asyncio import AsyncSession
from app.organization.schemas import OrganizationCreateData, OrganizationUpdateData

import app.organization.repository as organization_repo
import app.user.repository as user_repo



async def create_organization(data: OrganizationCreateData, db: AsyncSession):
    organization = Organization(name=data.name, description=data.description, )
    return await organization_repo.save(organization, db)


async def get_organization(organization_id: int, db: AsyncSession):
    return await _get_organization_by_id(organization_id, db)



async def update_organization(organization_id: int, data: OrganizationUpdateData, db: AsyncSession):
    organization = await _get_organization_by_id(organization_id, db)
    organization.name = data.name
    organization.description = data.description
    return organization



async def delete_organization(organization_id: int, db: AsyncSession):
    await _get_organization_by_id(organization_id, db)  # null check
    await organization_repo.delete_by_id(organization_id, db)
    return


async def list_organizations(page: int, size: int, db: AsyncSession):
    pass



async def add_organization_user(organization_id: int, user_id: int, db: AsyncSession):
    organization = await _get_organization_by_id(organization_id, db)
    user = await user_repo.find_user_by_id(user_id, db)
    if not user:
        user_exceptions.user_not_found()
    if user not in organization.members:
        organization.members.append(user)
    return organization



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
        exceptions.organization_not_found()
    return organization
