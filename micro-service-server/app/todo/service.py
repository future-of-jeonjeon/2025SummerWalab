from __future__ import annotations

import calendar
from datetime import date, datetime, time, timedelta
from typing import Any
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.todo import repository
from app.todo.schemas import (
    DifficultyCount,
    DifficultyStatsResponse,
    GoalPayload,
    GoalProgress,
    GoalRecommendation,
    GoalResponse,
    RecommendationsResponse,
    SolveCountResponse,
    StreakResponse,
    TodoResponse,
    TodoUpdate,
)


PERIOD_LABELS = {
    "daily": "일간",
    "weekly": "주간",
    "monthly": "월간",
}


def get_recommendations() -> RecommendationsResponse:
    return RecommendationsResponse(
        daily=[
            GoalRecommendation(id="daily_solve_1", label="하루 1문제 풀기", type="SOLVE_COUNT", target=1, unit="problem"),
            GoalRecommendation(id="daily_solve_2", label="하루 2문제 풀기", type="SOLVE_COUNT", target=2, unit="problem"),
            GoalRecommendation(id="daily_solve_3", label="하루 3문제 풀기", type="SOLVE_COUNT", target=3, unit="problem"),
        ],
        weekly=[
            GoalRecommendation(id="weekly_streak_3", label="3일 연속 학습 유지", type="STREAK", target=3, unit="day"),
            GoalRecommendation(id="weekly_streak_5", label="5일 연속 학습 유지", type="STREAK", target=5, unit="day"),
            GoalRecommendation(id="weekly_streak_7", label="매일 학습하기 (7일)", type="STREAK", target=7, unit="day"),
        ],
        monthly=[
            GoalRecommendation(id="monthly_bronze_3", label="Bronze 문제 3개 풀기", type="TIER_SOLVE", target=3, unit="problem", difficulty="Bronze"),
            GoalRecommendation(id="monthly_mid_3", label="Mid 문제 3개 풀기", type="TIER_SOLVE", target=3, unit="problem", difficulty="Mid"),
            GoalRecommendation(id="monthly_solve_10", label="10문제 풀기", type="SOLVE_COUNT", target=10, unit="problem"),
        ],
    )


def _period_bounds(period: str, now: datetime) -> tuple[datetime, datetime]:
    if period == "daily":
        return datetime.combine(now.date(), time.min), datetime.combine(now.date(), time.max)

    if period == "weekly":
        days_since_sunday = (now.weekday() + 1) % 7
        week_start = datetime.combine(now.date() - timedelta(days=days_since_sunday), time.min)
        week_end = datetime.combine(week_start.date() + timedelta(days=6), time.max)
        return week_start, week_end

    month_start = datetime.combine(now.date().replace(day=1), time.min)
    last_day = calendar.monthrange(now.year, now.month)[1]
    month_end = datetime.combine(now.date().replace(day=last_day), time.max)
    return month_start, month_end


def _goal_unit(goal_type: str) -> str:
    return "day" if goal_type == "STREAK" else "problem"


def _goal_label(period: str, goal_type: str, target: int, difficulty: str | None = None) -> str:
    period_label = PERIOD_LABELS.get(period, "목표")
    if goal_type == "STREAK":
        return f"{period_label} {target}일 연속 출석"
    if goal_type == "TIER_SOLVE":
        difficulty_label = difficulty or "Bronze"
        return f"{period_label} {difficulty_label} 문제 {target}개 해결"
    return f"{period_label} {target}문제 해결"


def _legacy_recommendation_map() -> dict[str, GoalRecommendation]:
    recommendations = get_recommendations()
    all_items = [*recommendations.daily, *recommendations.weekly, *recommendations.monthly]
    return {item.id: item for item in all_items}


def _period_from_date_range(start_date: str | None, end_date: str | None) -> str:
    if not start_date or not end_date:
        return "monthly"
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        return "monthly"

    span_days = max((end - start).days + 1, 1)
    if span_days <= 1:
        return "daily"
    if span_days <= 7:
        return "weekly"
    return "monthly"


def _difficulty_from_label(label: str | None) -> str | None:
    if not label:
        return None
    if "Gold" in label:
        return "Gold"
    if "Mid" in label:
        return "Mid"
    if "Bronze" in label:
        return "Bronze"
    return None


def _normalize_goal_dict(raw: dict[str, Any], fallback_period: str | None = None) -> dict[str, Any]:
    period = raw.get("period") or fallback_period or "daily"
    goal_type = raw.get("type") or "SOLVE_COUNT"
    target = max(int(raw.get("target") or 1), 1)
    difficulty = raw.get("difficulty")
    if goal_type == "PROBLEM_SOLVE":
        goal_type = "SOLVE_COUNT"
    if goal_type != "TIER_SOLVE":
        difficulty = None
    else:
        difficulty = difficulty or _difficulty_from_label(raw.get("label")) or "Bronze"

    return {
        "id": str(raw.get("id") or uuid4()),
        "period": period,
        "type": goal_type,
        "target": target,
        "difficulty": difficulty,
        "unit": _goal_unit(goal_type),
        "label": _goal_label(period, goal_type, target, difficulty),
    }


def _legacy_goal_to_dict(value: str | None, fallback_period: str) -> dict[str, Any] | None:
    if not value:
        return None

    recommendation = _legacy_recommendation_map().get(value)
    if recommendation:
        return _normalize_goal_dict(
            {
                "id": recommendation.id,
                "period": fallback_period,
                "type": recommendation.type,
                "target": recommendation.target,
                "difficulty": recommendation.difficulty,
            },
            fallback_period=fallback_period,
        )

    if not value.startswith("CUSTOM:"):
        return None

    parts = value.split(":")
    goal_type = parts[1] if len(parts) > 1 else "SOLVE_COUNT"
    target = parts[2] if len(parts) > 2 else 1
    label = parts[4] if len(parts) > 4 else ""
    period = fallback_period
    if fallback_period == "monthly" and len(parts) > 6:
        period = _period_from_date_range(parts[5], parts[6])

    return _normalize_goal_dict(
        {
            "id": f"legacy-{fallback_period}-{uuid4()}",
            "period": period,
            "type": goal_type,
            "target": target,
            "label": label,
            "difficulty": _difficulty_from_label(label),
        },
        fallback_period=period,
    )


def _extract_stored_goals(todo: Any) -> list[dict[str, Any]]:
    goals = todo.goals or []
    if isinstance(goals, list) and goals:
        return [_normalize_goal_dict(goal) for goal in goals if isinstance(goal, dict)]

    legacy_goals = [
        _legacy_goal_to_dict(getattr(todo, "day_todo", None), "daily"),
        _legacy_goal_to_dict(getattr(todo, "week_todo", None), "weekly"),
        _legacy_goal_to_dict(getattr(todo, "month_todo", None), "monthly"),
        _legacy_goal_to_dict(getattr(todo, "custom_todo", None), "monthly"),
    ]
    return [goal for goal in legacy_goals if goal]


async def get_user_stats(db: AsyncSession, user_id: int) -> SolveCountResponse:
    now = datetime.now()
    daily_start, daily_end = _period_bounds("daily", now)
    weekly_start, weekly_end = _period_bounds("weekly", now)
    monthly_start, monthly_end = _period_bounds("monthly", now)

    daily_count = len(await repository.get_solved_problem_ids_in_range(db, user_id, daily_start, daily_end))
    weekly_count = len(await repository.get_solved_problem_ids_in_range(db, user_id, weekly_start, weekly_end))
    monthly_count = len(await repository.get_solved_problem_ids_in_range(db, user_id, monthly_start, monthly_end))

    return SolveCountResponse(
        daily=daily_count,
        weekly=weekly_count,
        monthly=monthly_count,
    )


async def get_user_streak(db: AsyncSession, user_id: int) -> StreakResponse:
    ac_datetimes = await repository.get_all_ac_dates(db, user_id)
    if not ac_datetimes:
        return StreakResponse(streak=0)

    unique_dates = sorted(list(set(dt.date() for dt in ac_datetimes)), reverse=True)
    today = date.today()
    yesterday = today - timedelta(days=1)

    if unique_dates[0] < yesterday:
        return StreakResponse(streak=0)

    streak = 1
    for i in range(1, len(unique_dates)):
        if unique_dates[i - 1] - unique_dates[i] == timedelta(days=1):
            streak += 1
        else:
            break

    return StreakResponse(streak=streak)


async def get_difficulty_stats_service(db: AsyncSession, user_id: int) -> DifficultyStatsResponse:
    stats_data = await repository.get_difficulty_stats(db, user_id)
    return DifficultyStatsResponse(stats=[DifficultyCount(**item) for item in stats_data])


async def _goal_progress(
    db: AsyncSession,
    user_id: int,
    goal: dict[str, Any],
    solve_cache: dict[str, int],
    difficulty_cache: dict[tuple[str, str], int],
    streak_cache: dict[str, int],
) -> GoalProgress:
    goal_type = goal["type"]
    period = goal["period"]
    target = max(int(goal["target"]), 1)

    if goal_type == "STREAK":
        if "value" not in streak_cache:
            streak_cache["value"] = (await get_user_streak(db, user_id)).streak
        current = streak_cache["value"]
    elif goal_type == "TIER_SOLVE":
        difficulty = goal.get("difficulty") or "Bronze"
        cache_key = (period, difficulty)
        if cache_key not in difficulty_cache:
            now = datetime.now()
            start_time, end_time = _period_bounds(period, now)
            difficulty_cache[cache_key] = await repository.get_difficulty_count_in_range(
                db,
                user_id,
                start_time,
                end_time,
                difficulty,
            )
        current = difficulty_cache[cache_key]
    else:
        if period not in solve_cache:
            now = datetime.now()
            start_time, end_time = _period_bounds(period, now)
            solve_cache[period] = len(await repository.get_solved_problem_ids_in_range(db, user_id, start_time, end_time))
        current = solve_cache[period]

    percent = min(round((current / target) * 100), 100)
    return GoalProgress(current=current, percent=percent)


async def _build_goal_responses(db: AsyncSession, user_id: int, goals: list[dict[str, Any]]) -> list[GoalResponse]:
    solve_cache: dict[str, int] = {}
    difficulty_cache: dict[tuple[str, str], int] = {}
    streak_cache: dict[str, int] = {}

    responses: list[GoalResponse] = []
    for goal in goals:
        normalized = _normalize_goal_dict(goal)
        progress = await _goal_progress(db, user_id, normalized, solve_cache, difficulty_cache, streak_cache)
        responses.append(
            GoalResponse(
                id=normalized["id"],
                period=normalized["period"],
                type=normalized["type"],
                target=normalized["target"],
                unit=normalized["unit"],
                difficulty=normalized.get("difficulty"),
                label=normalized["label"],
                progress=progress,
            )
        )
    return responses


async def get_user_todo(db: AsyncSession, user_id: int) -> TodoResponse:
    todo = await repository.get_todo_by_user_id(db, user_id)
    if not todo:
        return TodoResponse(goals=[])

    goals = _extract_stored_goals(todo)
    return TodoResponse(goals=await _build_goal_responses(db, user_id, goals))


async def set_user_todo(db: AsyncSession, user_id: int, data: TodoUpdate) -> TodoResponse:
    normalized_goals = [_normalize_goal_dict(goal.model_dump()) for goal in data.goals]
    await repository.upsert_todo(
        db,
        user_id,
        day_todo=None,
        week_todo=None,
        month_todo=None,
        custom_todo=None,
        goals=normalized_goals,
    )
    return TodoResponse(goals=await _build_goal_responses(db, user_id, normalized_goals))
