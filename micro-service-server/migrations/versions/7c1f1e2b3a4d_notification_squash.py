"""notification squash (category + payload cleanup)

Revision ID: 7c1f1e2b3a4d
Revises: c2a1f6f0b9d1
Create Date: 2026-03-13 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "7c1f1e2b3a4d"
down_revision: Union[str, None] = "c2a1f6f0b9d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(inspector: sa.Inspector, table: str, schema: str = "public") -> bool:
    return inspector.has_table(table, schema=schema)


def _has_column(inspector: sa.Inspector, table: str, column: str, schema: str = "public") -> bool:
    return any(c["name"] == column for c in inspector.get_columns(table, schema=schema))


def _has_index(inspector: sa.Inspector, index: str, table: str, schema: str = "public") -> bool:
    return any(ix["name"] == index for ix in inspector.get_indexes(table, schema=schema))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _has_table(inspector, "micro_notification", "public"):
        return

    # Remove legacy payload.title if present.
    op.execute(
        text(
            """
            UPDATE public.micro_notification
            SET payload = payload - 'title'
            WHERE payload ? 'title';
            """
        )
    )

    # Ensure category enum exists without PENDING.
    op.execute(
        text(
            """
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notificationcategory') THEN
                IF EXISTS (
                  SELECT 1
                  FROM pg_enum e
                  JOIN pg_type t ON t.oid = e.enumtypid
                  WHERE t.typname = 'notificationcategory' AND e.enumlabel = 'PENDING'
                ) THEN
                  CREATE TYPE notificationcategory_new AS ENUM ('SYSTEM', 'ORGANIZATION', 'WORKBOOK', 'PROBLEM');
                  -- normalize data before cast
                  IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'micro_notification' AND column_name = 'category'
                  ) THEN
                    UPDATE public.micro_notification SET category = 'SYSTEM' WHERE category = 'PENDING';
                    ALTER TABLE public.micro_notification
                      ALTER COLUMN category TYPE notificationcategory_new
                      USING category::text::notificationcategory_new;
                  END IF;
                  DROP TYPE notificationcategory;
                  ALTER TYPE notificationcategory_new RENAME TO notificationcategory;
                END IF;
              ELSE
                CREATE TYPE notificationcategory AS ENUM ('SYSTEM', 'ORGANIZATION', 'WORKBOOK', 'PROBLEM');
              END IF;
            END$$;
            """
        )
    )

    # Add category column if missing.
    if not _has_column(inspector, "micro_notification", "category", "public"):
        op.add_column(
            "micro_notification",
            sa.Column(
                "category",
                postgresql.ENUM(
                    "SYSTEM",
                    "ORGANIZATION",
                    "WORKBOOK",
                    "PROBLEM",
                    name="notificationcategory",
                    create_type=False,
                ),
                nullable=False,
                server_default=sa.text("'SYSTEM'::notificationcategory"),
            ),
            schema="public",
        )
        op.alter_column("micro_notification", "category", server_default=None, schema="public")

    index_name = op.f("ix_public_micro_notification_category")
    if not _has_index(inspector, index_name, "micro_notification", "public"):
        op.create_index(index_name, "micro_notification", ["category"], unique=False, schema="public")


def downgrade() -> None:
    # Best-effort rollback to enum that includes PENDING and no payload cleanup.
    op.execute(
        text(
            """
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notificationcategory') THEN
                CREATE TYPE notificationcategory_old AS ENUM ('SYSTEM', 'PENDING', 'ORGANIZATION', 'WORKBOOK', 'PROBLEM');
                IF EXISTS (
                  SELECT 1
                  FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'micro_notification' AND column_name = 'category'
                ) THEN
                  ALTER TABLE public.micro_notification
                    ALTER COLUMN category TYPE notificationcategory_old
                    USING category::text::notificationcategory_old;
                END IF;
                DROP TYPE notificationcategory;
                ALTER TYPE notificationcategory_old RENAME TO notificationcategory;
              END IF;
            END$$;
            """
        )
    )
