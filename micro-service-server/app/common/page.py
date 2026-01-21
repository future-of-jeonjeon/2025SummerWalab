# app/common/page.py
from typing import Generic, List, TypeVar
from pydantic.generics import GenericModel

T = TypeVar("T")


class Page(GenericModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int

    @property
    def has_next(self) -> bool:
        return self.page * self.size < self.total


def paginate(query, page: int, size: int, *, max_size: int = 100) -> Page:
    page = 1 if page < 1 else page
    size = 1 if size < 1 else size
    size = max_size if size > max_size else size

    total = query.count()
    items = (
        query
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return Page(items=items, total=total, page=page, size=size)