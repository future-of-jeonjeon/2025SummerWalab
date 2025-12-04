from sqlalchemy.ext.asyncio import AsyncSession

import app.contest.repository as contest_repo
import app.submission.repository as submission_repo
from app.contest.schemas import ContestDTO, ContestRankDTO, UserSimpleDTO
from app.user.schemas import UserData
from app.contest.models import Contest


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
        return None, None

    if contest.rule_type == "ACM":
        raw_ranks = await contest_repo.get_acm_contest_rank(contest_id, db)
    else:
        raw_ranks = await contest_repo.get_oi_contest_rank(contest_id, db)

    return contest, raw_ranks


async def get_contest_rank_public(contest_id: int, db: AsyncSession):
    return await _get_contest_ranks(contest_id, True, db)


async def get_contest_rank_admin(contest_id: int, db: AsyncSession):
    return await _get_contest_ranks(contest_id, False, db)


async def _get_contest_ranks(contest_id: int, anonymize_username: bool, db: AsyncSession):
    contest, raw_ranks = await _get_contest_and_raw_ranks(contest_id, db)
    if not contest:
        return None

    # Pre-fetch scores for all users in the contest
    scores_list = await submission_repo.fetch_contest_user_scores(db, contest_id)
    score_map = {item["user_id"]: item["total_score"] for item in scores_list}

    result: list[ContestRankDTO] = []

    for rank, user, userdata in raw_ranks:
        user_dto = _build_user_dto(user, userdata, anonymize_username)
        
        # Get score from map, default to 0
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


def _build_user_dto(user, userdata, anonymize_username: bool) -> UserSimpleDTO:
    if anonymize_username:
        if user.username:
            masked = user.username[0] + "*" * (len(user.username) - 1)
        else:
            masked = "Unknown"

        return UserSimpleDTO(
            id=user.id,
            username=masked,
            real_name=None,
        )
    else:
        return UserSimpleDTO(
            id=user.id,
            username=user.username,
            real_name=userdata.name if userdata else None,
        )

    return total_score
