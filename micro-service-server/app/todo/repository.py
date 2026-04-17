from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Float, case, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.todo.models import Goal, GoalType, Todo, TodoResult


async def get_todo_by_user_id(db: AsyncSession, user_id: int, *, with_goals: bool = False) -> Optional[Todo]:
    stmt = select(Todo).where(Todo.user_id == user_id)
    if with_goals:
        stmt = stmt.options(selectinload(Todo.goals))
    result = await db.execute(stmt)
    return result.scalars().first()


async def get_or_create_todo(db: AsyncSession, user_id: int) -> Todo:
    existing = await get_todo_by_user_id(db, user_id)
    if existing:
        return existing

    todo = Todo(user_id=user_id)
    db.add(todo)
    await db.flush()
    await db.refresh(todo)
    return todo


async def list_goals_by_todo_id(db: AsyncSession, todo_id: int) -> list[Goal]:
    stmt = (
        select(Goal)
        .where(Goal.todo_id == todo_id)
        .order_by(Goal.created_time.asc(), Goal.id.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def list_due_goals(db: AsyncSession, target_date: date, user_id: Optional[int] = None) -> list[Goal]:
    stmt = (
        select(Goal)
        .join(Todo, Todo.id == Goal.todo_id)
        .options(selectinload(Goal.todo))
        .where(Goal.end_day < target_date)
        .order_by(Goal.end_day.asc(), Goal.id.asc())
    )
    if user_id is not None:
        stmt = stmt.where(Todo.user_id == user_id)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def delete_goals_not_in_ids(db: AsyncSession, todo_id: int, keep_ids: set[int]) -> None:
    stmt = select(Goal).where(Goal.todo_id == todo_id)
    if keep_ids:
        stmt = stmt.where(Goal.id.notin_(keep_ids))
    result = await db.execute(stmt)
    for goal in result.scalars().all():
        await db.delete(goal)


async def get_solved_problem_ids_in_range(
    db: AsyncSession,
    user_id: int,
    start_time: datetime,
    end_time: datetime,
) -> set[int]:
    from app.submission.models import Submission

    stmt = (
        select(Submission.problem_id)
        .where(
            Submission.user_id == user_id,
            Submission.result == 0,
            Submission.create_time >= start_time,
            Submission.create_time <= end_time,
        )
        .distinct()
    )
    result = await db.execute(stmt)
    return set(result.scalars().all())


async def count_solved_problems_in_range(
    db: AsyncSession,
    user_id: int,
    start_time: datetime,
    end_time: datetime,
    difficulty: Optional[int] = None,
) -> int:
    from app.problem.models import Problem
    from app.submission.models import Submission

    stmt = (
        select(func.count(func.distinct(Submission.problem_id)))
        .select_from(Submission)
        .where(
            Submission.user_id == user_id,
            Submission.result == 0,
            Submission.create_time >= start_time,
            Submission.create_time <= end_time,
        )
    )

    if difficulty is not None:
        difficulty_text = str(difficulty)
        stmt = (
            stmt.join(Problem, Problem.id == Submission.problem_id)
            .where(
                or_(
                    Problem.difficulty == difficulty_text,
                    Problem.difficulty.ilike(f"%Lv.{difficulty_text}%"),
                    Problem.difficulty.ilike(f"%Lv. {difficulty_text}%"),
                )
            )
        )

    result = await db.execute(stmt)
    return int(result.scalar() or 0)


async def get_difficulty_stats(db: AsyncSession, user_id: int) -> list[dict]:
    from app.problem.models import Problem
    from app.submission.models import Submission

    subq = (
        select(Submission.problem_id)
        .where(Submission.user_id == user_id, Submission.result == 0)
        .distinct()
        .subquery()
    )

    stmt = (
        select(Problem.difficulty, func.count(Problem.id).label("count"))
        .join(subq, Problem.id == subq.c.problem_id)
        .group_by(Problem.difficulty)
    )
    result = await db.execute(stmt)
    return [{"difficulty": row[0], "count": row[1]} for row in result.all()]


async def get_difficulty_count_in_range(
    db: AsyncSession,
    user_id: int,
    start_time: datetime,
    end_time: datetime,
    difficulty: str,
) -> int:
    return await count_solved_problems_in_range(db, user_id, start_time, end_time, difficulty=int(difficulty))


def _goal_history_group_filters(
    *,
    period,
    goal_type,
    target_count: int,
    difficulty: Optional[int],
    custom_days: Optional[int],
):
    filters = [
        TodoResult.period == period,
        TodoResult.type == goal_type,
        TodoResult.target_count == target_count,
    ]
    filters.append(TodoResult.difficulty.is_(None) if difficulty is None else TodoResult.difficulty == difficulty)
    filters.append(TodoResult.custom_days.is_(None) if custom_days is None else TodoResult.custom_days == custom_days)
    return filters


async def list_goal_history_groups(db: AsyncSession, user_id: int) -> list[dict]:
    success_case = case((TodoResult.is_success.is_(True), 1), else_=0)
    stmt = (
        select(
            TodoResult.period,
            TodoResult.type,
            TodoResult.target_count,
            TodoResult.difficulty,
            TodoResult.custom_days,
            func.count(TodoResult.id).label("total_logged"),
            func.coalesce(func.sum(success_case), 0).label("success_count"),
            func.max(TodoResult.archived_at).label("latest_archived_at"),
        )
        .join(Todo, Todo.id == TodoResult.todo_id)
        .where(Todo.user_id == user_id)
        .group_by(
            TodoResult.period,
            TodoResult.type,
            TodoResult.target_count,
            TodoResult.difficulty,
            TodoResult.custom_days,
        )
        .order_by(func.max(TodoResult.archived_at).desc())
    )
    result = await db.execute(stmt)
    rows = []
    for row in result.all():
        total_logged = int(row.total_logged or 0)
        success_count = int(row.success_count or 0)
        rows.append({
            "period": row.period,
            "type": row.type,
            "target_count": int(row.target_count),
            "difficulty": row.difficulty,
            "custom_days": row.custom_days,
            "total_logged": total_logged,
            "success_count": success_count,
            "failure_count": max(total_logged - success_count, 0),
            "latest_archived_at": row.latest_archived_at,
        })
    return rows


async def count_goal_history_group_entries(
    db: AsyncSession,
    user_id: int,
    *,
    period,
    goal_type,
    target_count: int,
    difficulty: Optional[int],
    custom_days: Optional[int],
    start_day_from: Optional[date] = None,
    end_day_to: Optional[date] = None,
    is_success: Optional[bool] = None,
) -> int:
    filters = list(
        _goal_history_group_filters(
            period=period,
            goal_type=goal_type,
            target_count=target_count,
            difficulty=difficulty,
            custom_days=custom_days,
        )
    )
    if start_day_from is not None:
        filters.append(TodoResult.end_day >= start_day_from)
    if end_day_to is not None:
        filters.append(TodoResult.start_day <= end_day_to)
    if is_success is not None:
        filters.append(TodoResult.is_success.is_(is_success))

    stmt = (
        select(func.count(TodoResult.id))
        .join(Todo, Todo.id == TodoResult.todo_id)
        .where(
            Todo.user_id == user_id,
            *filters,
        )
    )
    result = await db.execute(stmt)
    return int(result.scalar() or 0)


async def list_goal_history_group_entries(
    db: AsyncSession,
    user_id: int,
    *,
    period,
    goal_type,
    target_count: int,
    difficulty: Optional[int],
    custom_days: Optional[int],
    offset: int,
    limit: int,
    start_day_from: Optional[date] = None,
    end_day_to: Optional[date] = None,
    is_success: Optional[bool] = None,
) -> list[TodoResult]:
    filters = list(
        _goal_history_group_filters(
            period=period,
            goal_type=goal_type,
            target_count=target_count,
            difficulty=difficulty,
            custom_days=custom_days,
        )
    )
    if start_day_from is not None:
        filters.append(TodoResult.end_day >= start_day_from)
    if end_day_to is not None:
        filters.append(TodoResult.start_day <= end_day_to)
    if is_success is not None:
        filters.append(TodoResult.is_success.is_(is_success))

    stmt = (
        select(TodoResult)
        .join(Todo, Todo.id == TodoResult.todo_id)
        .where(
            Todo.user_id == user_id,
            *filters,
        )
        .order_by(TodoResult.end_day.desc(), TodoResult.archived_at.desc(), TodoResult.id.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_goal_result_heatmap(
    db: AsyncSession,
    user_id: int,
    *,
    start_day: date,
) -> list[dict]:
    stmt = (
        select(
            TodoResult.end_day.label("date"),
            func.count(TodoResult.id).label("count"),
        )
        .join(Todo, Todo.id == TodoResult.todo_id)
        .where(
            Todo.user_id == user_id,
            TodoResult.is_success.is_(True),
            TodoResult.end_day >= start_day,
        )
        .group_by(TodoResult.end_day)
        .order_by(TodoResult.end_day.asc())
    )
    result = await db.execute(stmt)
    return [{"date": row.date, "count": int(row.count)} for row in result.all()]


async def get_goal_result_summary(db: AsyncSession, user_id: int) -> dict:
    average_percent = func.coalesce(
        func.avg(
            func.least(
                (cast(TodoResult.count, Float) * 100.0) / func.nullif(TodoResult.target_count, 0),
                100.0,
            )
        ),
        0.0,
    )
    success_case = case((TodoResult.is_success.is_(True), 1), else_=0)

    stmt = (
        select(
            func.count(TodoResult.id).label("total_logged"),
            func.coalesce(func.sum(success_case), 0).label("success_count"),
            average_percent.label("average_progress"),
        )
        .join(Todo, Todo.id == TodoResult.todo_id)
        .where(Todo.user_id == user_id)
    )
    result = await db.execute(stmt)
    row = result.one()

    total_logged = int(row.total_logged or 0)
    success_count = int(row.success_count or 0)
    failure_count = max(total_logged - success_count, 0)
    success_rate = round((success_count / total_logged) * 100) if total_logged else 0

    return {
        "total_logged": total_logged,
        "success_count": success_count,
        "failure_count": failure_count,
        "success_rate": success_rate,
        "average_progress": round(float(row.average_progress or 0)),
    }
