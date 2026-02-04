from typing import Optional
from pydantic import BaseModel, Field


class TodoBase(BaseModel):
    day_todo: Optional[str] = Field(None, description="Daily goal identifier or configuration")
    week_todo: Optional[str] = Field(None, description="Weekly goal identifier or configuration")
    month_todo: Optional[str] = Field(None, description="Monthly goal identifier or configuration")


class TodoCreate(TodoBase):
    pass


class TodoUpdate(TodoBase):
    pass


class TodoResponse(TodoBase):
    user_id: int

    class Config:
        from_attributes = True


class GoalRecommendation(BaseModel):
    id: str
    label: str
    type: str  # e.g., 'SOLVE_COUNT', 'STREAK'
    target: int
    unit: str  # e.g., 'problem', 'day'


class RecommendationsResponse(BaseModel):
    daily: list[GoalRecommendation]
    weekly: list[GoalRecommendation]
    monthly: list[GoalRecommendation]


class SolveCountResponse(BaseModel):
    daily: int
    weekly: int
    monthly: int


class StreakResponse(BaseModel):
    streak: int


class DifficultyCount(BaseModel):
    difficulty: str
    count: int


class DifficultyStatsResponse(BaseModel):
    stats: list[DifficultyCount]
