from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_database
from app.export_result.service import generate_contest_result_workbook
from app.api.deps import get_userdata
from app.user.schemas import UserProfile
from app.core.auth.guards import require_role

router = APIRouter(prefix="/api/export", tags=["export"])


@require_role("Admin")
@router.get("/contest/{contest_id}/result")
async def export_contest_result(
        contest_id: int,
        user_profile: UserProfile = Depends(get_userdata),
        db: AsyncSession = Depends(get_database),
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
