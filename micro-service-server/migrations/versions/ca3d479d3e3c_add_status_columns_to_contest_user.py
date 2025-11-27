"""add status columns to contest user

Revision ID: ca3d479d3e3c
Revises: 551275e3b774
Create Date: 2025-11-27 11:59:19.817672

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ca3d479d3e3c'
down_revision: Union[str, None] = '551275e3b774'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'micro_contest_user',
        sa.Column('status', sa.String(length=20), nullable=False, server_default='approved'),
        schema='public',
    )
    op.add_column(
        'micro_contest_user',
        sa.Column('approved_by', sa.Integer(), nullable=True),
        schema='public',
    )
    op.add_column(
        'micro_contest_user',
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        schema='public',
    )
    op.add_column(
        'micro_contest_user',
        sa.Column('updated_time', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        schema='public',
    )
    op.execute("UPDATE public.micro_contest_user SET status = 'approved' WHERE status IS NULL")
    op.alter_column('micro_contest_user', 'status', server_default=None, schema='public')


def downgrade() -> None:
    op.drop_column('micro_contest_user', 'updated_time', schema='public')
    op.drop_column('micro_contest_user', 'approved_at', schema='public')
    op.drop_column('micro_contest_user', 'approved_by', schema='public')
    op.drop_column('micro_contest_user', 'status', schema='public')
