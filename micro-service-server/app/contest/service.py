from ipaddress import ip_network
from typing import Union

from sqlalchemy.ext.asyncio import AsyncSession

import app.contest.repository as contest_repo
import app.problem.repository as problem_repo
import app.submission.repository as submission_repo
import app.user.repository as user_repo
import app.utils.exception as exception
from app.contest.models import Contest, ContestLanguage
from app.contest.schemas import *
from app.problem.models import Problem
from app.user.schemas import UserData
from app.utils.database import transactional
from app.utils.logging import logger


def _check_contest_options(dto: Union[ReqCreateContestDTO, ReqUpdateContestDTO]):
    if dto.end_time <= dto.start_time:
        exception.bad_request(message="Start time must occur earlier than end time")

    if not dto.password:
        dto.password = None

    for ip_range in dto.allowed_ip_ranges:
        try:
            ip_network(ip_range, strict=False)
        except ValueError:
            exception.bad_request(message=f"{ip_range} is not a valid cidr network")


@transactional
async def create_contest(create_contest_dto: ReqCreateContestDTO, user_data: UserData,
                         db: AsyncSession) -> ResContestCreateDTO:
    _check_contest_options(create_contest_dto)
    contest = _create_contest_entity_from_dto(create_contest_dto, user_data.user_id)
    contest = await contest_repo.create_contest(contest, db)
    contest_language = ContestLanguage(contest_id=contest.id, languages=create_contest_dto.languages)
    await contest_repo.create_contest_language(contest_language, db)

    return await _create_contest_req_dto_from_entity(contest, create_contest_dto.languages, db)


@transactional
async def update_contest(update_contest_dto: ReqUpdateContestDTO,
                         db: AsyncSession) -> ResContestCreateDTO:
    contest = await contest_repo.find_contest_by_id(update_contest_dto.id, db)
    if not contest:
        exception.data_not_found("contest")

    _check_contest_options(update_contest_dto)
    await _update_contest_data(contest, update_contest_dto)
    await contest_repo.update_contest(contest, db)

    contest_language = await contest_repo.find_contest_language_by_contest_id(contest.id, db)
    if contest_language:
        contest_language.languages = update_contest_dto.languages
    else:  # 없는 경우 생성 -> 레거시 데이터 보존
        contest_language = ContestLanguage(contest_id=contest.id, languages=update_contest_dto.languages)
        await contest_repo.create_contest_language(contest_language, db)
    
    # Sync languages for all problems in this contest
    await problem_repo.update_problem_languages_by_contest_id(db, contest.id, update_contest_dto.languages)

    return await _create_contest_req_dto_from_entity(contest, update_contest_dto.languages, db)


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


async def get_contest_detail(contest_id: int, db: AsyncSession) -> ResContestCreateDTO:
    contest = await contest_repo.find_contest_by_id(contest_id, db)
    if not contest:
        exception.data_not_found("contest")

    contest_language = await contest_repo.find_contest_language_by_contest_id(contest_id, db)
    languages = contest_language.languages if contest_language else []
    return await _create_contest_req_dto_from_entity(contest, languages, db)


@transactional
async def add_contest_problem(contest_problem_dto: ReqAddContestProblemDTO, user_data: UserData, db: AsyncSession):
    contest = await contest_repo.find_contest_by_id(contest_problem_dto.contest_id, db)
    contest_language = await contest_repo.find_contest_language_by_contest_id(contest_problem_dto.contest_id, db)
    problem = await problem_repo.find_problem_with_tags_by_id(contest_problem_dto.problem_id, db)

    if not contest:
        exception.data_not_found("contest")
    if not contest_language:
        exception.data_not_found("contest_language")

    if not problem:
        exception.data_not_found("problem")

    if contest.end_time <= datetime.now():
        exception.bad_request(message="Contest has ended")

    if contest_repo.exists_display_id_in_contest(contest.id, contest_problem_dto.display_id, db):
        exception.data_conflict(data="display_id")

    new_problem = _create_cloned_problem_entity(problem, contest.id, contest_problem_dto.display_id, user_data.user_id,
                                                contest_language.languages)
    new_problem.tags = list(problem.tags)
    await problem_repo.create_problem(new_problem, db)
    return None


@transactional
async def delete_contest(contest_id: int, db: AsyncSession):
    contest = await contest_repo.find_contest_by_id(contest_id, db)
    if not contest:
        exception.data_not_found("contest")

    await contest_repo.delete_contest_languages(contest_id, db)
    await contest_repo.delete_contest_users(contest_id, db)
    await contest_repo.delete_contest_problems(contest_id, db)
    await contest_repo.delete_contest(contest_id, db)


async def get_participated_contest_by_user(user_date: UserData, db: AsyncSession):
    contests = await contest_repo.get_participated_contest_by_user_id(user_date.user_id, db)
    return [
        ContestDTO(
            contest_id=c.id,
            title=c.title,
            start_time=c.start_time,
            end_time=c.end_time,
        )
        for c in contests
    ]


async def _get_contest_and_raw_ranks(contest_id: int, db: AsyncSession):
    contest = await db.get(Contest, contest_id)
    if not contest:
        logger.warning(f"Contest not found: {contest_id}")
        return None, None

    if contest.rule_type == "ACM":
        raw_ranks = await contest_repo.get_acm_contest_rank(contest_id, db)
    else:
        raw_ranks = await contest_repo.get_oi_contest_rank(contest_id, db)

    return contest, raw_ranks


async def get_contest_rank_public(contest_id: int, db: AsyncSession):
    logger.info(f"Fetching public rank for contest {contest_id}")
    return await _get_contest_ranks(contest_id, True, db)


async def get_contest_rank_admin(contest_id: int, db: AsyncSession):
    logger.info(f"Fetching admin rank for contest {contest_id}")
    return await _get_contest_ranks(contest_id, False, db)


async def _get_contest_ranks(contest_id: int, anonymize_username: bool, db: AsyncSession):
    contest, raw_ranks = await _get_contest_and_raw_ranks(contest_id, db)
    if not contest:
        exception.data_not_found("contest")

    scores_list = await submission_repo.fetch_contest_user_scores(db, contest_id)
    score_map = {item["user_id"]: item["total_score"] for item in scores_list}
    result: list[ContestRankDTO] = []

    for rank, user, userdata in raw_ranks:
        user_dto = _build_user_dto(user, anonymize_username)
        total_score = score_map.get(user.id, 0)
        dto = ContestRankDTO(
            user=user_dto,
            submission_info=rank.submission_info,
            total_score=total_score,
            accepted_number=getattr(rank, "accepted_number", 0),
            total_time=getattr(rank, "total_time", 0),
        )
        result.append(dto)

    return result


def _build_user_dto(user, anonymize_username: bool) -> ContestRankUserDTO:
    if anonymize_username:
        masked = "Unknown"
        if user.username:
            masked = user.username[0] + "*" * (len(user.username) - 1)

        return ContestRankUserDTO(
            id=user.id,
            username=masked,
            real_name=None,
        )
    return ContestRankUserDTO(
        id=user.id,
        username=user.username,
        real_name=None
    )


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


async def _create_contest_req_dto_from_entity(contest: Contest, languages: List[str], db):
    creator_user = await user_repo.find_user_by_id(contest.created_by_id, db)
    created_by_dto = ContestCreatedByDTO(
        id=creator_user.id,
        username=creator_user.username,
    )
    return ResContestCreateDTO(
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
        createdBy=created_by_dto,
        languages=languages
    )


async def _process_contest_response(results, total: int, db: AsyncSession) -> PaginatedContestResponse:
    dtos = []
    for contest, languages, user, userdata in results:
        dto = await _create_contest_req_dto_from_entity(contest, languages if languages else [], db)
        dtos.append(dto)
    return PaginatedContestResponse(results=dtos, total=total)


async def get_all_contests_admin(
        offset: int, limit: int, keyword: str, user_id: int, admin_type: str, db: AsyncSession
) -> PaginatedContestResponse:
    created_by_id = None
    if admin_type != "Super Admin":
        created_by_id = user_id

    results, total = await contest_repo.get_contest_list(
        db, limit, offset, keyword, rule_type=None, status=None,
        created_by_id=created_by_id, visible_only=False
    )
    return await _process_contest_response(results, total, db)


async def get_contest_list_paginated(
        page: int, limit: int, keyword: str, rule_type: str, status: str, db: AsyncSession
) -> PaginatedContestResponse:
    offset = (page - 1) * limit
    results, total = await contest_repo.get_contest_list(db, limit, offset, keyword, rule_type, status)
    return await _process_contest_response(results, total, db)


def _create_cloned_problem_entity(original_problem: Problem, contest_id: int, display_id: str, user_id: int,
                                  languages: List[str]) -> Problem:
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
        statistic_info={}
    )
