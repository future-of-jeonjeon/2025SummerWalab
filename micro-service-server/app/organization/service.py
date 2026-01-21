from app.organization import exceptions
from app.user import exceptions as user_exceptions
from app.organization.models import Organization, OrganizationRole, OrganizationMember
from sqlalchemy.ext.asyncio import AsyncSession
from app.organization.schemas import OrganizationCreateData, OrganizationUpdateData, OrganizationMemberUpdateRequest
from app.user.schemas import UserData

import app.organization.repository as organization_repo
import app.user.repository as user_repo


async def create_organization(
        data: OrganizationCreateData,
        db: AsyncSession):
    organization = Organization(name=data.name, description=data.description)
    return await organization_repo.save(organization, db)


async def get_organization(
        organization_id: int,
        db: AsyncSession):
    return await _get_organization_by_id(organization_id, db)


async def list_organizations(
        page: int,
        size: int,
        db: AsyncSession):
    return await organization_repo.get_organizations(page, size, db)


async def update_organization(
        organization_id: int,
        data: OrganizationUpdateData, db: AsyncSession):
    organization = await _get_organization_by_id(organization_id, db)
    organization.name = data.name
    organization.description = data.description
    return organization


async def delete_organization(organization_id: int, db: AsyncSession):
    await _get_organization_by_id(organization_id, db)
    await organization_repo.delete_by_id(organization_id, db)
    return


# ==========================================================================
# org users

async def add_organization_user(
        organization_id: int,
        request_user: UserData,
        target_user_id: int,
        db: AsyncSession):
    await _check_organization_admin(organization_id, request_user, db)

    organization = await _get_organization_by_id(organization_id, db)
    user = await user_repo.find_user_by_id(target_user_id, db)
    user_data = await user_repo.find_sub_userdata_by_user_id(target_user_id, db)
    if user:
        user_exceptions.user_not_found()
    member = (await organization_repo
              .get_member_by_organization_id_and_user_id(organization_id, target_user_id, db))
    if not member:
        exceptions.user_already_exist()
    organization_member = OrganizationMember(organization=organization, user=user_data)
    await organization_repo.save_organization_member(organization_member, db)
    return organization_member


async def list_organization_user(
        organization_id: int,
        page: int,
        size: int,
        db: AsyncSession):
    await _get_organization_by_id(organization_id, db)
    return await organization_repo.get_organization_members(organization_id, page, size, db)



async def edit_organization_user(
        organization_id: int,
        request_user: UserData,
        user_update_data: OrganizationMemberUpdateRequest,
        db: AsyncSession):
    await _check_organization_admin(organization_id, request_user, db)

    await _get_organization_by_id(organization_id, db)
    member_data = await (organization_repo
                         .get_member_by_organization_id_and_user_id(organization_id, user_update_data.user_id, db))
    if not member_data:
        exceptions.user_not_found()

    member_data.role = OrganizationRole(user_update_data.role)
    return member_data


async def delete_organization_user(
        organization_id: int,
        request_user_data: UserData,
        target_user_id: int,
        db: AsyncSession):
    await _check_organization_admin(organization_id, request_user_data, db)
    await _get_organization_by_id(organization_id, db)
    member_data = await (organization_repo
                         .get_member_by_organization_id_and_user_id(organization_id, target_user_id, db))
    if not member_data:
        exceptions.user_not_found()
    await organization_repo.delete_member_by_member_id(member_data.id, db)
    return


async def _get_organization_by_id(
        organization_id: int,
        db: AsyncSession) -> Organization:
    organization = await organization_repo.find_by_id(organization_id, db)
    if not organization:
        exceptions.organization_not_found()
    return organization


async def _check_organization_admin(
        organization_id: int,
        request_user: UserData,
        db: AsyncSession) -> bool:
    req_user = await (organization_repo
                      .get_member_by_organization_id_and_user_id(organization_id, request_user.user_id, db))
    if (("ADMIN" not in request_user.admin_type)
            and (req_user.role not in {OrganizationRole.ORG_ADMIN, OrganizationRole.ORG_SUPER_ADMIN})):
        exceptions.forbidden()
    return True
