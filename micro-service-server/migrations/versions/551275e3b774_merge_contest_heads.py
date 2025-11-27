"""merge contest heads

Revision ID: 551275e3b774
Revises: 1bbbd8bfed3b, 202410200100
Create Date: 2025-11-27 04:37:30.349235

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '551275e3b774'
down_revision: Union[str, None] = ('1bbbd8bfed3b', '202410200100')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
