"""create micro_pending table

Revision ID: 6a5f4d9c2b11
Revises: 37478b73dfe8
Create Date: 2026-03-10 13:40:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "6a5f4d9c2b11"
down_revision: Union[str, None] = "37478b73dfe8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(inspector: sa.Inspector, table: str, schema: str = "public") -> bool:
    return inspector.has_table(table, schema=schema)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    op.execute(
        text(
            """
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pendingstatus') THEN
                CREATE TYPE pendingstatus AS ENUM ('IN_PROGRESS', 'DONE', 'EXPIRED');
              END IF;
            END$$;
            """
        )
    )

    op.execute(
        text(
            """
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pendingtargettype') THEN
                CREATE TYPE pendingtargettype AS ENUM ('PROBLEM', 'WORKBOOK', 'CONTEST_USER', 'Organization');
              END IF;
            END$$;
            """
        )
    )

    if not _has_table(inspector, "micro_pending", "public"):
        op.create_table(
            "micro_pending",
            sa.Column("status", postgresql.ENUM("IN_PROGRESS", "DONE", "EXPIRED", name="pendingstatus", create_type=False), nullable=False),
            sa.Column("target_type", postgresql.ENUM("PROBLEM", "WORKBOOK", "CONTEST_USER", "Organization", name="pendingtargettype", create_type=False), nullable=False),
            sa.Column("target_id", sa.BigInteger(), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_user_id", sa.BigInteger(), nullable=False),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_user_id", sa.BigInteger(), nullable=True),
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("created_time", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_time", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            schema="public",
        )

        op.create_index(op.f("ix_public_micro_pending_id"), "micro_pending", ["id"], unique=False, schema="public")
        op.create_index(op.f("ix_public_micro_pending_status"), "micro_pending", ["status"], unique=False, schema="public")
        op.create_index(op.f("ix_public_micro_pending_target_type"), "micro_pending", ["target_type"], unique=False, schema="public")
        op.create_index(op.f("ix_public_micro_pending_target_id"), "micro_pending", ["target_id"], unique=False, schema="public")
        op.create_index(op.f("ix_public_micro_pending_due_at"), "micro_pending", ["due_at"], unique=False, schema="public")
        op.create_index(op.f("ix_public_micro_pending_created_user_id"), "micro_pending", ["created_user_id"], unique=False, schema="public")
        op.create_index(op.f("ix_public_micro_pending_completed_user_id"), "micro_pending", ["completed_user_id"], unique=False, schema="public")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "micro_pending", "public"):
        op.drop_index(op.f("ix_public_micro_pending_completed_user_id"), table_name="micro_pending", schema="public")
        op.drop_index(op.f("ix_public_micro_pending_created_user_id"), table_name="micro_pending", schema="public")
        op.drop_index(op.f("ix_public_micro_pending_due_at"), table_name="micro_pending", schema="public")
        op.drop_index(op.f("ix_public_micro_pending_target_id"), table_name="micro_pending", schema="public")
        op.drop_index(op.f("ix_public_micro_pending_target_type"), table_name="micro_pending", schema="public")
        op.drop_index(op.f("ix_public_micro_pending_status"), table_name="micro_pending", schema="public")
        op.drop_index(op.f("ix_public_micro_pending_id"), table_name="micro_pending", schema="public")
        op.drop_table("micro_pending", schema="public")
