from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_session
from app.export_result.service import generate_contest_result_workbook
from app.security.deps import get_userdata
from app.user.schemas import UserData
from app.utils.security import authorize_roles

router = APIRouter(prefix="/api/export", tags=["export"])


@authorize_roles("Admin")
@router.get("/contest/{contest_id}/result")
async def export_contest_result(
        contest_id: int,
        userdata: UserData = Depends(get_userdata),
        db: AsyncSession = Depends(get_session),
        format: str = Query("xlsx", pattern="^(xlsx)$", description="Currently only xlsx is supported"),
):
    # Only xlsx supported for now
    workbook_stream = await generate_contest_result_workbook(contest_id, db)
    filename = f"contest_{contest_id}_result.xlsx"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(
        workbook_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )
