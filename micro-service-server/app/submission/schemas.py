from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ContestProblemStat(BaseModel):
    contest_id: int = Field(..., description="Contest identifier")
    problem_id: int = Field(..., description="Problem identifier")
    display_id: str | None = Field(None, description="Problem display id (_id) if available")
    submission_count: int = Field(..., ge=0, description="Total submissions for this problem in the contest")
    attempt_user_count: int = Field(..., ge=0,
                                    description="Distinct users who submitted for this problem in the contest")
    solved_user_count: int = Field(..., ge=0,
                                   description="Users with at least one accepted submission for this problem in the contest")
    accuracy: float = Field(..., ge=0.0, le=1.0, description="Solved users / attempt users ratio (0~1)")

    class Config:
        from_attributes = True


class SubmissionListResponse(BaseModel):
    id: str
    create_time: datetime
    result: int
    contest_id: Optional[int] = None
    problem_id: int
    user_id: int
    execution_time: Optional[int] = None
    memory: Optional[int] = None

class ContestProblemStatList(BaseModel):
    contest_id: int
    stats: List[ContestProblemStat]


class ContestUserScore(BaseModel):
    user_id: int = Field(..., description="User identifier")
    total_score: int = Field(..., ge=0, description="Total accumulated score for the contest")
    solved_problems: int = Field(..., ge=0, description="Number of problems fully solved (full score)")


class ContestScoreBoard(BaseModel):
    contest_id: int
    scores: List[ContestUserScore]


class SubmissionDailyCount(BaseModel):
    date: date
    count: int
