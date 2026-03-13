"""normalize organization visible column

Revision ID: 9b1e7f2a41cd
Revises: 6a5f4d9c2b11
Create Date: 2026-03-10 13:55:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "9b1e7f2a41cd"
down_revision: Union[str, None] = "6a5f4d9c2b11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(inspector: sa.Inspector, table: str, schema: str = "public") -> bool:
    return inspector.has_table(table, schema=schema)


def _has_column(inspector: sa.Inspector, table: str, column: str, schema: str = "public") -> bool:
    return any(c["name"] == column for c in inspector.get_columns(table, schema=schema))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "micro_organization", "public") and not _has_column(inspector, "micro_organization", "visible", "public"):
        op.add_column(
            "micro_organization",
            sa.Column("visible", sa.Boolean(), nullable=False, server_default=sa.false()),
            schema="public",
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "micro_organization", "public") and _has_column(inspector, "micro_organization", "visible", "public"):
        op.drop_column("micro_organization", "visible", schema="public")
