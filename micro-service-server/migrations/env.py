from __future__ import annotations

import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

# Add the project root directory to the Python path
# This is crucial for Alembic to find your model modules
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))

# Import your models here to ensure they are registered with Base.metadata
from app.config.database import Base, DATABASE_URL
# import app.auth.models
import app.user.models
import app.problem.models
import app.workbook.models
import app.code_autosave.models
import app.organization.models


def _sync_database_url() -> str:
    if DATABASE_URL.startswith("postgresql+asyncpg"):
        return DATABASE_URL.replace("+asyncpg", "+psycopg")
    if DATABASE_URL.startswith("mysql+aiomysql"):
        return DATABASE_URL.replace("+aiomysql", "+pymysql")
    return DATABASE_URL


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


target_metadata = Base.metadata


def _include_object(object_, name, type_, reflected, compare_to):
    if type_ == "table":
        return name.startswith("micro_")
    return True


def run_migrations_offline() -> None:
    url = _sync_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=_include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = DATABASE_URL

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    def process_revision_directives(context, revision, directives):
        if config.cmd_opts.autogenerate:
            script = directives[0]
            if script.upgrade_ops.is_empty():
                directives[:] = []
                print("[env.py] No changes detected in schema. Skipping migration generation.")

    def do_run_migrations(connection):
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=_include_object,
            process_revision_directives=process_revision_directives,
        )
        with context.begin_transaction():
            context.run_migrations()

    async def run_migrations_async():
        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)
        await connectable.dispose()

    import asyncio

    asyncio.run(run_migrations_async())


if context.is_offline_mode():  # pragma: no cover - invoked by Alembic CLI
    run_migrations_offline()
else:  # pragma: no cover - invoked by Alembic CLI
    run_migrations_online()
