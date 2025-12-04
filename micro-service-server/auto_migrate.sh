#!/bin/bash
set -e

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if a message was provided
if [ -z "$1" ]; then
  MSG="auto_update_$(date +%Y%m%d_%H%M%S)"
  echo -e "${YELLOW}No migration message provided. Using default: ${MSG}${NC}"
else
  MSG="$1"
  echo -e "${GREEN}Migration message: ${MSG}${NC}"
fi

# Ensure we are using the virtual environment's alembic
ALEMBIC_CMD="./.venv/bin/alembic"

if [ ! -f "$ALEMBIC_CMD" ]; then
    echo -e "${YELLOW}Virtual environment alembic not found at $ALEMBIC_CMD. Trying global 'alembic'...${NC}"
    ALEMBIC_CMD="alembic"
fi

echo -e "${GREEN}Generating migration...${NC}"
$ALEMBIC_CMD revision --autogenerate -m "$MSG"

echo -e "${GREEN}Applying migration...${NC}"
$ALEMBIC_CMD upgrade head

echo -e "${GREEN}✅ Auto-migration completed successfully!${NC}"
