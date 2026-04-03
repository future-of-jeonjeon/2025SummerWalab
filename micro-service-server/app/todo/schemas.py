from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from app.todo.models import GoalPeriod, GoalType


GoalDifficulty = int


class GoalPayload(BaseModel):
    id: Optional[str] = None
    period: GoalPeriod
    type: GoalType
    target: int = Field(default=1, ge=1)
    difficulty: Optional[GoalDifficulty] = Field(default=None, ge=1, le=5)
    custom_days: Optional[int] = Field(default=None, ge=1, le=365)

    @model_validator(mode="after")
    def validate_goal(self):
        if self.period == GoalPeriod.CUSTOM and not self.custom_days:
            raise ValueError("custom_days is required when period is custom")
        if self.period != GoalPeriod.CUSTOM:
            self.custom_days = None

        if self.type == GoalType.TIER_SOLVE and self.difficulty is None:
            raise ValueError("difficulty is required when type is TIER_SOLVE")
        if self.type != GoalType.TIER_SOLVE:
            self.difficulty = None

        if self.type == GoalType.ATTENDANCE and self.period == GoalPeriod.DAILY:
            raise ValueError("attendance goal is not allowed for daily period")

        return self


class GoalProgress(BaseModel):
    current: int
    percent: int


class GoalResponse(BaseModel):
    id: str
    period: GoalPeriod
    type: GoalType
    target: int
    count: int
    unit: str
    difficulty: Optional[GoalDifficulty] = None
    custom_days: Optional[int] = None
    start_day: date
    end_day: date
    label: str
    progress: GoalProgress


class TodoUpdate(BaseModel):
    goals: list[GoalPayload] = Field(default_factory=list)


class TodoResponse(BaseModel):
    goals: list[GoalResponse] = Field(default_factory=list)


class GoalRecommendation(BaseModel):
    id: str
    label: str
    type: GoalType
    target: int
    unit: str
    difficulty: Optional[GoalDifficulty] = None
    custom_days: Optional[int] = None


class RecommendationsResponse(BaseModel):
    daily: list[GoalRecommendation]
    weekly: list[GoalRecommendation]
    monthly: list[GoalRecommendation]


class SolveCountResponse(BaseModel):
    daily: int
    weekly: int
    monthly: int


class AttendanceSyncResponse(BaseModel):
    checked: bool
    checked_on: date


class DifficultyCount(BaseModel):
    difficulty: str
    count: int


class DifficultyStatsResponse(BaseModel):
    stats: list[DifficultyCount]
