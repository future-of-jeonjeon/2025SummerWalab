import os, aioredis
from dotenv import load_dotenv

load_dotenv()
REDIS_URL = os.getenv("REDIS_URL")
redis_client = aioredis.from_url(REDIS_URL + "/1", decode_responses=True)
code_save_client = aioredis.from_url(REDIS_URL + "/10", decode_responses=True)


async def get_redis():
    return redis_client


async def get_redis_code_save():
    return code_save_client
