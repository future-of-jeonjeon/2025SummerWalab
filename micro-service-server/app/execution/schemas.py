from pydantic import BaseModel, Field
from typing import Any, Dict, Optional

class RunRequest(BaseModel):
    language: str = Field(..., description="Language name : Python3, C, C++, JavaScript, Golang")
    code: str = Field(..., description="Source code to execute")
    input: str = Field("", description="Stdin for the program")

class RunCodeRequest(BaseModel):
    language: str
    src: str
    stdin: str
    max_cpu_time: int
    max_memory_mb: int