from datetime import datetime

from pydantic import BaseModel
from typing import Optional, Literal


class ContestDTO(BaseModel):
    contest_id: int
    title: str
    start_time: datetime
    end_time: datetime


class UserSimpleDTO(BaseModel):
    id: int
    username: str
    real_name: Optional[str]
    student_id: Optional[str] = None


class SubmissionInfoDTO(BaseModel):
    is_ac: bool
    ac_time: Optional[float]
    error_number: int
    is_first_ac: bool


class ContestRankDTO(BaseModel):
    user: UserSimpleDTO
    total_score: Optional[int] = 0
    accepted_number: Optional[int] = 0
    total_time: Optional[int] = 0
    submission_info: dict  # Key is problem_id, Value is SubmissionInfoDTO or score (int)
