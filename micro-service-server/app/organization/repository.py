from app.organization.models import Organization, OrganizationMember
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy import exists


async def check_user_exists_by_organization_name(organization_name: str, db: AsyncSession) -> bool:
    stmt = select(exists().where(Organization.name == organization_name))
    result = await db.execute(stmt)
    return result.scalar()


async def save(entity: Organization, db: AsyncSession) -> Organization:
    # values: dict[str, object] = {
    #     "name": entity.name,
    #     "description": entity.description,
    # }
    # if entity.id is not None:
    #     values["id"] = entity.id
    #
    # stmt = insert(Organization).values(**values)
    #
    # if entity.id is not None:
    #     stmt = stmt.on_conflict_do_update(
    #         index_elements=["id"],
    #         set_={
    #             "name": entity.name,
    #             "description": entity.description,
    #         },
    #     )
    #
    # stmt = stmt.returning(Organization)
    # result = await db.execute(stmt)
    # return result.scalar_one()
    pass


async def save_organization_member(member: OrganizationMember, db: AsyncSession):
    db.add(member)
    await db.flush()
    await db.refresh(member)
    return member

async def get_organization_members_by_organization_id(organization_id: int, db: AsyncSession) -> list[
    OrganizationMember]:
    stmt = select(OrganizationMember).where(Organization.id == organization_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_member_by_organization_id_and_user_id(
        organization_id: int,
        user_id: int,
        db: AsyncSession) -> OrganizationMember:
    stmt = (select(OrganizationMember)
            .where(OrganizationMember.organization.id == organization_id)
            .where(OrganizationMember.organization.user_id == user_id))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def delete_member_by_member_id(member_id: int, db: AsyncSession):
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


async def get_organization_orderby_id(db: AsyncSession):
    stmt = select(Organization).order_by(Organization.id.desc())
    return await db.execute(stmt)
