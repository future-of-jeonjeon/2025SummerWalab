"""add custom_todo item

Revision ID: b188e3391dcb
Revises: 2f20d5f472c2
Create Date: 2026-02-05 10:12:43.512463

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b188e3391dcb'
down_revision: Union[str, None] = '348f9671d2e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('micro_todo', sa.Column('custom_todo', sa.String(length=255), nullable=True), schema='public')


def downgrade() -> None:
    op.drop_column('micro_todo', 'custom_todo', schema='public')
