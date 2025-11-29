from __future__ import annotations

import hashlib
from http.client import HTTPException
from typing import Any, Dict, Optional
import copy
import os
import uuid
import json

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.execution.models import SysOption
from app.execution.scheduler import ChooseJudgeServerAsync


async def _get_sys_option(session: AsyncSession, key: str) -> Optional[Any]:
    stmt = select(SysOption.value).where(SysOption.key == key)
    res = await session.execute(stmt)
    row = res.first()
    return row[0] if row else None


async def get_judge_server_token(session: AsyncSession) -> Optional[str]:
    # Prefer env override; fallback to DB SysOptions
    token = os.getenv("JUDGE_SERVER_TOKEN")
    if token:
        return token
    opt = await _get_sys_option(session, "judge_server_token")
    if isinstance(opt, str):
        return opt
    return None


async def get_languages(session: AsyncSession) -> list[dict]:
    langs = await _get_sys_option(session, "languages")
    return langs or []


async def find_language_config(session: AsyncSession, language_name: str) -> Optional[Dict[str, Any]]:
    for item in await get_languages(session):
        if item.get("name") == language_name:
            return item.get("config")
    return None


class ExecutionService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def run_code(
            self,
            *,
            language: str,
            src: str,
            stdin: str = "",
            max_cpu_time: int,
            max_memory_mb: int) -> Dict[str, Any]:

        # Resolve language config from SysOptions
        language_config = await find_language_config(self.session, language)
        if not language_config:
            raise HTTPException(status_code=400, detail="Wrong Language option")

        token = await get_judge_server_token(self.session)
        if not token:
            raise HTTPException(status_code=500, detail="Internal Server Error")
            # return {"err": True, "data": "Missing JUDGE_SERVER_TOKEN (env or SysOptions)"}

        hashed_token = hashlib.sha256(token.encode("utf-8")).hexdigest()

        # Normalize language config for /run endpoint (ensure seccomp_rule is a string)
        norm_config = copy.deepcopy(language_config)
        run_cfg = norm_config.get("run", {})
        sec_rule = run_cfg.get("seccomp_rule")
        if isinstance(sec_rule, dict):
            # Default to standard rule for C/C++ when mapping provided
            # Known common rule names in QDUOJ judger: c_cpp, c_cpp_file_io, general, golang, node
            run_cfg["seccomp_rule"] = "c_cpp"
            norm_config["run"] = run_cfg

        async with ChooseJudgeServerAsync() as server:
            if not server or not server.service_url:
                return {"err": True, "data": "No available judge server"}

            # Build payload for a single-run with custom stdin
            # Build primary payload for /run
            data = {
                "language_config": norm_config,
                "src": src,
                "max_cpu_time": max_cpu_time,
                "max_real_time": max(1, int(max_cpu_time) * 3),
                "max_memory": max(1, int(max_memory_mb)) * 1024 * 1024,
                "input": stdin or "",
                "stdin": stdin or "",
                "output": True,
            }

            headers = {"X-Judge-Server-Token": hashed_token}

            # Prefer a `/run` endpoint if available (commonly supported by judge servers)
            url = server.service_url.rstrip("/") + "/run"

            async with httpx.AsyncClient(timeout=30.0) as client:
                try:
                    resp = await client.post(url, headers=headers, json=data)
                    resp.raise_for_status()
                    result = resp.json()
                    # Fallback: if InvalidRequest, retry with minimal payload
                    if isinstance(result, dict) and result.get("err") == "InvalidRequest":
                        minimal = {
                            "language_config": norm_config,
                            "src": src,
                            "max_cpu_time": max_cpu_time,
                            "max_real_time": max(1, int(max_cpu_time) * 3),
                            "max_memory": max(1, int(max_memory_mb)) * 1024 * 1024,
                            "stdin": stdin or "",
                            "output": True,
                        }
                        resp2 = await client.post(url, headers=headers, json=minimal)
                        resp2.raise_for_status()
                        result2 = resp2.json()
                        if isinstance(result2, dict) and result2.get("err") == "InvalidRequest":
                            # Second fallback: emulate a single test case and call /judge
                            return await self._run_via_judge(
                                client=client,
                                headers=headers,
                                server_url=server.service_url,
                                language_config=norm_config,
                                src=src,
                                stdin=stdin or "",
                                max_cpu_time=max_cpu_time,
                                max_memory_bytes=max(1, int(max_memory_mb)) * 1024 * 1024,
                            )
                        return result2
                    return result
                except Exception as e:
                    return {"err": True, "data": f"Judge server error: {e}"}

    async def _run_via_judge(
            self,
            *,
            client: httpx.AsyncClient,
            headers: Dict[str, str],
            server_url: str,
            language_config: Dict[str, Any],
            src: str,
            stdin: str,
            max_cpu_time: int,
            max_memory_bytes: int,
    ) -> Dict[str, Any]:
        base = os.getenv("TEST_CASE_DATA_PATH", "/test_case")
        case_id = uuid.uuid4().hex
        case_dir = os.path.join(base, case_id)
        os.makedirs(case_dir, exist_ok=True)
        # Prepare a minimal test case with only input
        in_name = "1.in"
        out_name = "1.out"
        with open(os.path.join(case_dir, in_name), "w", encoding="utf-8") as f:
            f.write(stdin)
        # Create empty expected output file to satisfy schema (won't be used if output=True)
        out_path = os.path.join(case_dir, out_name)
        open(out_path, "w").close()
        # Compute md5 fields expected by judge server
        import hashlib
        with open(out_path, "rb") as f:
            out_bytes = f.read()
        output_md5 = hashlib.md5(out_bytes).hexdigest()
        # stripped: simulate by stripping trailing spaces per-line and final newlines
        try:
            stripped_text = b"\n".join([line.rstrip() for line in out_bytes.splitlines()])
        except Exception:
            stripped_text = out_bytes
        stripped_output_md5 = hashlib.md5(stripped_text).hexdigest()
        info = {
            "spj": False,
            "test_cases": {
                "1": {
                    "input_name": in_name,
                    "output_name": out_name,
                    "output_md5": output_md5,
                    "stripped_output_md5": stripped_output_md5,
                }
            },
        }
        with open(os.path.join(case_dir, "info"), "w", encoding="utf-8") as f:
            json.dump(info, f)

        data = {
            "language_config": language_config,
            "src": src,
            "max_cpu_time": max_cpu_time,
            "max_memory": max_memory_bytes,
            "test_case_id": case_id,
            "output": True,
            # no spj
        }
        url = server_url.rstrip("/") + "/judge"
        try:
            resp = await client.post(url, headers=headers, json=data)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            return {"err": True, "data": f"Judge server /judge error: {e}"}
