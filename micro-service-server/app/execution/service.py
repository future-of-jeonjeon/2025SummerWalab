import hashlib, copy, os, uuid, json, httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.execution.models import SysOption
from app.execution.schemas import *
from app.execution.scheduler import ChooseJudgeServerAsync
from app.execution import exceptions
from app.core.logger import logger
from app.core.settings import settings

async def _get_sys_option(session: AsyncSession, key: str) -> Optional[Any]:
    stmt = select(SysOption.value).where(SysOption.key == key)
    res = await session.execute(stmt)
    row = res.first()
    return row[0] if row else None

async def _get_judge_config(session: AsyncSession, language: str):
    token = settings.JUDGE_SERVER_TOKEN or await _get_sys_option(session, "judge_server_token")
    if not token:
        logger.critical("Missing JUDGE_SERVER_TOKEN")
        exceptions.internal_server_error()

    langs = await _get_sys_option(session, "languages") or []
    config = next((item["config"] for item in langs if item["name"] == language), None)

    if not config:
        logger.error(f"Language not found: {language}")
        exceptions.language_not_found()

    norm_config = copy.deepcopy(config)
    if isinstance(norm_config.get("run", {}).get("seccomp_rule"), dict):
        norm_config["run"]["seccomp_rule"] = "c_cpp"

    return norm_config, hashlib.sha256(token.encode("utf-8")).hexdigest()


def _prepare_temp_testcase(stdin: str) -> str:
    case_id = uuid.uuid4().hex
    case_dir = os.path.join(settings.TEST_CASE_DATA_PATH, case_id)
    os.makedirs(case_dir, exist_ok=True)
    with open(os.path.join(case_dir, "1.in"), "w", encoding="utf-8") as f:
        f.write(stdin)
    open(os.path.join(case_dir, "1.out"), "w").close()

    empty_hash = hashlib.md5(b"").hexdigest()
    info = {
        "spj": False,
        "test_cases": {"1": {"input_name": "1.in", "output_name": "1.out",
                             "output_md5": empty_hash, "stripped_output_md5": empty_hash}}
    }
    with open(os.path.join(case_dir, "info"), "w", encoding="utf-8") as f:
        json.dump(info, f)

    return case_id

async def run_code_service(
        session: AsyncSession,
        req: RunCodeRequest) -> Dict[str, Any]:
    config, hashed_token = await _get_judge_config(session, req.language)
    headers = {"X-Judge-Server-Token": hashed_token}
    mem_bytes = max(1, req.max_memory_mb) * 1024 * 1024
    async with ChooseJudgeServerAsync() as server:
        if not server or not server.service_url:
            return {"err": True, "data": "No available judge server"}
        url_run = f"{server.service_url.rstrip('/')}/run"
        url_judge = f"{server.service_url.rstrip('/')}/judge"
        async with httpx.AsyncClient(timeout=30.0) as client:
            run_payload = {
                "language_config": config,
                "src": req.src,
                "max_cpu_time": req.max_cpu_time,
                "max_real_time": req.max_cpu_time * 3,
                "max_memory": mem_bytes,
                "stdin": req.stdin,
                "output": True
            }

            try:
                resp = await client.post(url_run, headers=headers, json=run_payload)
                result = resp.json()
                if isinstance(result, dict) and result.get("err") == "InvalidRequest":
                    case_id = _prepare_temp_testcase(req.stdin)
                    judge_payload = {
                        "language_config": config,
                        "src": req.src,
                        "max_cpu_time": req.max_cpu_time,
                        "max_memory": mem_bytes,
                        "test_case_id": case_id,
                        "output": True
                    }
                    resp = await client.post(url_judge, headers=headers, json=judge_payload)
                    return resp.json()
                return result

            except Exception as e:
                logger.error(f"Judge connection failed: {e}")
                exceptions.internal_server_error()
                return {"err": True, "data": str(e)}
