import uuid
from ipaddress import ip_network
from typing import Union

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timezone
import app.contest.repository as contest_repo
import app.organization.service as organization_service
import app.problem.repository as problem_repo
import app.organization.repository as organization_repo
import app.submission.repository as submission_repo
import app.user.repository as user_repo
import app.contest.exceptions as contest_exception
import app.organization.exceptions as organization_exception
from app.problem import exceptions as problem_exceptions
from app.contest.models import *
from app.contest.schemas import *
from app.problem.models import Problem
from app.problem.schemas import ProblemResponse
from app.user.schemas import UserProfile


def _check_contest_options(dto: Union[CreateContestRequest, ReqUpdateContestDTO]):
    if dto.end_time <= dto.start_time:
        contest_exception.invalid_time_range()
    if not dto.password:
        dto.password = None
    for ip_range in dto.allowed_ip_ranges:
        try:
            ip_network(ip_range, strict=False)
        except ValueError:
            contest_exception.invalid_ip_network(ip_range)


async def create_contest(request_data: CreateContestRequest, user_profile: UserProfile,
                         db: AsyncSession) -> ContestDataDTO:
    _check_contest_options(request_data)
    organization = await organization_repo.find_by_id(request_data.organization_id, db)
    if not organization:
        organization_exception.organization_not_found()
    await organization_service.check_organization_admin(organization.id, user_profile, db)
    contest = _create_contest_entity_from_dto(request_data, user_profile.user_id)
    contest = await contest_repo.create_contest(contest, db)
    contest_language = ContestLanguage(contest_id=contest.id, languages=request_data.languages)
    organization_id = request_data.organization_id
    await contest_repo.create_contest_language(contest_language, db)
    organization_contest = OrganizationContest(contest_id=contest.id,
                                               organization_id=organization_id,
                                               is_organization_only=request_data.is_organization_only)
    await contest_repo.create_organization_contest(organization_contest, db)
    if request_data.requires_approval:
        await contest_repo.upsert_policy(contest.id, request_data.requires_approval, db)

    for p_input in (request_data.problems or []):
        await _clone_and_add_problem(db, contest.id, p_input.problem_id, p_input.display_id, user_profile.user_id,
                                     request_data.languages)

    return await _create_contest_data_dto_from_entity(contest, request_data.languages, 0, db)


async def update_contest(update_contest_dto: ReqUpdateContestDTO, user_profile: UserProfile,
                         db: AsyncSession) -> ContestDataDTO:
    contest = await contest_repo.find_contest_by_id(update_contest_dto.id, db)
    if not contest:
        contest_exception.contest_not_found()
    organization = await organization_repo.find_by_id(update_contest_dto.organization_id, db)
    if not organization:
        organization_exception.organization_not_found()
    await organization_service.check_organization_admin(organization.id, user_profile, db)
    _check_contest_options(update_contest_dto)
    _update_contest_data(contest, update_contest_dto)
    await contest_repo.update_contest(contest, db)
    contest_language = await contest_repo.find_contest_language_by_contest_id(contest.id, db)
    if contest_language:
        await contest_repo.update_contest_language(contest_language, update_contest_dto.languages, db)
    else:  # 없는 경우 생성 -> 레거시 데이터 보존
        contest_language = ContestLanguage(contest_id=contest.id, languages=update_contest_dto.languages)
        await contest_repo.create_contest_language(contest_language, db)
    await problem_repo.update_problem_languages_by_contest_id(db, contest.id, update_contest_dto.languages)

    # Update Organization Contest settings
    org_contest = await contest_repo.find_organization_contest_by_contest_id(contest.id, db)
    if org_contest and update_contest_dto.is_organization_only is not None:
        org_contest.is_organization_only = update_contest_dto.is_organization_only
        await contest_repo.create_organization_contest(org_contest, db)

    if update_contest_dto.requires_approval is not None:
        await contest_repo.upsert_policy(contest.id, update_contest_dto.requires_approval, db)

    return await _create_contest_data_dto_from_entity(contest, update_contest_dto.languages, 0, db)


async def update_contest_problems(
        contest_id: int,
        problem_inputs: List[ContestProblemInputDTO],
        user_profile: UserProfile,
        db: AsyncSession, ) -> None:
    contest = await contest_repo.find_contest_by_id(contest_id, db)
    if not contest:
        contest_exception.contest_not_found()

    organization_contest = await contest_repo.find_organization_contest_by_contest_id(contest_id, db)
    if organization_contest:
        organization = await organization_repo.find_by_id(organization_contest.organization_id, db)
        if not organization:
            organization_exception.organization_not_found()
        await organization_service.check_organization_admin(organization.id, user_profile, db)

    if not problem_inputs:
        return

    existing_problems = await problem_repo.find_problems_by_contest_id(db, contest_id)
    existing_display_ids = {p._id: p for p in existing_problems}
    new_display_ids = {p.display_id for p in problem_inputs}

    problems_to_delete = [p for p in existing_problems if p._id not in new_display_ids]
    if problems_to_delete:
        submission_count = await submission_repo.count_submissions_for_contest_problems(
            db, contest_id, [p.id for p in problems_to_delete]
        )
        if submission_count > 0:
            contest_exception.contest_problem_has_submissions()
        await problem_repo.delete_problems(db, problems_to_delete)

    contest_language = await contest_repo.find_contest_language_by_contest_id(contest_id, db)
    languages = contest_language.languages if contest_language else []
    for p_input in problem_inputs:
        if p_input.display_id not in existing_display_ids:
            await _clone_and_add_problem(
                db,
                contest_id,
                p_input.problem_id,
                p_input.display_id,
                user_profile.user_id,
                languages,
            )
    return


def _update_contest_data(contest, update_contest_dto):
    contest.title = update_contest_dto.title
    contest.description = update_contest_dto.description
    contest.start_time = update_contest_dto.start_time
    contest.end_time = update_contest_dto.end_time
    contest.rule_type = update_contest_dto.rule_type
    contest.password = update_contest_dto.password
    contest.visible = update_contest_dto.visible
    contest.real_time_rank = update_contest_dto.real_time_rank
    contest.allowed_ip_ranges = update_contest_dto.allowed_ip_ranges
    contest.last_update_time = datetime.now()
    return contest


async def get_contest_detail(contest_id: int, db: AsyncSession) -> ContestDataDTO:
    contest = await contest_repo.find_contest_by_id(contest_id, db)
    if not contest:
        contest_exception.contest_not_found()

    contest_language = await contest_repo.find_contest_language_by_contest_id(contest_id, db)
    languages = contest_language.languages if contest_language else []
    contest_participants_num = await contest_repo.count_contest_participants_by_contest_id(contest_id, db)
    return await _create_contest_data_dto_from_entity(contest, languages, contest_participants_num, db)


async def _clone_and_add_problem(db: AsyncSession, contest_id: int, problem_id: int, display_id: str, user_id: int,
                                 languages: List[str]):
    problem = await problem_repo.find_problem_with_tags_by_id(problem_id, db)
    if not problem:
        problem_exceptions.problem_not_found()
    if await contest_repo.exists_display_id_in_contest(contest_id, display_id, db):
        contest_exception.display_id_conflict()
    new_problem = _create_cloned_problem_entity(problem, contest_id, display_id, user_id, languages)
    new_problem.tags = list(problem.tags)
    return await problem_repo.save(session=db, problem=new_problem)


async def add_contest_problem(contest_problem_dto: ReqAddContestProblemDTO, user_profile: UserProfile,
                              db: AsyncSession):
    contest = await contest_repo.find_contest_by_id(contest_problem_dto.contest_id, db)
    contest_language = await contest_repo.find_contest_language_by_contest_id(contest_problem_dto.contest_id, db)

    if not contest:
        contest_exception.contest_not_found()
    if not contest_language:
        contest_exception.contest_language_not_found()
    if contest.end_time <= datetime.now():
        contest_exception.contest_ended()

    await _clone_and_add_problem(db, contest.id, contest_problem_dto.problem_id, contest_problem_dto.display_id,
                                 user_profile.user_id, contest_language.languages)
    return None


async def get_contest_problems(contest_id: int, user_profile: UserProfile, db: AsyncSession) -> List[ContestProblemDTO]:
    # await _ensure_contest_permission(contest_id, user_profile, db)
    problems = await problem_repo.find_problems_by_contest_id(db, contest_id)
    problem_ids = [problem.id for problem in problems]
    solved_problem_ids = await submission_repo.find_solved_problem_ids_by_contest_and_user(
        contest_id=contest_id,
        user_id=user_profile.user_id,
        problem_ids=problem_ids,
        db=db,
    )
    attempted_problem_ids = await submission_repo.find_attempted_problem_ids_by_contest_and_user(
        contest_id=contest_id,
        user_id=user_profile.user_id,
        problem_ids=problem_ids,
        db=db,
    )
    solved_set = set(solved_problem_ids)
    attempted_set = set(attempted_problem_ids)

    return [
        ContestProblemDTO(
            id=problem.id,
            display_id=problem._id,
            title=problem.title,
            difficulty=problem.difficulty,
            submission_number=problem.submission_number or 0,
            accepted_number=problem.accepted_number or 0,
            status=2 if problem.id in solved_set else (1 if problem.id in attempted_set else 0),
        )
        for problem in problems
    ]


async def delete_contest(contest_id: int, user_profile: UserProfile, db: AsyncSession):
    contest = await contest_repo.find_contest_by_id(contest_id, db)
    if not contest:
        contest_exception.contest_not_found()
    organization_contest = await  contest_repo.find_organization_contest_by_contest_id(contest_id, db)
    organization = await organization_repo.find_by_id(organization_contest.organization_id, db)
    if not organization:
        organization_exception.organization_not_found()
    await organization_service.check_organization_admin(organization.id, user_profile, db)
    await contest_repo.delete_contest_languages(contest_id, db)
    await contest_repo.delete_contest_users(contest_id, db)
    await contest_repo.delete_organization_contest_by_contest_id(organization_contest.contest_id, db)
    await contest_repo.delete_contest_problems(contest_id, db)
    await contest_repo.delete_contest(contest_id, db)


async def get_participated_contest_by_user(user_profile: UserProfile, db: AsyncSession):
    contests = await contest_repo.get_participated_contest_by_user_id(user_profile.user_id, db)
    return [
        ContestDTO(
            contest_id=c.id,
            title=c.title,
            start_time=c.start_time,
            end_time=c.end_time,
        )
        for c in contests
    ]


def _create_contest_entity_from_dto(create_contest_dto, user_id):
    return Contest(
        title=create_contest_dto.title,
        description=create_contest_dto.description,
        start_time=create_contest_dto.start_time,
        end_time=create_contest_dto.end_time,
        rule_type=create_contest_dto.rule_type,
        password=create_contest_dto.password or None,
        visible=create_contest_dto.visible,
        real_time_rank=create_contest_dto.real_time_rank,
        allowed_ip_ranges=create_contest_dto.allowed_ip_ranges,
        created_by_id=user_id,
        create_time=datetime.now(),
        last_update_time=datetime.now()
    )


async def _create_contest_data_dto_from_entity(contest: Contest, languages: List[str], participants_num: int,
                                               db) -> ContestDataDTO:
    creator_user = await user_repo.find_user_by_id(contest.created_by_id, db)
    created_by_dto = ContestCreatedByDTO(
        id=creator_user.id,
        username=creator_user.username,
    )
    org_contest = await contest_repo.find_organization_contest_by_contest_id(contest.id, db)
    is_organization_only = org_contest.is_organization_only if org_contest else False

    organization_id = org_contest.organization_id if org_contest else None
    organization_name = None
    if organization_id:
        org = await organization_repo.find_by_id(organization_id, db)
        if org:
            organization_name = org.name

    policy = await contest_repo.get_policy(contest.id, db)
    problem_count = await problem_repo.count_contest_problems(db, contest.id)

    return ContestDataDTO(
        id=contest.id,
        title=contest.title,
        description=contest.description,
        startTime=contest.start_time,
        endTime=contest.end_time,
        createTime=contest.create_time,
        ruleType=contest.rule_type,
        visible=contest.visible,
        real_time_rank=contest.real_time_rank,
        allowed_ip_ranges=contest.allowed_ip_ranges,
        password=contest.password,
        status="0",
        participants=participants_num or 0,
        createdBy=created_by_dto,
        languages=languages,
        problemCount=problem_count,
        is_organization_only=is_organization_only,
        requires_approval=policy,
        organization_id=organization_id,
        organization_name=organization_name
    )


async def _process_contest_response(page: Page, db: AsyncSession) -> PaginatedContestResponse:
    dtos = []
    for contest in page.items:
        contest_participants_num = await contest_repo.count_contest_participants_by_contest_id(contest.id, db)
        contest_language = await contest_repo.find_contest_language_by_contest_id(contest.id, db)
        languages = contest_language.languages if contest_language else []
        dto = await _create_contest_data_dto_from_entity(contest, languages, contest_participants_num, db)
        dtos.append(dto)
    return PaginatedContestResponse(
        items=dtos,
        total=page.total,
        page=page.page,
        size=page.size
    )


async def get_all_contests_admin(
        page: int,
        size: int,
        keyword: str,
        user_id: int,
        admin_type: str,
        db: AsyncSession) -> PaginatedContestResponse:
    created_by_id = None
    contest_page = await contest_repo.get_contest_list(
        db, page, size, keyword, rule_type=None, status=None,
        created_by_id=created_by_id, visible_only=False
    )
    return await _process_contest_response(contest_page, db)


async def get_contest_list_paginated(
        page: int, size: int, keyword: str, rule_type: str, status: str, db: AsyncSession
) -> PaginatedContestResponse:
    contest_page = await contest_repo.get_contest_list(db, page, size, keyword, rule_type, status)

    return await _process_contest_response(contest_page, db)


def _create_cloned_problem_entity(original_problem: Problem, contest_id: int, display_id: str, user_id: int,
                                  languages: List[str]) -> Problem:
    now = datetime.now()
    return Problem(
        title=original_problem.title,
        description=original_problem.description,
        input_description=original_problem.input_description,
        output_description=original_problem.output_description,
        samples=original_problem.samples,
        test_case_id=original_problem.test_case_id,
        test_case_score=original_problem.test_case_score,
        hint=original_problem.hint,
        languages=languages,
        template=original_problem.template,
        time_limit=original_problem.time_limit,
        memory_limit=original_problem.memory_limit,
        io_mode=original_problem.io_mode,
        spj=original_problem.spj,
        spj_language=original_problem.spj_language,
        spj_code=original_problem.spj_code,
        spj_version=original_problem.spj_version,
        spj_compile_ok=original_problem.spj_compile_ok,
        rule_type=original_problem.rule_type,
        difficulty=original_problem.difficulty,
        source=original_problem.source,
        total_score=original_problem.total_score,
        contest_id=contest_id,
        _id=display_id,
        created_by_id=user_id,
        visible=True,
        is_public=True,
        submission_number=0,
        accepted_number=0,
        statistic_info={},
        create_time=now,
        last_update_time=now,
    )


async def get_organization_contest_list(
        page: int,
        size: int,
        organization_id: int,
        db: AsyncSession):
    contest_page = await contest_repo.get_contest_list_page_by_organization_id(organization_id, page, size, db)
    return await _process_contest_response(contest_page, db)


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


# ======================================================================================================================

APPROVED: ParticipationStatus = "approved"
PENDING: ParticipationStatus = "pending"
REJECTED: ParticipationStatus = "rejected"


async def join_contest(contest_id: int, user_profile: UserProfile, db: AsyncSession) -> ContestUserStatus:
    contest = await contest_repo.find_contest_by_id(contest_id, db)
    if not contest:
        contest_exception.contest_not_found()
    organization_contest = await contest_repo.find_organization_contest_by_contest_id(contest_id, db)
    is_admin_user = False
    if organization_contest:
        is_admin_user = await organization_service.is_organization_admin(organization_contest.organization_id,
                                                                         user_profile, db)

    if organization_contest and organization_contest.is_organization_only:
        is_member = await organization_repo.get_member_by_organization_id_and_user_id(
            organization_contest.organization_id, user_profile.user_id, db
        )
        if not is_member:
            contest_exception.cannot_participate_in_organization_contest()

    if _has_contest_ended(contest.end_time):
        contest_exception.cannot_participate_in_ended_contest()

    requires_approval_policy = await contest_repo.get_policy(contest_id, db)
    status: ParticipationStatus = APPROVED
    approver = user_profile.user_id if is_admin_user else None

    if not is_admin_user and requires_approval_policy and _has_contest_started(contest.start_time):
        status = PENDING

    membership = await contest_repo.upsert_membership(contest_id, user_profile.user_id, status, approver, db)
    return _build_status(
        contest_id,
        user_profile,
        membership,
        is_admin=is_admin_user,
        requires_approval=requires_approval_policy,
    )


async def get_membership_status(contest_id: int, user_profile: UserProfile, db: AsyncSession) -> ContestUserStatus:
    if not user_profile:
        contest_exception.not_authenticated()

    contest = await contest_repo.find_contest_by_id(contest_id, db)
    if not contest:
        contest_exception.contest_not_found()

    organization_contest = await contest_repo.find_organization_contest_by_contest_id(contest_id, db)
    is_admin_user = False
    if organization_contest:
        is_admin_user = await organization_service.is_organization_admin(organization_contest.organization_id,
                                                                         user_profile,
                                                                         db)

    requires_approval_policy = await contest_repo.get_policy(contest_id, db)
    if is_admin_user:
        return ContestUserStatus(
            contest_id=contest_id,
            user_id=user_profile.user_id,
            joined=True,
            joined_at=None,
            is_admin=True,
            status=APPROVED,
            requires_approval=False,
        )

    membership = await contest_repo.find_by_contest_and_user(contest_id, user_profile.user_id, db)
    return _build_status(
        contest_id,
        user_profile,
        membership,
        is_admin=False,
        requires_approval=requires_approval_policy,
    )


async def list_contest_users(contest_id: int, user_profile: UserProfile, db: AsyncSession) -> ContestUserListResponse:
    await _ensure_contest_permission(contest_id, user_profile, db)

    rows = await contest_repo.list_memberships(contest_id, db)
    approved: List[ContestUserDetail] = []
    pending: List[ContestUserDetail] = []

    for membership, user in rows:
        decided_at = membership.approved_at if membership.status == APPROVED else membership.updated_time
        detail = ContestUserDetail(
            user_id=membership.user_id,
            username=getattr(user, "username", None),
            status=membership.status,
            applied_at=membership.created_time,
            decided_at=decided_at,
            decided_by=membership.approved_by,
        )
        if membership.status == PENDING:
            pending.append(detail)
        elif membership.status == APPROVED:
            approved.append(detail)
    return ContestUserListResponse(approved=approved, pending=pending)


async def decide_contest_user(
        contest_id: int,
        user_id: int,
        action: str,
        user_profile: UserProfile,
        db: AsyncSession,
) -> ContestUserDetail:
    await _ensure_contest_permission(contest_id, user_profile, db)

    target_status = APPROVED if action == "approve" else REJECTED
    membership = await contest_repo.update_membership_status(
        contest_id,
        user_id,
        target_status,
        user_profile.user_id,
        db,
    )

    if membership is None:
        contest_exception.members_not_found()

    user = await user_repo.find_user_by_id(user_id, db)
    username = getattr(user, "username", None) if user else None
    decided_at = membership.approved_at if membership.status == APPROVED else membership.updated_time
    return ContestUserDetail(
        user_id=membership.user_id,
        username=username,
        status=membership.status,
        applied_at=membership.created_time,
        decided_at=decided_at,
        decided_by=membership.approved_by,
    )


def _has_contest_started(start_time: datetime | None) -> bool:
    normalized_start = _normalize_datetime(start_time)
    if normalized_start is None:
        return False
    now = datetime.now(timezone.utc)
    return now >= normalized_start


def _has_contest_ended(end_time: datetime | None) -> bool:
    normalized_end = _normalize_datetime(end_time)
    if normalized_end is None:
        return False

    now = datetime.now(timezone.utc)
    return now > normalized_end


def _build_status(
        contest_id: int,
        user_profile: UserProfile,
        membership: ContestUser | None,
        *,
        is_admin: bool,
        requires_approval: bool,
) -> ContestUserStatus:
    status = membership.status if membership else (APPROVED if is_admin else None)
    joined = (status == APPROVED) or is_admin
    joined_at = membership.created_time if membership else None
    requires_approval_flag = requires_approval and status == PENDING
    return ContestUserStatus(
        contest_id=contest_id,
        user_id=user_profile.user_id,
        joined=joined,
        joined_at=joined_at,
        is_admin=is_admin,
        status=status,
        requires_approval=requires_approval_flag,
    )


async def set_approval_policy(contest_id: int, requires_approval: bool, user_profile: UserProfile,
                              db: AsyncSession) -> ContestApprovalPolicy:
    await _ensure_contest_permission(contest_id, user_profile, db)
    await contest_repo.upsert_policy(contest_id, requires_approval, db)
    return ContestApprovalPolicy(contest_id=contest_id, requires_approval=requires_approval)


async def get_approval_policy(contest_id: int, db: AsyncSession) -> ContestApprovalPolicy:
    contest = await contest_repo.find_contest_by_id(contest_id, db)
    if not contest:
        contest_exception.contest_not_found()
    requires = await contest_repo.get_policy(contest_id, db)
    return ContestApprovalPolicy(contest_id=contest_id, requires_approval=requires)


async def _ensure_contest_permission(contest_id: int, user_profile: UserProfile, db: AsyncSession):
    contest = await contest_repo.find_contest_by_id(contest_id, db)
    if not contest:
        contest_exception.contest_not_found()
    org_contest = await contest_repo.find_organization_contest_by_contest_id(contest_id, db)
    if org_contest:
        await organization_service.check_organization_admin(org_contest.organization_id, user_profile, db)
    else:
        if user_profile.admin_type not in ["Admin", "Super Admin"]:
            contest_exception.permission_denied()


# =====================================================================================================================
async def create_announcement(contest_id, request_data, user_profile, db):
    organization_contest = await contest_repo.find_organization_contest_by_contest_id(contest_id, db)
    if not organization_contest:
        contest_exception.contest_not_found()
    await organization_service.is_organization_admin(organization_contest.organization_id, user_profile, db)
    entity = ContestAnnouncement(
        title=request_data.title,
        content=request_data.content,
        visible=request_data.visible,
        contest_id=contest_id,
        created_by_id=user_profile.user_id,
    )
    await contest_repo.save_announcement(entity, db)
    return ContestAnnouncementResponse.from_entity(entity, user_profile.username)


async def update_announcement(contest_id, announcement_id, request_data, user_profile, db):
    organization_contest = await contest_repo.find_organization_contest_by_contest_id(contest_id, db)
    if not organization_contest:
        contest_exception.contest_not_found()
    await organization_service.is_organization_admin(organization_contest.organization_id, user_profile, db)
    announcement = await contest_repo.find_announcement_by_announcement_id(announcement_id, db)
    if not announcement:
        contest_exception.contest_announcement_not_found()
    announcement.title = request_data.title
    announcement.content = request_data.content
    announcement.visible = request_data.visible
    announcement = await contest_repo.save_announcement(announcement, db)
    return ContestAnnouncementResponse.from_entity(announcement, user_profile.username)


async def delete_announcement(contest_id, announcement_id, user_profile, db):
    organization_contest = await contest_repo.find_organization_contest_by_contest_id(contest_id, db)
    if not organization_contest:
        contest_exception.contest_not_found()
    announcement = await contest_repo.find_announcement_by_announcement_id(announcement_id, db)
    if not announcement:
        contest_exception.contest_announcement_not_found()
    await contest_repo.delete_contest_announcement_by_announcement_id(announcement.id, db)
    await organization_service.is_organization_admin(organization_contest.organization_id, user_profile, db)
    return


async def get_contest_problem(contest_id, problem_id, user_profile, db):
    contest = await contest_repo.find_contest_by_id(contest_id, db)
    if not contest:
        contest_exception.contest_not_found()
    if not await ensure_user_joined_contest(contest_id, user_profile, db):
        contest_exception.contest_access_forbidden()
    problem = await problem_repo.find_problems_by_contest_id_and_problem_id(contest_id, problem_id, db)
    if not problem:
        problem_exceptions.problem_not_found()
    return ProblemResponse.model_validate(problem)


async def ensure_user_joined_contest(contest_id, user_profile: UserProfile, db) -> bool:
    organization_contest = await contest_repo.find_organization_contest_by_contest_id(contest_id, db)
    if organization_contest and await organization_service.is_organization_admin(
            organization_contest.organization_id, user_profile, db):
        return True

    user: ContestUser = await contest_repo.find_contest_user_by_contest_id_and_user_id(
        contest_id, user_profile.user_id, db
    )
    if not user:
        return False
    return True


async def get_contest_progress(contest_id, user_profile, db) -> ContestProgressResponse:
    solved: int = await submission_repo.count_solved_problem_by_contest_id_and_user_id(contest_id, user_profile.user_id, db)
    score: int = await submission_repo.get_score_by_contest_id_and_user_id(contest_id, user_profile.user_id, db)
    total: int = await submission_repo.count_problem_by_contest_id(contest_id, db)
    return ContestProgressResponse(
        solved=solved,
        total=total,
        total_score=score
    )


async def reindex_contest_problems(contest_id: int, problem_ids: list[ContestProblemInputDTO], user_profile, db):
    contest: Contest = await contest_repo.find_contest_by_id(contest_id, db)
    if not contest or not contest.visible:
        contest_exception.contest_not_found()
    await _ensure_contest_permission(contest_id, user_profile, db)

    problem_list: list[Problem] = await problem_repo.find_problems_by_contest_id(db, contest_id)
    mapping = {p.problem_id: p.display_id for p in problem_ids}

    for problem in problem_list:
        problem._id = str(uuid.uuid4())
    await db.flush()
    for problem in problem_list:
        display_id = mapping.get(problem.id)
        if display_id is None:
            problem_exceptions.handlers.bad_request()
        problem._id = str(display_id)
    return