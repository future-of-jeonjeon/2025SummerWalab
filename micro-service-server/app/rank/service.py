from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Tuple
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.rank import repository as ranking_repository
import app.contest.repository as contest_repo
import app.submission.repository as submission_repo
from app.contest.models import Contest
from app.user.models import UserData
from app.problem.models import Problem
from app.submission.models import Submission


async def get_organization_rank(page: int, size: int, db: AsyncSession):
    return await ranking_repository.get_organizations_order_by_rank_acm(
        db=db,
        page=page,
        size=size,
    )


def _build_problem_score_map(problems: List[Problem]) -> Dict[int, Dict[str, object]]:
    """
    Return mapping: problem_id -> {full_score, case_scores}
    """
    result: Dict[int, Dict[str, object]] = {}
    for p in problems:
        scores = p.test_case_score or []
        case_scores: Dict[int, int] = {}
        full = 0
        for idx, item in enumerate(scores, start=1):
            try:
                score_val = int(item.get("score", 0))
            except Exception:
                score_val = 0
            score_val = max(score_val, 0)
            case_scores[idx] = score_val
            full += score_val
        result[p.id] = {"case_scores": case_scores, "full_score": full}
    return result


def _compute_submission_partial(submission: Submission, case_scores: Dict[int, int]) -> Tuple[int, int, int]:
    """
    Returns: (partial_score, passed_cases, total_cases)
    """
    info = submission.info or {}
    data_list = info.get("data") if isinstance(info, dict) else None
    if not isinstance(data_list, list):
        return 0, 0, 0
    passed = 0
    partial = 0
    for item in data_list:
        if not isinstance(item, dict):
            continue
        try:
            tc_id = int(item.get("test_case"))
        except Exception:
            continue
        raw_result = item.get("result")
        numeric = None
        try:
            numeric = int(raw_result)
        except Exception:
            pass
        success = (numeric == 0) or (isinstance(raw_result, str) and raw_result.strip().lower() in {"0", "ac", "accepted", "success", "ok"})
        if success:
            passed += 1
            partial += case_scores.get(tc_id, 0)
    total = len(data_list)
    return partial, passed, total


def _aggregate_best_scores(
        submissions: List[Submission],
        problem_score_map: Dict[int, Dict[str, object]],
) -> Dict[int, Dict[int, Dict[str, object]]]:
    """
    Returns: user_id -> problem_id -> {score, passed, total, best_time}
    """
    best: Dict[int, Dict[int, Dict[str, object]]] = defaultdict(dict)
    for s in submissions:
        pid = s.problem_id
        if pid not in problem_score_map:
            continue
        case_scores = problem_score_map[pid]["case_scores"]
        partial, passed, total = _compute_submission_partial(s, case_scores)
        if total == 0 and partial == 0:
            # No useful data
            continue

        user_map = best[s.user_id]
        existing = user_map.get(pid)
        better = False
        if not existing or partial > existing["score"]:
            better = True
        elif partial == existing["score"] and isinstance(s.create_time, datetime):
            if existing.get("best_time") is None:
                better = True
            elif s.create_time < existing["best_time"]:
                better = True

        if better:
            full_score = problem_score_map[pid]["full_score"]
            user_map[pid] = {
                "score": partial,
                "passed": passed,
                "total": total,
                "best_time": s.create_time if isinstance(s.create_time, datetime) else None,
                "is_ac": (full_score > 0 and partial >= full_score),
            }
    return best


async def get_contest_user_rank(contest_id: int, db: AsyncSession):
    contest = await contest_repo.find_contest_by_id(contest_id, db)
    if not contest:
        raise ValueError("Contest not found")

    problems = await ranking_repository.fetch_contest_problems(db, contest.id)
    problem_score_map = _build_problem_score_map(problems)
    submissions = await ranking_repository.fetch_contest_submissions(db, contest.id)
    best_scores = _aggregate_best_scores(submissions, problem_score_map)

    # Score map for total_score from submission repo
    scores_list = await submission_repo.fetch_contest_user_scores(db, contest.id)
    total_score_map = {item["user_id"]: item["total_score"] for item in scores_list}

    # Raw ranks (includes total_time)
    if contest.rule_type == "ACM":
        raw_ranks = await ranking_repository.get_acm_contest_rank(contest.id, db)
    else:
        raw_ranks = await ranking_repository.get_oi_contest_rank(contest.id, db)

    rows = []
    for rank_row, user, userdata in raw_ranks:
        total_score = total_score_map.get(user.id, 0)
        total_time = getattr(rank_row, "total_time", None)
        # Solve count recomputed from best_scores against full_score
        solved = 0
        user_best = best_scores.get(user.id, {})
        tie_time_candidates = []
        for pid, meta in user_best.items():
            full_score = problem_score_map.get(pid, {}).get("full_score", 0)
            if full_score and meta["score"] >= full_score:
                solved += 1
            # Only consider problems that contributed (>0 score) for tie-breaker
            if meta["score"] > 0 and meta.get("best_time"):
                tie_time_candidates.append(meta["best_time"])

        # Tie-breaker: earliest time when any scored problem was achieved (use latest among scored problems to represent completion)
        tie_time = None
        if tie_time_candidates:
            try:
                tie_time = max(tie_time_candidates)
            except Exception:
                tie_time = None

        # Build submission_info from user_best for consistency
        submission_info = {}
        if user_best:
            for pid, info in user_best.items():
                submission_info[str(pid)] = info

        rows.append(
            {
                "user_id": user.id,
                "username": user.username,
                "real_name": userdata.name if isinstance(userdata, UserData) else None,
                "student_id": userdata.student_id if isinstance(userdata, UserData) else None,
                "total_score": total_score,
                "total_time": total_time,
                "accepted_number": solved,
                "tie_time": tie_time,
                "submission_info": submission_info,
            }
        )

    # Sort: total_score desc, then earliest tie_time (based only on scored problems) asc, fallback to total_time asc, then user_id
    rows.sort(
        key=lambda x: (
            -x["total_score"],
            (x["tie_time"].timestamp() if isinstance(x.get("tie_time"), datetime) else float("inf")),
            float("inf") if x["total_time"] is None else float(x["total_time"]),
            x["user_id"],
        )
    )

    # Add 'rank' field to each row
    for i, row in enumerate(rows, start=1):
        row["rank"] = i

    return rows
