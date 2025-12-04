from collections import defaultdict
from datetime import datetime, timedelta
from typing import Iterable, List

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.problem.models import Problem
from app.submission.models import Submission

JUDGE_STATUS_ACCEPTED = 0


async def fetch_contest_problem_stats(
        db: AsyncSession,
        contest_id: int,
        problem_ids: Iterable[int] | None = None,
) -> List[dict]:
    problem_id_list = list(problem_ids) if problem_ids is not None else []
    filters = [Submission.contest_id == contest_id]
    if problem_id_list:
        filters.append(Submission.problem_id.in_(problem_id_list))

    stmt = (
        select(
            Submission.problem_id.label("problem_id"),
            Problem._id.label("display_id"),
            func.count(Submission.id).label("submission_count"),
            func.count(func.distinct(Submission.user_id)).label("attempt_users"),
            func.count(
                func.distinct(
                    case(
                        (Submission.result == JUDGE_STATUS_ACCEPTED, Submission.user_id),
                        else_=None,
                    )
                )
            ).label("solved_users"),
        )
        .select_from(Submission)
        .join(Problem, Problem.id == Submission.problem_id)
        .where(*filters)
        .group_by(Submission.problem_id)
        .group_by(Problem._id)
    )

    rows = await db.execute(stmt)
    stats: List[dict] = []
    for row in rows:
        submissions = int(row.submission_count or 0)
        attempts = int(row.attempt_users or 0)
        solved = int(row.solved_users or 0)
        accuracy = float(solved) / float(attempts) if attempts else 0.0
        stats.append(
            {
                "contest_id": contest_id,
                "problem_id": int(row.problem_id),
                "display_id": str(row.display_id) if row.display_id is not None else None,
                "submission_count": submissions,
                "attempt_user_count": attempts,
                "solved_user_count": solved,
                "accuracy": accuracy,
            }
        )

    return stats


async def fetch_contest_user_scores(
        db: AsyncSession,
        contest_id: int,
) -> List[dict]:
    """
    Compute per-user contest scores based on submission info and problem test_case_score.
    - For each problem, find the submission with the highest partial score for that user.
    - Sum best scores across problems to get total_score.
    - Count problems where best score reached full score as solved_problems.
    """
    problem_scores: dict[int, dict[str, object]] = {}
    stmt_problem = select(Problem.id, Problem.test_case_score).where(Problem.contest_id == contest_id)
    problem_rows = await db.execute(stmt_problem)
    for row in problem_rows:
        scores_list = row.test_case_score or []
        case_scores: dict[int, int] = {}
        full_score = 0
        for idx, item in enumerate(scores_list, start=1):
            try:
                score = int(item.get("score", 0))
            except Exception:
                score = 0
            case_scores[idx] = max(score, 0)
            full_score += max(score, 0)
        problem_scores[int(row.id)] = {
            "case_scores": case_scores,
            "full_score": full_score,
        }

    if not problem_scores:
        return []

    stmt_submissions = select(
        Submission.user_id,
        Submission.problem_id,
        Submission.info,
    ).where(Submission.contest_id == contest_id)
    submission_rows = await db.execute(stmt_submissions)

    best_scores: dict[int, dict[int, int]] = defaultdict(dict)

    for row in submission_rows:
        pid = int(row.problem_id)
        if pid not in problem_scores:
            continue
        score_meta = problem_scores[pid]
        case_scores: dict[int, int] = score_meta["case_scores"]
        info = row.info or {}
        data_list = info.get("data") if isinstance(info, dict) else None
        if not isinstance(data_list, list):
            continue
        partial_score = 0
        for item in data_list:
            try:
                tc_id = int(item.get("test_case"))
                result = int(item.get("result"))
            except Exception:
                continue
            if result == JUDGE_STATUS_ACCEPTED:
                partial_score += case_scores.get(tc_id, 0)

        user_id = int(row.user_id)
        prev = best_scores[user_id].get(pid, 0)
        if partial_score > prev:
            best_scores[user_id][pid] = partial_score

    results: List[dict] = []
    for user_id, score_map in best_scores.items():
        total = 0
        solved = 0
        for pid, score in score_map.items():
            full_score = problem_scores.get(pid, {}).get("full_score", 0)
            total += score
            if full_score and score >= full_score:
                solved += 1
        results.append(
            {
                "user_id": user_id,
                "total_score": total,
                "solved_problems": solved,
            }
        )

    return results


async def get_user_submissions_by_year(user_id: int, db: AsyncSession):
    one_year_ago = datetime.utcnow() - timedelta(days=365)
    result = await db.execute(
        select(func.date(Submission.create_time).label("date"),
               func.count().label("count"))
        .where(Submission.user_id == user_id,
               Submission.create_time >= one_year_ago)
        .group_by(func.date(Submission.create_time))
        .order_by(func.date(Submission.create_time)))
    return result.all()
