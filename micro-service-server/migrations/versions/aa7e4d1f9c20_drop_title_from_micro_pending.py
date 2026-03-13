"""drop title from micro_pending

Revision ID: aa7e4d1f9c20
Revises: 9b1e7f2a41cd
Create Date: 2026-03-11 21:45:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "aa7e4d1f9c20"
down_revision: Union[str, None] = "9b1e7f2a41cd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(inspector: sa.Inspector, table: str, schema: str = "public") -> bool:
    return inspector.has_table(table, schema=schema)


def _has_column(inspector: sa.Inspector, table: str, column: str, schema: str = "public") -> bool:
    return any(c["name"] == column for c in inspector.get_columns(table, schema=schema))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "micro_pending", "public") and _has_column(inspector, "micro_pending", "title", "public"):
        op.drop_column("micro_pending", "title", schema="public")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "micro_pending", "public") and not _has_column(inspector, "micro_pending", "title", "public"):
        op.add_column(
            "micro_pending",
            sa.Column("title", sa.String(length=200), nullable=False, server_default=""),
            schema="public",
        )
