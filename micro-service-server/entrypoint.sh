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
                # 1. Check if alembic_version table exists
                version_table_exists = await conn.fetchval("SELECT to_regclass('public.alembic_version')")
                
                if version_table_exists:
                    current_db_version = await conn.fetchval("SELECT version_num FROM public.alembic_version")
                    print(f"[entrypoint] Current DB version: {current_db_version}")
                    
                    if current_db_version:
                        # 2. Get all local version IDs
                        import glob
                        import re
                        
                        # Try multiple common paths for migrations
                        possible_paths = [
                            'migrations/versions/*.py',
                            'micro-service-server/migrations/versions/*.py',
                            '/micro-service-server/migrations/versions/*.py'
                        ]
                        
                        local_version_files = []
                        for path in possible_paths:
                            local_version_files.extend(glob.glob(path))
                        
                        import os
                        print(f"[entrypoint] CWD: {os.getcwd()}")
                        print(f"[entrypoint] Found {len(local_version_files)} migration files using patterns: {possible_paths}")
                        
                        local_versions = []
                        for fpath in local_version_files:
                            try:
                                with open(fpath, 'r') as f:
                                    content = f.read()
                                    match = re.search(r"revision[:\s]+[=:]\s*['\"]([^'\"]+)['\"]", content)
                                    if match:
                                        local_versions.append(match.group(1))
                            except Exception:
                                pass
                        
                        print(f"[entrypoint] Found {len(local_versions)} local migration files.")
                        
                        # 3. If DB version is not in local versions, it's orphaned/ghost
                        if current_db_version not in local_versions:
                            print(f"[entrypoint] CRITICAL: DB version '{current_db_version}' NOT found in local migrations.")
                            
                            # Check if tables exist to determine if we should stamp or drop
                            table_exists = await conn.fetchval("SELECT to_regclass('public.micro_workbook')")
                            
                            if table_exists:
                                print("[entrypoint] Tables exist. Dropping invalid alembic_version to allow manual/auto stamping.")
                                await conn.execute("DROP TABLE public.alembic_version")
                                # We will run 'alembic stamp 348f9671d2e8' in the shell later if it's missing
                            else:
                                print("[entrypoint] No microservice tables found. Dropping alembic_version for fresh migration.")
                                await conn.execute("DROP TABLE public.alembic_version")
                        else:
                            print("[entrypoint] DB version is valid and exists in local migrations.")
                else:
                    print("[entrypoint] No 'alembic_version' table found. Standard migration will proceed.")

    except Exception as e:
        print(f"[entrypoint] Error during migration state check: {e}")




try:
    asyncio.run(wait_for_tables())
    asyncio.run(check_and_fix_migration_state())
except KeyboardInterrupt:
    sys.exit(1)
PY

echo "[entrypoint] Running database migrations (Pre-check)..."

# 만약 alembic_version 테이블이 없고(위 Python 스크립트에서 드랍했거나 처음인 경우)
# micro_workbook 테이블은 이미 있다면, initial_reset(348f9671d2e8) 상태로 stamp 찍어줌
# 그래야 '이미 테이블이 존재합니다' 에러 없이 이후 마이그레이션이 진행됨
python - <<'PY'
import os
import asyncio
import asyncpg
async def check_need_stamp():
    dsn = f"postgresql://{os.environ['DB_USER']}:{os.environ['DB_PASSWORD']}@{os.environ['DB_HOST']}:{os.environ.get('DB_PORT', '5432')}/{os.environ['DB_NAME']}"
    conn = await asyncpg.connect(dsn)
    ver_exists = await conn.fetchval("SELECT to_regclass('public.alembic_version')")
    table_exists = await conn.fetchval("SELECT to_regclass('public.micro_workbook')")
    await conn.close()
    if not ver_exists and table_exists:
        return True
    return False

if asyncio.run(check_need_stamp()):
    print("[entrypoint] Table exists but version info missing. Stamping to 348f9671d2e8...")
    os.system("alembic stamp 348f9671d2e8")
PY

alembic upgrade head

echo "[entrypoint] Skipping auto-generation of migrations (Manual 'alembic revision --autogenerate' required for changes)."

echo "[entrypoint] Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
