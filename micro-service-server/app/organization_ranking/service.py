from sqlalchemy.ext.asyncio import AsyncSession

from app.organization_ranking import repository as ranking_repository


async def get_organization_rank(limit: int, offset: int, db: AsyncSession):
    return await ranking_repository.get_organizations_order_by_rank_acm(
        limit=limit,
        offset=offset,
        db=db,
    )
