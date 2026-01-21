from typing import Generic, List, TypeVar
from pydantic.generics import GenericModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

T = TypeVar("T")


class Page(GenericModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int

    @property
    def has_next(self) -> bool:
        return self.page * self.size < self.total


async def paginate(session: AsyncSession, stmt: Select, page: int, size: int) -> Page[T]:
    page = 1 if page < 1 else page
    size = 1 if size < 1 else size
    size = 100 if size > 100 else size

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await session.execute(count_stmt)).scalar() or 0

    stmt = stmt.offset((page - 1) * size).limit(size)
    result = await session.execute(stmt)
    items = result.scalars().all()

    return Page(items=items, total=total, page=page, size=size)