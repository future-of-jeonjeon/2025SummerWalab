from app.common.page import Page, paginate
from app.organization.models import Organization, OrganizationMember
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy import exists
from sqlalchemy.orm import selectinload


async def check_user_exists_by_organization_name(organization_name: str, db: AsyncSession) -> bool:
    stmt = select(exists().where(Organization.name == organization_name))
    result = await db.execute(stmt)
    return result.scalar()


async def save(entity: Organization, db: AsyncSession) -> Organization:
    db.add(entity)
    await db.flush()
    await db.refresh(entity)
    return entity


async def save_organization_member(member: OrganizationMember, db: AsyncSession):
    db.add(member)
    await db.flush()
    await db.refresh(member)
    return member


async def get_organization_members_by_organization_id(
        organization_id: int,
        db: AsyncSession) -> list[OrganizationMember]:
    stmt = select(OrganizationMember).where(OrganizationMember.organization_id == organization_id)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_member_by_organization_id_and_user_id(
        organization_id: int,
        user_id: int,
        db: AsyncSession) -> OrganizationMember:
    stmt = (
        select(OrganizationMember)
        .where(OrganizationMember.organization_id == organization_id)
        .where(OrganizationMember.user_id == user_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_member_by_id_and_organization_id(
        member_id: int,
        organization_id: int,
        db: AsyncSession) -> OrganizationMember | None:
    stmt = (
        select(OrganizationMember)
        .where(OrganizationMember.id == member_id)
        .where(OrganizationMember.organization_id == organization_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def delete_member_by_member_id(member_id: int, db: AsyncSession) -> int:
    stmt = delete(OrganizationMember).where(OrganizationMember.id == member_id)
    result = await db.execute(stmt)
    return result.rowcount or 0


async def find_by_id(organization_id: int, db: AsyncSession) -> Organization | None:
    stmt = select(Organization).where(Organization.id == organization_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def delete_by_id(organization_id: int, db: AsyncSession) -> None:
    stmt = delete(Organization).where(Organization.id == organization_id)
    await db.execute(stmt)


async def get_organizations(
        page: int,
        size: int,
        db: AsyncSession,
        visible_only: bool = True) -> Page[Organization]:
    stmt = select(Organization)
    if visible_only:
        stmt = stmt.where(Organization.visible == True)
    stmt = stmt.order_by(Organization.id.desc())
    return await paginate(db, stmt, page, size)


async def get_organization_members(
        organization_id: int, page: int, size: int, db: AsyncSession
) -> Page[OrganizationMember]:
    stmt = (
        select(OrganizationMember)
        .where(OrganizationMember.organization_id == organization_id)
        .options(selectinload(OrganizationMember.user))
        .order_by(OrganizationMember.id.desc())
    )
    return await paginate(db, stmt, page, size)


async def remove_organization_all_members(organization_id, db):
    stmt = (
        select(OrganizationMember)
        .where(OrganizationMember.organization_id == organization_id)
        .options(selectinload(OrganizationMember.user))
    )
    result = await db.execute(stmt)
    members = result.scalars().all()
    for m in members:
        await db.delete(m)
    return
