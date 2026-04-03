from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def delete_session_by_key(db: AsyncSession, session_key: str):
    await db.execute(
        text("DELETE FROM public.django_session WHERE session_key = :session_key"),
        {"session_key": session_key},
    )
