import os, aioredis


from app.core.settings import settings

REDIS_URL = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
redis_client = aioredis.from_url(REDIS_URL + "/1", decode_responses=True)
code_save_client = aioredis.from_url(REDIS_URL + "/10", decode_responses=True)
manage_code_client = aioredis.from_url(REDIS_URL + "/4", decode_responses=True)
polling_task_client = aioredis.from_url(REDIS_URL + "/8", decode_responses=True)


async def get_redis():
    return redis_client


async def get_redis_code_save():
    return code_save_client


async def get_redis_manage_code():
    return manage_code_client


async def get_polling_task():
    return polling_task_client
