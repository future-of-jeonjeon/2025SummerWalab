from functools import wraps
from sqlalchemy.ext.asyncio import AsyncSession

def transactional(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        db = kwargs.get("db")
        if db is None:
            for a in args:
                if isinstance(a, AsyncSession):
                    db = a
                    break
        if db is None and args:
            self = args[0]
            cand = getattr(self, "db", None)
            if isinstance(cand, AsyncSession):
                db = cand

        if not isinstance(db, AsyncSession):
            raise ValueError("AsyncSession not found (use keyword: db=, or provide self.db)")

        try:
            result = await func(*args, **kwargs)
            if db.in_transaction():
                await db.commit()
            return result
        except Exception:
            if db.in_transaction():
                await db.rollback()
            raise
    return wrapper
