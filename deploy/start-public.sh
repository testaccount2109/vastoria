#!/usr/bin/env bash
# Start Vastoria website + cloud API behind Caddy on port 80.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
[[ -f "$ROOT/deploy/.env.server" ]] && set -a && source "$ROOT/deploy/.env.server" && set +a

start_cloud() {
  pkill -f "uvicorn vastoria_cloud" 2>/dev/null || true
  sleep 1
  cd "$ROOT/apps/cloud-api"
  SEED_RELEASES_ON_STARTUP=true HOST=127.0.0.1 PORT=18430 \
    PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://vastoria.online/api}" \
    DOWNLOADS_BASE_URL="${DOWNLOADS_BASE_URL:-https://vastoria.online/downloads}" \
    nohup .venv/bin/uvicorn vastoria_cloud.main:app --host 127.0.0.1 --port 18430 \
    >/tmp/vastoria-cloud.log 2>&1 &
  sleep 2
}

website_static_ok() {
  local chunk
  chunk=$(find "$ROOT/apps/website/.next/static/chunks" -name '*.js' 2>/dev/null | head -1)
  [[ -n "$chunk" ]] || return 1
  chunk=$(basename "$chunk")
  curl -sf -o /dev/null "http://127.0.0.1:3000/_next/static/chunks/${chunk}" 2>/dev/null
}

start_website() {
  cd "$ROOT/apps/website"
  if [[ ! -f .next/standalone/apps/website/server.js ]] \
    || [[ ! -d .next/standalone/apps/website/.next/static/chunks ]]; then
    echo "Building website (standalone + static assets)…"
    npm run build
  else
    bash scripts/postbuild-standalone.sh
  fi

  if website_static_ok; then
    return 0
  fi

  pkill -f "apps/website/server.js" 2>/dev/null || pkill -f "next/standalone/apps/website" 2>/dev/null || true
  sleep 1

  PORT=3000 HOSTNAME=127.0.0.1 \
    CLOUD_API_URL="${CLOUD_API_URL:-http://127.0.0.1:18430}" \
    NEXT_PUBLIC_CLOUD_API_URL="${NEXT_PUBLIC_CLOUD_API_URL:-https://vastoria.online/api}" \
    DOWNLOADS_BASE_URL="${DOWNLOADS_BASE_URL:-https://vastoria.online/downloads}" \
    NEXT_PUBLIC_DOWNLOADS_URL="${NEXT_PUBLIC_DOWNLOADS_URL:-https://vastoria.online/downloads}" \
    VASTORIA_ENV="${VASTORIA_ENV:-production}" \
    nohup npm run start >/tmp/vastoria-website.log 2>&1 &
  sleep 3
}

start_caddy() {
  if curl -sf http://127.0.0.1:80 >/dev/null 2>&1; then return; fi
  caddy run --config "$ROOT/deploy/proxy/Caddyfile.server" --adapter caddyfile \
    >/tmp/vastoria-caddy.log 2>&1 &
  sleep 2
}

start_cloud
start_website
start_caddy

echo "Vastoria public stack:"
echo "  Website:  https://vastoria.online/"
echo "  Cloud API: https://vastoria.online/api/health"
echo "  Downloads: https://vastoria.online/downloads/windows/"
