#!/bin/bash
set -euo pipefail

echo "[entrypoint] Waiting for Django core tables to be ready..."
python - <<'PY'
import asyncio
import os
import sys

import asyncpg

REQUIRED_TABLES = (
    "public.user",
    "public.problem",
    "public.problem_tag",
    "public.problem_tags",
)


async def wait_for_tables():
    delay_seconds = 3
    attempt = 1
    dsn = {
        "user": os.environ["DB_USER"],
        "password": os.environ["DB_PASSWORD"],
        "host": os.environ["DB_HOST"],
        "port": int(os.environ.get("DB_PORT", "5432")),
        "database": os.environ["DB_NAME"],
    }

    while True:
        try:
            async with asyncpg.create_pool(**dsn, min_size=1, max_size=1) as pool:
                async with pool.acquire() as conn:
                    missing = []
                    for table in REQUIRED_TABLES:
                        exists = await conn.fetchval("SELECT to_regclass($1)", table)
                        if not exists:
                            missing.append(table)

                    if not missing:
                        print(f"[entrypoint] All required Django tables present after {attempt} checks.")
                        return

                    print(
                        f"[entrypoint] Waiting for Django tables {missing} (attempt {attempt}).",
                        flush=True,
                    )

        except Exception as exc:  # noqa: BLE001
            print(
                f"[entrypoint] Error checking Django tables (attempt {attempt}): {exc}",
                flush=True,
            )

        attempt += 1
        await asyncio.sleep(delay_seconds)


try:
    asyncio.run(wait_for_tables())
except KeyboardInterrupt:
    sys.exit(1)
PY

echo "[entrypoint] Running database migrations..."
alembic upgrade head

echo "[entrypoint] Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
