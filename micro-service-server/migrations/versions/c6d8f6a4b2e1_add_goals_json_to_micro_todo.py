"""add goals json to micro_todo

Revision ID: c6d8f6a4b2e1
Revises: e17c9990ac55
Create Date: 2026-03-20 16:30:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c6d8f6a4b2e1"
down_revision: Union[str, None] = "e17c9990ac55"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(inspector: sa.Inspector, table: str, schema: str = "public") -> bool:
    return inspector.has_table(table, schema=schema)


def _has_column(inspector: sa.Inspector, table: str, column: str, schema: str = "public") -> bool:
    return any(c["name"] == column for c in inspector.get_columns(table, schema=schema))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "micro_todo", "public") and not _has_column(inspector, "micro_todo", "goals", "public"):
        op.add_column(
            "micro_todo",
            sa.Column(
                "goals",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'[]'::jsonb"),
            ),
            schema="public",
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "micro_todo", "public") and _has_column(inspector, "micro_todo", "goals", "public"):
        op.drop_column("micro_todo", "goals", schema="public")
