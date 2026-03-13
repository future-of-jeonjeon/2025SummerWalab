"""merge heads

Revision ID: e17c9990ac55
Revises: 7c1f1e2b3a4d, aa7e4d1f9c20
Create Date: 2026-03-13 22:43:30.311989

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e17c9990ac55'
down_revision: Union[str, None] = ('7c1f1e2b3a4d', 'aa7e4d1f9c20')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
