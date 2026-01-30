from datetime import datetime

from pydantic import BaseModel
from typing import Optional, List


class ContestDTO(BaseModel):
    contest_id: int
    title: str
    start_time: datetime
    end_time: datetime


class ContestCreatedByDTO(BaseModel):
    id: int
    username: str
    realName: Optional[str] = None


class ContestDataDTO(BaseModel):
    id: int
    title: str
    description: str
    startTime: datetime
    endTime: datetime
    createTime: datetime
    ruleType: str
    visible: bool
    real_time_rank: bool
    allowed_ip_ranges: list[str]
    password: Optional[str] = None
    status: str
    createdBy: ContestCreatedByDTO
    participants: int
    languages: list[str]


class ReqCreateContestDTO(BaseModel):
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    rule_type: str
    password: Optional[str] = None
    visible: bool
    real_time_rank: bool
    allowed_ip_ranges: list[str]
    requires_approval: Optional[bool] = False
    languages: list[str]


class ReqUpdateContestDTO(BaseModel):
    id: int
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    rule_type: str
    password: Optional[str] = None
    visible: bool
    real_time_rank: bool
    allowed_ip_ranges: list[str]
    requires_approval: Optional[bool] = False
    languages: list[str]


class ReqAddContestProblemDTO(BaseModel):
    contest_id: int
    problem_id: int
    display_id: str
    

class PaginatedContestResponse(BaseModel):
    results: List[ContestDataDTO]
    total: int
