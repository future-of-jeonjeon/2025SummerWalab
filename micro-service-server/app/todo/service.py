from __future__ import annotations

import calendar
from datetime import date, datetime, time, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.todo import repository
from app.todo.models import Goal, GoalPeriod, GoalType, Todo, TodoResult
from app.todo.schemas import (
    AttendanceSyncResponse,
    DifficultyCount,
    DifficultyStatsResponse,
    GoalPayload,
    GoalProgress,
    GoalRecommendation,
    GoalResponse,
    RecommendationsResponse,
    SolveCountResponse,
    TodoResponse,
    TodoUpdate,
)


SEOUL_TZ = ZoneInfo("Asia/Seoul")
PERIOD_LABELS = {
    GoalPeriod.DAILY: "일간",
    GoalPeriod.WEEKLY: "주간",
    GoalPeriod.MONTHLY: "월간",
    GoalPeriod.CUSTOM: "커스텀",
}
FIXED_PERIOD_DAYS = {
    GoalPeriod.DAILY: 1,
    GoalPeriod.WEEKLY: 7,
    GoalPeriod.MONTHLY: 30,
}


def _kst_now() -> datetime:
    return datetime.now(SEOUL_TZ)


def _kst_today() -> date:
    return _kst_now().date()


def _period_bounds(period: GoalPeriod, now: datetime) -> tuple[datetime, datetime]:
    if period == GoalPeriod.DAILY:
        return datetime.combine(now.date(), time.min, tzinfo=SEOUL_TZ), datetime.combine(now.date(), time.max, tzinfo=SEOUL_TZ)

    if period == GoalPeriod.WEEKLY:
        days_since_sunday = (now.weekday() + 1) % 7
        week_start = datetime.combine(now.date() - timedelta(days=days_since_sunday), time.min, tzinfo=SEOUL_TZ)
        week_end = datetime.combine(week_start.date() + timedelta(days=6), time.max, tzinfo=SEOUL_TZ)
        return week_start, week_end

    month_start = datetime.combine(now.date().replace(day=1), time.min, tzinfo=SEOUL_TZ)
    last_day = calendar.monthrange(now.year, now.month)[1]
    month_end = datetime.combine(now.date().replace(day=last_day), time.max, tzinfo=SEOUL_TZ)
    return month_start, month_end


def _goal_unit(goal_type: GoalType) -> str:
    return "day" if goal_type == GoalType.ATTENDANCE else "problem"


def _period_days(period: GoalPeriod, custom_days: Optional[int]) -> int:
    if period == GoalPeriod.CUSTOM:
        return max(int(custom_days or 1), 1)
    return FIXED_PERIOD_DAYS[period]


def _period_label(period: GoalPeriod, custom_days: Optional[int]) -> str:
    if period != GoalPeriod.CUSTOM:
        return PERIOD_LABELS[period]
    return f"커스텀 { _period_days(period, custom_days) }일"


def _normalize_difficulty(raw: Optional[object]) -> Optional[int]:
    if raw is None:
        return None
    try:
        value = int(str(raw).replace("Lv.", "").strip())
    except ValueError:
        return None
    return min(max(value, 1), 5)


def _format_difficulty_label(difficulty: Optional[int]) -> str:
    return f"Lv.{_normalize_difficulty(difficulty) or 1}"


def _goal_label(
    period: GoalPeriod,
    goal_type: GoalType,
    target_count: int,
    difficulty: Optional[int] = None,
    custom_days: Optional[int] = None,
) -> str:
    period_label = _period_label(period, custom_days)
    if goal_type == GoalType.ATTENDANCE:
        return f"{period_label} 출석"
    if goal_type == GoalType.TIER_SOLVE:
        return f"{period_label} {_format_difficulty_label(difficulty)} 문제 {target_count}개 해결"
    return f"{period_label} {target_count}문제 해결"


def _window_from_goal(goal: Goal) -> tuple[datetime, datetime]:
    return (
        datetime.combine(goal.start_day, time.min, tzinfo=SEOUL_TZ),
        datetime.combine(goal.end_day, time.max, tzinfo=SEOUL_TZ),
    )


def _goal_target(
    period: GoalPeriod,
    goal_type: GoalType,
    requested_target: int,
    custom_days: Optional[int],
) -> int:
    if goal_type == GoalType.ATTENDANCE:
        return _period_days(period, custom_days)
    return max(int(requested_target or 1), 1)


def _calculate_percent(current: int, target: int) -> int:
    safe_target = max(target, 1)
    return min(round((current / safe_target) * 100), 100)


def _goal_payload_matches(goal: Goal, payload: GoalPayload) -> bool:
    normalized_difficulty = _normalize_difficulty(payload.difficulty)
    normalized_custom_days = payload.custom_days if payload.period == GoalPeriod.CUSTOM else None
    return (
        goal.period == payload.period
        and goal.type == payload.type
        and goal.target_count == _goal_target(payload.period, payload.type, payload.target, payload.custom_days)
        and goal.difficulty == normalized_difficulty
        and goal.custom_days == normalized_custom_days
    )


async def get_recommendations() -> RecommendationsResponse:
    return RecommendationsResponse(
        daily=[
            GoalRecommendation(id="daily_solve_1", label="하루 1문제 풀기", type=GoalType.SOLVE_COUNT, target=1, unit="problem"),
            GoalRecommendation(id="daily_solve_2", label="하루 2문제 풀기", type=GoalType.SOLVE_COUNT, target=2, unit="problem"),
            GoalRecommendation(id="daily_level_1_1", label="Lv.1 문제 1개 풀기", type=GoalType.TIER_SOLVE, target=1, unit="problem", difficulty=1),
        ],
        weekly=[
            GoalRecommendation(id="weekly_attendance", label="7일 출석 유지", type=GoalType.ATTENDANCE, target=7, unit="day"),
            GoalRecommendation(id="weekly_solve_5", label="5문제 해결", type=GoalType.SOLVE_COUNT, target=5, unit="problem"),
            GoalRecommendation(id="weekly_level_2_3", label="Lv.2 문제 3개 해결", type=GoalType.TIER_SOLVE, target=3, unit="problem", difficulty=2),
        ],
        monthly=[
            GoalRecommendation(id="monthly_attendance", label="30일 출석 유지", type=GoalType.ATTENDANCE, target=30, unit="day"),
            GoalRecommendation(id="monthly_solve_10", label="10문제 해결", type=GoalType.SOLVE_COUNT, target=10, unit="problem"),
            GoalRecommendation(id="monthly_level_4_5", label="Lv.4 문제 5개 해결", type=GoalType.TIER_SOLVE, target=5, unit="problem", difficulty=4),
        ],
    )


async def get_user_stats(db: AsyncSession, user_id: int) -> SolveCountResponse:
    now = _kst_now()
    daily_start, daily_end = _period_bounds(GoalPeriod.DAILY, now)
    weekly_start, weekly_end = _period_bounds(GoalPeriod.WEEKLY, now)
    monthly_start, monthly_end = _period_bounds(GoalPeriod.MONTHLY, now)

    daily_count = len(await repository.get_solved_problem_ids_in_range(db, user_id, daily_start, daily_end))
    weekly_count = len(await repository.get_solved_problem_ids_in_range(db, user_id, weekly_start, weekly_end))
    monthly_count = len(await repository.get_solved_problem_ids_in_range(db, user_id, monthly_start, monthly_end))

    return SolveCountResponse(daily=daily_count, weekly=weekly_count, monthly=monthly_count)


async def get_difficulty_stats_service(db: AsyncSession, user_id: int) -> DifficultyStatsResponse:
    stats_data = await repository.get_difficulty_stats(db, user_id)
    return DifficultyStatsResponse(stats=[DifficultyCount(**item) for item in stats_data])


async def _compute_goal_count(
    db: AsyncSession,
    user_id: int,
    goal: Goal,
    solve_cache: dict[tuple[date, date], int],
    difficulty_cache: dict[tuple[date, date, int], int],
) -> int:
    if goal.type == GoalType.ATTENDANCE:
        return goal.count

    start_time, end_time = _window_from_goal(goal)
    if goal.type == GoalType.TIER_SOLVE:
        difficulty = _normalize_difficulty(goal.difficulty) or 1
        cache_key = (goal.start_day, goal.end_day, difficulty)
        if cache_key not in difficulty_cache:
            difficulty_cache[cache_key] = await repository.count_solved_problems_in_range(
                db,
                user_id,
                start_time,
                end_time,
                difficulty=difficulty,
            )
        return difficulty_cache[cache_key]

    cache_key = (goal.start_day, goal.end_day)
    if cache_key not in solve_cache:
        solve_cache[cache_key] = await repository.count_solved_problems_in_range(
            db,
            user_id,
            start_time,
            end_time,
        )
    return solve_cache[cache_key]


async def _refresh_goal_counts(
    db: AsyncSession,
    user_id: int,
    goals: list[Goal],
) -> None:
    solve_cache: dict[tuple[date, date], int] = {}
    difficulty_cache: dict[tuple[date, date, int], int] = {}

    for goal in goals:
        next_count = await _compute_goal_count(db, user_id, goal, solve_cache, difficulty_cache)
        if goal.count != next_count:
            goal.count = next_count


async def _find_result(db: AsyncSession, goal_id: int, start_day: date, end_day: date) -> Optional[TodoResult]:
    stmt = select(TodoResult).where(
        TodoResult.goal_id == goal_id,
        TodoResult.start_day == start_day,
        TodoResult.end_day == end_day,
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def _archive_goal_result(db: AsyncSession, goal: Goal) -> bool:
    existing = await _find_result(db, goal.id, goal.start_day, goal.end_day)
    if existing:
        return False

    result = TodoResult(
        todo_id=goal.todo_id,
        goal_id=goal.id,
        period=goal.period,
        type=goal.type,
        target_count=goal.target_count,
        count=goal.count,
        difficulty=goal.difficulty,
        custom_days=goal.custom_days,
        start_day=goal.start_day,
        end_day=goal.end_day,
        is_success=goal.count >= goal.target_count,
    )
    db.add(result)
    return True


async def rollover_due_goals(
    db: AsyncSession,
    target_date: Optional[date] = None,
    user_id: Optional[int] = None,
) -> int:
    today = target_date or _kst_today()
    due_goals = await repository.list_due_goals(db, today, user_id=user_id)
    archived = 0

    for goal in due_goals:
        while goal.end_day < today:
            await _refresh_goal_counts(db, goal.todo.user_id, [goal])
            if await _archive_goal_result(db, goal):
                archived += 1

            next_start = goal.end_day + timedelta(days=1)
            next_duration = _period_days(goal.period, goal.custom_days)

            goal.start_day = next_start
            goal.end_day = next_start + timedelta(days=next_duration - 1)
            goal.target_count = _goal_target(goal.period, goal.type, goal.target_count, goal.custom_days)
            goal.count = 0

        if goal.type != GoalType.ATTENDANCE:
            await _refresh_goal_counts(db, goal.todo.user_id, [goal])

    return archived


def _goal_response(goal: Goal) -> GoalResponse:
    current = goal.count
    target = goal.target_count
    return GoalResponse(
        id=str(goal.id),
        period=goal.period,
        type=goal.type,
        target=target,
        count=current,
        unit=_goal_unit(goal.type),
        difficulty=_normalize_difficulty(goal.difficulty),
        custom_days=goal.custom_days,
        start_day=goal.start_day,
        end_day=goal.end_day,
        label=_goal_label(goal.period, goal.type, target, goal.difficulty, goal.custom_days),
        progress=GoalProgress(current=current, percent=_calculate_percent(current, target)),
    )


async def get_user_todo(db: AsyncSession, user_id: int) -> TodoResponse:
    todo = await repository.get_or_create_todo(db, user_id)
    await rollover_due_goals(db, user_id=user_id)
    goals = await repository.list_goals_by_todo_id(db, todo.id)
    await _refresh_goal_counts(db, user_id, goals)
    await db.flush()
    return TodoResponse(goals=[_goal_response(goal) for goal in goals])


async def set_user_todo(db: AsyncSession, user_id: int, data: TodoUpdate) -> TodoResponse:
    today = _kst_today()
    todo = await repository.get_or_create_todo(db, user_id)
    await rollover_due_goals(db, target_date=today, user_id=user_id)

    existing_goals = {goal.id: goal for goal in await repository.list_goals_by_todo_id(db, todo.id)}
    keep_ids: set[int] = set()

    for payload in data.goals:
        existing_goal: Optional[Goal] = None
        if payload.id and str(payload.id).isdigit():
            existing_goal = existing_goals.get(int(payload.id))

        if existing_goal and _goal_payload_matches(existing_goal, payload):
            keep_ids.add(existing_goal.id)
            continue

        goal = existing_goal or Goal(todo_id=todo.id)
        if existing_goal is None:
            db.add(goal)

        goal.period = payload.period
        goal.type = payload.type
        goal.target_count = _goal_target(payload.period, payload.type, payload.target, payload.custom_days)
        goal.difficulty = _normalize_difficulty(payload.difficulty)
        goal.custom_days = payload.custom_days if payload.period == GoalPeriod.CUSTOM else None
        goal.start_day = today
        goal.end_day = today + timedelta(days=_period_days(payload.period, payload.custom_days) - 1)
        goal.count = 0

        if goal.type == GoalType.ATTENDANCE and todo.last_attendance_on == today:
            goal.count = 1
        elif goal.type != GoalType.ATTENDANCE:
            await _refresh_goal_counts(db, user_id, [goal])

        if existing_goal is None:
            await db.flush()

        keep_ids.add(goal.id)

    await repository.delete_goals_not_in_ids(db, todo.id, keep_ids)
    await db.flush()
    goals = await repository.list_goals_by_todo_id(db, todo.id)
    await _refresh_goal_counts(db, user_id, goals)
    await db.flush()
    return TodoResponse(goals=[_goal_response(goal) for goal in goals])


async def sync_user_attendance(db: AsyncSession, user_id: int) -> AttendanceSyncResponse:
    today = _kst_today()
    todo = await repository.get_or_create_todo(db, user_id)
    await rollover_due_goals(db, target_date=today, user_id=user_id)

    if todo.last_attendance_on == today:
        return AttendanceSyncResponse(checked=False, checked_on=today)

    todo.last_attendance_on = today
    goals = await repository.list_goals_by_todo_id(db, todo.id)
    for goal in goals:
        if goal.type != GoalType.ATTENDANCE:
            continue
        if goal.start_day <= today <= goal.end_day:
            goal.count += 1

    await db.flush()
    return AttendanceSyncResponse(checked=True, checked_on=today)
