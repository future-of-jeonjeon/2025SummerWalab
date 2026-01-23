from app.organization import exceptions
from app.user import exceptions as user_exceptions
from app.organization.models import Organization, OrganizationRole, OrganizationMember
from sqlalchemy.ext.asyncio import AsyncSession
from app.organization.schemas import OrganizationCreateRequest, OrganizationUpdateRequest, \
    OrganizationMemberUpdateRequest, OrganizationResponse, OrganizationMemberResponse
from app.user.schemas import UserData
from app.common.page import Page

import app.organization.repository as organization_repo
import app.user.repository as user_repo


async def create_organization(
        data: OrganizationCreateRequest,
        db: AsyncSession):
    organization = Organization(name=data.name, description=data.description, img_url=data.img_url)
    saved_organization = await organization_repo.save(organization, db)
    return OrganizationResponse.from_orm(saved_organization)


async def get_organization(
        organization_id: int,
        db: AsyncSession) -> OrganizationResponse:
    organization = await _get_organization_by_id(organization_id, db)
    return OrganizationResponse.from_orm(organization)


async def list_organizations(
        page: int,
        size: int,
        db: AsyncSession):
    organization_page = await organization_repo.get_organizations(page, size, db)
    return Page(
        items=[OrganizationResponse.from_orm(org) for org in organization_page.items],
        total=organization_page.total,
        page=organization_page.page,
        size=organization_page.size
    )


async def update_organization(
        organization_id: int,
        data: OrganizationUpdateRequest, db: AsyncSession):
    organization = await _get_organization_by_id(organization_id, db)
    organization.name = data.name
    organization.description = data.description
    organization.img_url = data.img_url
    return OrganizationResponse.from_orm(organization)


async def delete_organization(organization_id: int, db: AsyncSession):
    await _get_organization_by_id(organization_id, db)
    await organization_repo.delete_by_id(organization_id, db)
    return


async def add_organization_user(
        organization_id: int,
        request_user: UserData,
        target_user_id: int,
        db: AsyncSession):
    await _check_organization_admin(organization_id, request_user, db)

    organization = await _get_organization_by_id(organization_id, db)
    user = await user_repo.find_user_by_id(target_user_id, db)
    user_data = await user_repo.find_sub_userdata_by_user_id(target_user_id, db)
    if not user:
        user_exceptions.user_not_found()
    member = (await organization_repo
              .get_member_by_organization_id_and_user_id(organization_id, target_user_id, db))
    if member:
        exceptions.user_already_exist()
    organization_member = OrganizationMember(organization=organization, user=user_data)
    await organization_repo.save_organization_member(organization_member, db)
    return OrganizationMemberResponse.from_orm(organization_member)


async def list_organization_user(
        organization_id: int,
        page: int,
        size: int,
        db: AsyncSession):
    members = await organization_repo.get_organization_members(organization_id, page, size, db)
    return [OrganizationMemberResponse.from_orm(member) for member in members]


async def edit_organization_user(
        organization_id: int,
        request_user: UserData,
        user_update_data: OrganizationMemberUpdateRequest,
        db: AsyncSession) -> OrganizationMemberResponse:
    await _check_organization_admin(organization_id, request_user, db)

    await _get_organization_by_id(organization_id, db)
    member_data = await (organization_repo
                         .get_member_by_organization_id_and_user_id(organization_id, user_update_data.user_id, db))
    if not member_data:
        exceptions.user_not_found()

    member_data.role = OrganizationRole(user_update_data.role)
    return OrganizationMemberResponse.from_orm(member_data)


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
    if ((request_user.admin_type not in ["Admin", "Super Admin"])
            and (not req_user or req_user.role not in {OrganizationRole.ORG_ADMIN, OrganizationRole.ORG_SUPER_ADMIN})):
        exceptions.forbidden()
    return True
