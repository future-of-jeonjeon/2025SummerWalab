import uuid

from app.core.redis import get_redis_manage_code
from app.organization import exceptions
from app.user import exceptions as user_exceptions
from app.organization.models import Organization, OrganizationRole, OrganizationMember
from sqlalchemy.ext.asyncio import AsyncSession
from app.organization.schemas import OrganizationCreateRequest, OrganizationUpdateRequest, \
    OrganizationMemberUpdateRequest, OrganizationResponse, OrganizationMemberResponse, OrganizationListResponse
from app.user.schemas import UserData
from app.common.page import Page

import app.organization.repository as organization_repo
import app.user.repository as user_repo

TTL_24_HOURS = 60 * 60 * 24


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
        items=[OrganizationListResponse.from_orm(org) for org in organization_page.items],
        total=organization_page.total,
        page=organization_page.page,
        size=organization_page.size
    )


async def update_organization(
        organization_id: int,
        request_user: UserData,
        data: OrganizationUpdateRequest, db: AsyncSession):
    await _check_organization_admin(organization_id, request_user, db)
    organization = await _get_organization_by_id(organization_id, db)
    organization.name = data.name
    organization.description = data.description
    organization.img_url = data.img_url
    return OrganizationResponse.from_orm(organization)


async def delete_organization(
        organization_id: int, 
        request_user: UserData,
        db: AsyncSession):
    await _check_organization_admin(organization_id, request_user, db)
    await _get_organization_by_id(organization_id, db)
    await organization_repo.delete_by_id(organization_id, db)
    return


async def organization_join_code(
        organization_id: int,
        request_user: UserData,
        db: AsyncSession):
    await _check_organization_admin(organization_id, request_user, db)
    organization = await _get_organization_by_id(organization_id, db)
    user = await user_repo.find_user_by_id(request_user.user_id, db)
    if not user:
        user_exceptions.user_not_found()
    redis = await get_redis_manage_code()
    key = await _generate_join_code(organization.id, user.id, redis, TTL_24_HOURS)
    return key


async def join_organization(
        organization_id: int,
        request_user: UserData,
        join_code: str,
        db: AsyncSession):
    organization = await _get_organization_by_id(organization_id, db)
    user = await user_repo.find_user_by_id(request_user.user_id, db)
    if not user:
        user_exceptions.user_not_found()
    user_data = await user_repo.find_sub_userdata_by_user_id(request_user.user_id, db)
    redis = await get_redis_manage_code()
    organization_id, issue_user_id = await _verify_and_consume_join_code(join_code, organization.id, redis)
    member = (await organization_repo
              .get_member_by_organization_id_and_user_id(organization_id, request_user.user_id, db))
    if member:
        exceptions.user_already_exist()
    new_organization_member = OrganizationMember(organization=organization, user=user_data)
    await organization_repo.save_organization_member(new_organization_member, db)
    await redis.delete(join_code)
    return OrganizationMemberResponse.from_orm(new_organization_member)


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
        member_id: int,
        db: AsyncSession):
    await _check_organization_admin(organization_id, request_user_data, db)
    await _get_organization_by_id(organization_id, db)

    member_data = await organization_repo.get_member_by_id_and_organization_id(member_id, organization_id, db)

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


async def _generate_join_code(
        organization_id: int,
        issuer_user_id: int,
        redis,
        ttl_seconds: int) -> str:
    code = str(uuid.uuid4())
    value = f"organization_join:{organization_id}:{issuer_user_id}"
    await redis.set(code, value, ex=ttl_seconds)
    return code


async def _verify_and_consume_join_code(
        join_code: str,
        organization_id: int,
        redis) -> tuple[int, int]:
    code_org_id, issuer_id = await _check_join_code(join_code, organization_id, redis)
    await redis.delete(join_code)
    return code_org_id, issuer_id


async def _check_join_code(
        join_code: str,
        organization_id: int,
        redis) -> tuple[int, int]:
    val = await redis.get(join_code)
    if not val:
        exceptions.forbidden()
    try:
        prefix, org_id_str, issuer_id_str = val.split(":")
        code_org_id, issuer_id = int(org_id_str), int(issuer_id_str)
        if prefix != "organization_join" or code_org_id != organization_id:
            exceptions.forbidden()
    except (ValueError, IndexError):
        exceptions.forbidden()
    return code_org_id, issuer_id


async def verify_join_code(
        organization_id: int,
        join_code: str):
    redis = await get_redis_manage_code()
    await _check_join_code(join_code, organization_id, redis)
    return True
