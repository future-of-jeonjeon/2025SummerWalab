import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import SessionLocal
from app.problem.models import Problem
from app.problem.schemas import ProblemImportPollingStatus
from app.problem import service as serv

async def test_polling():
    # just print the schema json dump to verify problem_id serialization
    status = ProblemImportPollingStatus(
        status="done",
        processed_problem=1,
        left_problem=0,
        all_problem=1,
        problem_id=123
    )
    print(status.model_dump_json())

if __name__ == "__main__":
    asyncio.run(test_polling())
