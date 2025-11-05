set -euo pipefail

OUT="deploy.tgz"

echo "[1/3] Building frontend/backend (amd64)..."
docker compose -f docker-compose.deploy.yml build --no-cache --pull

echo "[2/3] Saving frontend/backend images..."
docker save \
  2025summerwalab-oj-frontend \
  2025summerwalab-oj-backend \
  -o images.tar

echo "[3/3] Creating bundle (tgz)..."
tar -czf "$OUT" images.tar docker-compose.deploy.yml .env

echo "[CLEANUP] Removing images.tar..."
rm -f images.tar

echo "[DONE] $OUT created successfully!"