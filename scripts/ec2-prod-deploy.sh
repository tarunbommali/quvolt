#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-/home/ubuntu/quvolt}"

echo "[deploy] cd ${ROOT_DIR}"
cd "${ROOT_DIR}"

echo "[deploy] sync latest code"
git fetch origin
git checkout main
git pull --ff-only origin main

echo "[deploy] install dependencies"
npm install
npm run install:all

echo "[deploy] build client"
cd client
npm run build
cd ..

echo "[deploy] ensure logs directory"
mkdir -p logs

echo "[deploy] stop old processes"
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete all || true
fi

# Safety net: kill stale listeners that cause EADDRINUSE
for port in 5000 5001; do
  pids="$(lsof -ti tcp:${port} || true)"
  if [[ -n "${pids}" ]]; then
    echo "[deploy] freeing port ${port}: ${pids}"
    kill -9 ${pids} || true
  fi
done

echo "[deploy] start PM2 ecosystem"
pm run prod:start
npm run prod:save
npm run prod:status

echo "[deploy] done"
