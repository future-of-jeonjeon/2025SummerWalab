from datetime import datetime, time, timedelta, date
import calendar
from sqlalchemy.ext.asyncio import AsyncSession
from app.todo import repository
from app.todo.schemas import (
    RecommendationsResponse, 
    GoalRecommendation, 
    TodoUpdate, 
    TodoResponse,
    SolveCountResponse,
    StreakResponse,
    DifficultyStatsResponse,
    DifficultyCount
)


async def get_user_todo(db: AsyncSession, user_id: int) -> TodoResponse | None:
    todo = await repository.get_todo_by_user_id(db, user_id)
    if todo:
        return TodoResponse.model_validate(todo)
    return None


async def set_user_todo(db: AsyncSession, user_id: int, data: TodoUpdate) -> TodoResponse:
    todo = await repository.upsert_todo(
        db, 
        user_id, 
        data.day_todo, 
        data.week_todo, 
        data.month_todo
    )
    return TodoResponse.model_validate(todo)


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
            GoalRecommendation(id="monthly_bronze_3", label="Bronze 문제 3개 풀기", type="TIER_SOLVE", target=3, unit="problem"),
            GoalRecommendation(id="monthly_mid_3", label="Mid 문제 3개 풀기", type="TIER_SOLVE", target=3, unit="problem"),
            GoalRecommendation(id="monthly_solve_10", label="10문제 풀기", type="SOLVE_COUNT", target=10, unit="problem"),
        ]
    )


async def get_user_stats(db: AsyncSession, user_id: int) -> SolveCountResponse:
    now = datetime.now()
    today_start = datetime.combine(now.date(), time.min)
    today_end = datetime.combine(now.date(), time.max)
    
    # 주간
    days_since_sunday = (now.weekday() + 1) % 7
    week_start = datetime.combine(now.date() - timedelta(days=days_since_sunday), time.min)
    week_end = datetime.combine(week_start.date() + timedelta(days=6), time.max)
    
    # 월간
    month_start = datetime.combine(now.date().replace(day=1), time.min)
    last_day = calendar.monthrange(now.year, now.month)[1]
    month_end = datetime.combine(now.date().replace(day=last_day), time.max)
    
    daily_count = len(await repository.get_solved_problem_ids_in_range(db, user_id, today_start, today_end))
    weekly_count = len(await repository.get_solved_problem_ids_in_range(db, user_id, week_start, week_end))
    monthly_count = len(await repository.get_solved_problem_ids_in_range(db, user_id, month_start, month_end))
    
    return SolveCountResponse(
        daily=daily_count,
        weekly=weekly_count,
        monthly=monthly_count
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
        if unique_dates[i-1] - unique_dates[i] == timedelta(days=1):
            streak += 1
        else:
            break
            
    return StreakResponse(streak=streak)


async def get_difficulty_stats_service(db: AsyncSession, user_id: int) -> DifficultyStatsResponse:
    stats_data = await repository.get_difficulty_stats(db, user_id)
    return DifficultyStatsResponse(stats=[DifficultyCount(**item) for item in stats_data])
