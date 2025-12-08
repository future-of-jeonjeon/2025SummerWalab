from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contest.models import Contest
from app.problem.models import Problem
from app.submission.models import Submission


async def fetch_contest(db: AsyncSession, contest_id: int) -> Contest | None:
    return await db.get(Contest, contest_id)


async def fetch_contest_problems(db: AsyncSession, contest_id: int) -> List[Problem]:
    stmt = (
        select(Problem)
        .where(Problem.contest_id == contest_id)
        .where(Problem.visible.is_(True))
    )
    rows = await db.execute(stmt)
    problems = list(rows.scalars().all())

    def sort_key(p: Problem):
        # Ensure consistent type to avoid TypeError when mixing int/str
        s = "" if p._id is None else str(p._id)
        try:
            n = int(s)
            return (0, n)
        except Exception:
            return (1, s)

    problems.sort(key=sort_key)
    return problems


async def fetch_contest_submissions(db: AsyncSession, contest_id: int) -> List[Submission]:
    stmt = select(Submission).where(Submission.contest_id == contest_id)
    rows = await db.execute(stmt)
    return list(rows.scalars().all())


def build_problem_score_map(problems: List[Problem]) -> Dict[int, Dict[str, object]]:
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


def compute_submission_partial(submission: Submission, case_scores: Dict[int, int]) -> Tuple[int, int, int]:
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


def aggregate_best_scores(
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
        partial, passed, total = compute_submission_partial(s, case_scores)
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
            user_map[pid] = {
                "score": partial,
                "passed": passed,
                "total": total,
                "best_time": s.create_time if isinstance(s.create_time, datetime) else None,
            }
    return best
