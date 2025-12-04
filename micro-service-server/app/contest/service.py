from sqlalchemy.ext.asyncio import AsyncSession

import app.contest.repository as contest_repo
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


async def get_contest_rank(contest_id: int, db: AsyncSession):
    contest = await db.get(Contest, contest_id)
    if not contest:
        return None

    if contest.rule_type == "ACM":
        raw_ranks = await contest_repo.get_acm_contest_rank(contest_id, db)
    else:
        raw_ranks = await contest_repo.get_oi_contest_rank(contest_id, db)

    result = []
    for rank, user, userdata in raw_ranks:
        name = user.username[0] + "*" * (len(user.username) - 1) if user.username else "Unknown"
        user_dto = UserSimpleDTO(
            id=user.id,
            username=name,
            real_name=userdata.name if userdata else None
        )

        dto = ContestRankDTO(
            user=user_dto,
            submission_info=rank.submission_info,
            total_score=getattr(rank, "total_score", 0),
            accepted_number=getattr(rank, "accepted_number", 0),
            total_time=getattr(rank, "total_time", 0)
        )
        result.append(dto)

    return result
