#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/hayden-web/current"
SERVICE_NAME="hayden-web-staging"
TARGET_REF="${1:-main}"
HEALTH_URL="http://127.0.0.1:3010/sign-in"
NODE_BIN="/root/.nvm/versions/node/v22.22.2/bin"

on_error() {
  echo
  echo "==> Staging deployment failed"
  echo "==> Last 80 service logs"
  journalctl -u "$SERVICE_NAME" -n 80 --no-pager || true
}

trap on_error ERR

echo "==> Enter project directory"
cd "$APP_DIR"

echo "==> Mark repo as safe"
git config --global --add safe.directory "$APP_DIR" || true

echo "==> Ensure origin uses SSH"
git remote set-url origin git@github.com:HaydenProMax/Web.git

echo "==> Fetch latest code"
git fetch --all --tags

echo "==> Checkout target ref: $TARGET_REF"
git checkout "$TARGET_REF"

echo "==> Pull latest changes"
if [ "$TARGET_REF" = "main" ]; then
  git pull --ff-only origin main
else
  git pull --ff-only origin "$TARGET_REF"
fi

echo "==> Use Node 22"
export PATH="$NODE_BIN:$PATH"

echo "==> Node version"
node -v

echo "==> PNPM version"
pnpm -v

echo "==> Install dependencies"
corepack pnpm install

echo "==> Generate Prisma client"
corepack pnpm --filter web prisma generate

echo "==> Sync staging database schema"
corepack pnpm --filter web prisma db push

echo "==> Seed staging app data"
corepack pnpm db:seed

echo "==> Build web app"
corepack pnpm --filter web build

echo "==> Restart staging service"
systemctl restart "$SERVICE_NAME"

echo "==> Wait for staging service"
for i in {1..20}; do
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    echo "==> Health check passed"
    break
  fi
  sleep 2
done

echo "==> Final health check"
curl -I "$HEALTH_URL"

echo "==> Service status"
systemctl status "$SERVICE_NAME" --no-pager

echo "==> Done"
