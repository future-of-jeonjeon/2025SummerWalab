"""merge custom code and goals heads

Revision ID: d4a9b8c7e6f5
Revises: f3c9a1b7d2e4, c6d8f6a4b2e1
Create Date: 2026-03-27 12:58:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "d4a9b8c7e6f5"
down_revision: Union[str, None] = ("f3c9a1b7d2e4", "c6d8f6a4b2e1")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
