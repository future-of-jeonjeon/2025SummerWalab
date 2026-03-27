from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


GoalPeriod = Literal["daily", "weekly", "monthly"]
GoalType = Literal["SOLVE_COUNT", "STREAK", "TIER_SOLVE"]
GoalDifficulty = Literal["Bronze", "Mid", "Gold"]


class GoalPayload(BaseModel):
    id: Optional[str] = None
    period: GoalPeriod
    type: GoalType
    target: int = Field(..., ge=1)
    difficulty: Optional[GoalDifficulty] = None

    @model_validator(mode="after")
    def validate_difficulty(self):
        if self.type == "TIER_SOLVE" and not self.difficulty:
            raise ValueError("difficulty is required when type is TIER_SOLVE")
        if self.type != "TIER_SOLVE":
            self.difficulty = None
        return self


class GoalProgress(BaseModel):
    current: int
    percent: int


class GoalResponse(BaseModel):
    id: str
    period: GoalPeriod
    type: GoalType
    target: int
    unit: str
    difficulty: Optional[GoalDifficulty] = None
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
