from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.organization.models import Organization
from app.organization.schemas import OrganizationResponse
from app.pending.models import PendingStatus, Pending, PendingTargetType
from app.pending.schemas import PendingResponse, PendingPaginationResponse
from app.problem.models import Problem
from app.problem.schemas import ProblemResponse
from app.user.schemas import UserProfile, UserProfileResponse
from app.workbook.models import Workbook
from app.workbook.schemas import WorkbookResponse

import app.problem.repository as problem_repo
import app.pending.repository as pending_repo
import app.user.repository as user_repo
import app.workbook.service as workbook_service
import app.workbook.repository as workbook_repo
import app.organization.repository as organization_repo
import app.pending.exceptions as pending_exception
import app.problem.exceptions as problem_exception
import app.workbook.exceptions as workbook_exception
import app.organization.exceptions as organization_exception
import app.user.exceptions as user_exception


async def create_pending(
        target_type: PendingTargetType,
        target_id: int,
        request_user: UserProfile,
        db: AsyncSession):
    entity = Pending(
        status=PendingStatus.IN_PROGRESS,
        target_type=target_type,
        target_id=target_id,
        created_user_id=request_user.user_id,
    )
    return await pending_repo.save(entity, db)


async def process_pending(
        pending_id: int,
        status: PendingStatus,
        request_user: UserProfile,
        db: AsyncSession):
    pending: Pending = await pending_repo.find_by_id(pending_id, db)
    if status == PendingStatus.IN_PROGRESS:
        pending_exception.pending_bad_request()
    if not pending:
        pending_exception.pending_not_found()
    if pending.status == PendingStatus.DONE:
        pending_exception.pending_not_found()
    if pending.status == PendingStatus.EXPIRED:
        pending_exception.pending_has_expired()
    pending.status = status
    if status == PendingStatus.DONE:
        await _pending_pipeline(pending.target_type, pending.target_id, db)
        pending.completed_at = datetime.now(timezone.utc)
        pending.completed_user_id = request_user.user_id

    return None


async def get_pending(
        target_type: PendingTargetType,
        page: int,
        size: int,
        db: AsyncSession):
    data = await pending_repo.find_all_by_type(target_type, db, page, size)
    items: list[PendingResponse] = []
    for pending in data.items:
        created_user_data = await _to_user_profile_response(pending.created_user_id, db)
        items.append(
            PendingResponse(
                pending_id=pending.id,
                status=pending.status,
                target_type=pending.target_type,
                target_id=pending.target_id,
                due_at=pending.due_at,
                created_user_data=created_user_data,
                target_data=await _to_target_data(pending.target_type, pending.target_id, db),
                completed_at=pending.completed_at,
                completed_user_id=pending.completed_user_id,
            )
        )

    return PendingPaginationResponse(
        items=items,
        total=data.total,
        page=data.page,
        size=data.size,
    )


########################################################################################################################
# pending process

async def _pending_pipeline(target_type: PendingTargetType, target_id: int, db: AsyncSession):
    if target_type == PendingTargetType.PROBLEM:
        await _problem_pending_pass(target_id, db)
    if target_type == PendingTargetType.WORKBOOK:
        await _workbook_pending_pass(target_id, db)
    if target_type == PendingTargetType.Organization:
        await _organization_pending_pass(target_id, db)
    return


async def _problem_pending_pass(problem_id: int, db: AsyncSession):
    problem: Problem = await problem_repo.find_problem_by_id(problem_id, db)
    if not problem:
        problem_exception.problem_not_found()
    problem.visible = True
    return

async def _organization_pending_pass(organization_id: int, db: AsyncSession):
    organization: Organization = await organization_repo.find_by_id (organization_id, db)
    if not organization:
        organization_exception.organization_not_found()
    organization.visible = True
    return


async def _workbook_pending_pass(workbook_id: int, db: AsyncSession):
    workbook: Workbook = await workbook_repo.find_by_id(workbook_id, db)
    if not workbook:
        workbook_exception.workbook_not_found()
    workbook.is_public = True
    return

########################################################################################################################

async def _to_user_profile_response(user_id: int, db: AsyncSession) -> UserProfileResponse:
    user = await user_repo.find_user_by_id(user_id, db)
    user_data = await user_repo.find_sub_userdata_by_user_id(user_id, db)

    if not user_data:
        user_exception.user_not_found()

    return UserProfileResponse(
        username=user.username if user else None,
        avatar=None,
        student_id=user_data.student_id,
        major_id=user_data.major_id,
        name=user_data.name,
        dark_mode_enabled=user_data.dark_mode_enabled,
        language_preferences=user_data.language_preferences,
    )


async def _to_target_data(target_type: PendingTargetType, target_id: int, db: AsyncSession):
    if target_type == PendingTargetType.PROBLEM:
        problem = await problem_repo.find_problem_with_tags_by_id(target_id, db)
        if not problem:
            return None
        return ProblemResponse.model_validate(problem)

    if target_type == PendingTargetType.WORKBOOK:
        workbook = await workbook_repo.find_by_id(target_id, db)
        if not workbook:
            return None
        user = await user_repo.find_user_by_id(workbook.created_by_id, db)
        if user:
            await workbook_service._enrich_workbook(workbook, user.username)
        return WorkbookResponse.model_validate(workbook)

    if target_type == PendingTargetType.Organization:
        organization = await organization_repo.find_by_id(target_id, db)
        if not organization:
            return None
        return OrganizationResponse.from_orm(organization)

    return None
