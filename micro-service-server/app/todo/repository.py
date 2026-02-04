from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.todo.models import Todo


async def get_todo_by_user_id(db: AsyncSession, user_id: int) -> Todo | None:
    stmt = select(Todo).where(Todo.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalars().first()


async def create_todo(db: AsyncSession, todo: Todo) -> Todo:
    db.add(todo)
    await db.commit()
    await db.refresh(todo)
    return todo


async def update_todo(db: AsyncSession, user_id: int, day_todo: str | None, week_todo: str | None, month_todo: str | None) -> Todo | None:
    stmt = (
        update(Todo)
        .where(Todo.user_id == user_id)
        .values(
            day_todo=day_todo,
            week_todo=week_todo,
            month_todo=month_todo
        )
        .returning(Todo)
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.scalars().first()


async def upsert_todo(db: AsyncSession, user_id: int, day_todo: str | None, week_todo: str | None, month_todo: str | None) -> Todo:
    existing = await get_todo_by_user_id(db, user_id)
    if existing:
        new_day = day_todo if day_todo is not None else existing.day_todo
        new_week = week_todo if week_todo is not None else existing.week_todo
        new_month = month_todo if month_todo is not None else existing.month_todo
        
        existing.day_todo = new_day
        existing.week_todo = new_week
        existing.month_todo = new_month
        
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
        return existing
    else:
        new_todo = Todo(
            user_id=user_id,
            day_todo=day_todo,
            week_todo=week_todo,
            month_todo=month_todo
        )
        return await create_todo(db, new_todo)


async def get_solved_problem_ids_in_range(db: AsyncSession, user_id: int, start_time: datetime, end_time: datetime) -> set[int]:
    # 특정 기간이 주어지면 그안에 해결한거 가져오기
    from app.submission.models import Submission
    
    stmt = (
        select(Submission.problem_id)
        .where(
            Submission.user_id == user_id,
            Submission.result == 0,
            Submission.create_time >= start_time,
            Submission.create_time <= end_time
        )
        .distinct()
    )
    result = await db.execute(stmt)
    return set(result.scalars().all())


async def get_all_ac_dates(db: AsyncSession, user_id: int) -> list[datetime]:
    # 연속 출석 계산 -> 제출날짜 조회
    from app.submission.models import Submission
    
    stmt = (
        select(Submission.create_time)
        .where(
            Submission.user_id == user_id,
            Submission.result == 0
        )
        .order_by(Submission.create_time.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_difficulty_stats(db: AsyncSession, user_id: int) -> list[dict]:
    # 난이도별 해결 문제 수 조회
    from app.submission.models import Submission
    from app.problem.models import Problem
    from sqlalchemy import func
    
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
