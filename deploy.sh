#!/bin/bash
set -e

PROJECT_DIR=/root/marketprice

echo "[Deploy] $(date) — Iniciando deploy..."

cd "$PROJECT_DIR"

# Pull latest
git pull origin main

# Install deps (se package.json mudou)
npm install

# Rebuild frontend
cd "$PROJECT_DIR/apps/web"
npx vite build

# Regenerar Prisma (se schema mudou)
cd "$PROJECT_DIR/apps/api"
npx prisma generate
npx prisma db push --accept-data-loss 2>/dev/null || true

# Fix permissions for nginx
chmod -R 755 "$PROJECT_DIR/apps/web/dist"

# Restart API
pm2 restart marketprice-api

echo "[Deploy] $(date) — Deploy concluído!"
