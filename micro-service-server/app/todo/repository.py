from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.todo.models import Goal, GoalType, Todo


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
