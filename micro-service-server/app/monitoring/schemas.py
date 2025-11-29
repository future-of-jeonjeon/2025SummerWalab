from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class JudgeServerStatus(BaseModel):
    hostname: str
    ip: Optional[str]
    cpu_core: int
    cpu_usage: float
    memory_usage: float
    last_heartbeat: datetime
    heartbeat_lag: float
    status: str
    task_number: int
    service_url: Optional[str]

class SubmissionHistoryItem(BaseModel):
    time: str
    count: int

class SystemMetrics(BaseModel):
    max_wait_time: float
    queue_size: int
    submission_rate: int
    history: List[SubmissionHistoryItem]
    timestamp: datetime

class MonitoringResponse(BaseModel):
    max_wait_time:int
    queue_size: int
    submission_rate: int
    history: List[SubmissionHistoryItem]
    timestamp: datetime
