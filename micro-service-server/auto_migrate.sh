#!/bin/bash
set -e

# Generate migration with a timestamped message
alembic revision --autogenerate -m "auto_update_$(date +%Y%m%d_%H%M%S)"

# Apply the migration
alembic upgrade head

echo "Auto-migration completed successfully!"
