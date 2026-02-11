import json
import uuid
from datetime import datetime
from typing import List, Optional
from app.core.redis import redis_client

ORG_APPLY_KEY_PREFIX = "org_apply:"
ORG_APPLY_TTL = 7 * 24 * 60 * 60  # 7 days

async def save_apply(applicant_id: int, applicant_name: str, data: dict) -> str:
    """단체 신청 정보를 Redis에 저장합니다."""
    apply_id = str(uuid.uuid4())
    key = f"{ORG_APPLY_KEY_PREFIX}{apply_id}"
    
    payload = {
        "id": apply_id,
        "applicant_id": applicant_id,
        "applicant_name": applicant_name,
        "data": data,
        "created_at": datetime.now().isoformat()
    }
    
    await redis_client.set(key, json.dumps(payload), ex=ORG_APPLY_TTL)
    return apply_id

async def get_all_applies() -> List[dict]:
    """모든 단체 신청 정보를 Redis에서 조회합니다."""
    keys = await redis_client.keys(f"{ORG_APPLY_KEY_PREFIX}*")
    if not keys:
        return []
    
    values = await redis_client.mget(keys)
    return [json.loads(v) for v in values if v]

async def find_by_id(apply_id: str) -> Optional[dict]:
    """특정 ID의 신청 정보를 Redis에서 조회합니다."""
    key = f"{ORG_APPLY_KEY_PREFIX}{apply_id}"
    value = await redis_client.get(key)
    if not value:
        return None
    return json.loads(value)

async def delete_apply(apply_id: str):
    """지정된 ID의 신청 정보를 Redis에서 삭제합니다."""
    key = f"{ORG_APPLY_KEY_PREFIX}{apply_id}"
    await redis_client.delete(key)
