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

async def check_and_fix_migration_state():
    dsn = {
        "user": os.environ["DB_USER"],
        "password": os.environ["DB_PASSWORD"],
        "host": os.environ["DB_HOST"],
        "port": int(os.environ.get("DB_PORT", "5432")),
        "database": os.environ["DB_NAME"],
    }
    
    try:
        async with asyncpg.create_pool(**dsn, min_size=1, max_size=1) as pool:
            async with pool.acquire() as conn:
                # 1. Check if micro_workbook table exists (Key table for this microservice)
                # We use public.micro_workbook as defined in models
                table_exists = await conn.fetchval("SELECT to_regclass('public.micro_workbook')")
                
                if not table_exists:
                    # 2. Check if alembic_version exists
                    version_table_exists = await conn.fetchval("SELECT to_regclass('public.alembic_version')")
                    
                    if version_table_exists:
                        print("[entrypoint] WARNING: 'micro_workbook' table is missing, but 'alembic_version' table exists.")
                        print("[entrypoint] This suggests a broken migration state. Resetting alembic version to force re-migration...")
                        
                        # 3. Drop alembic_version to force alembic to re-run migrations
                        await conn.execute("DROP TABLE public.alembic_version")
                        print("[entrypoint] 'alembic_version' table dropped. Migrations will run from scratch.")
                    else:
                        print("[entrypoint] Clean state detected (no tables, no version). Migrations should run normally.")
                else:
                     print("[entrypoint] 'micro_workbook' table exists. Skipping auto-repair.")

    except Exception as e:
        print(f"[entrypoint] Error during migration state check: {e}")




try:
    asyncio.run(wait_for_tables())
    asyncio.run(check_and_fix_migration_state())
except KeyboardInterrupt:
    sys.exit(1)
PY

echo "[entrypoint] Running database migrations (Pre-check)..."
alembic upgrade head

echo "[entrypoint] Skipping auto-generation of migrations (Manual 'alembic revision --autogenerate' required for changes)."

echo "[entrypoint] Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
