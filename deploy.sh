set -euo pipefail

OUT="deploy.tgz"

echo "[1/3] Building frontend/backend/micro-service (amd64)..."
docker compose -f docker-compose.deploy.yml build --no-cache --pull

echo "[2/3] Saving frontend/backend/micro-service images..."
docker save \
  hgu-oj-front:latest \
  hgu-oj-backend:latest \
  hgu-oj-micro-service:latest \
  -o images.tar

echo "[3/3] Creating bundle (tgz)..."
tar -czf "$OUT" images.tar docker-compose.deploy.yml .env

echo "[CLEANUP] Removing images.tar..."
rm -f images.tar

echo "[DONE] $OUT created successfully!"
