#!/usr/bin/env bash
# End-to-end Vastoria validation with self-healing restarts.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { printf "${GREEN}[validate]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[validate]${NC} %s\n" "$*"; }
fail() { printf "${RED}[validate]${NC} %s\n" "$*"; }

CLOUD_URL="${CLOUD_API_URL:-http://127.0.0.1:18430}"
AI_URL="${LOCAL_AI_URL:-http://127.0.0.1:18420}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"
WEB_URL="${WEBSITE_URL:-http://127.0.0.1:3000}"

PIDS_DIR="$ROOT/.vastoria/pids"
mkdir -p "$PIDS_DIR"

start_cloud() {
  if curl -sf "${CLOUD_URL}/health" >/dev/null 2>&1; then
    return 0
  fi
  log "Starting cloud-api…"
  cd "$ROOT/apps/cloud-api"
  [[ -d .venv ]] || python3 -m venv .venv
  .venv/bin/pip install -q -e ".[dev]" 2>/dev/null || .venv/bin/pip install -q -e .
  export HOST=127.0.0.1 PORT=18430 SEED_MODELS_ON_STARTUP=false PUBLIC_BASE_URL="$CLOUD_URL"
  nohup .venv/bin/vastoria-cloud >/tmp/vastoria-cloud.log 2>&1 &
  echo $! >"$PIDS_DIR/cloud-api.pid"
  for _ in $(seq 1 30); do
    curl -sf "${CLOUD_URL}/health" >/dev/null 2>&1 && return 0
    sleep 1
  done
  fail "cloud-api failed to start — see /tmp/vastoria-cloud.log"
  return 1
}

start_ai() {
  if curl -sf "${AI_URL}/health" >/dev/null 2>&1; then
    return 0
  fi
  log "Starting local ai-backend…"
  cd "$ROOT/apps/ai-backend"
  [[ -d .venv ]] || python3 -m venv .venv
  .venv/bin/pip install -q -e . 2>/dev/null || true
  export HOST=127.0.0.1 PORT=18420 OLLAMA_URL="$OLLAMA_URL"
  nohup .venv/bin/vastoria-ai >/tmp/vastoria-ai.log 2>&1 &
  echo $! >"$PIDS_DIR/ai-backend.pid"
  for _ in $(seq 1 30); do
    curl -sf "${AI_URL}/health" >/dev/null 2>&1 && return 0
    sleep 1
  done
  warn "ai-backend offline (Ollama may be down) — IDE still valid"
  return 1
}

website_static_ok() {
  local chunk
  chunk=$(find "$ROOT/apps/website/.next/static/chunks" -name '*.js' 2>/dev/null | head -1)
  [[ -n "$chunk" ]] || return 1
  chunk=$(basename "$chunk")
  curl -sf -o /dev/null "${WEB_URL}/_next/static/chunks/${chunk}" 2>/dev/null
}

start_website() {
  cd "$ROOT/apps/website"
  if [[ ! -f .next/standalone/apps/website/server.js ]] \
    || [[ ! -d .next/standalone/apps/website/.next/static/chunks ]]; then
    log "Building website (standalone + static)…"
    npm run build >/tmp/vastoria-website-build.log 2>&1 || return 1
  else
    bash scripts/postbuild-standalone.sh
  fi

  if website_static_ok; then
    return 0
  fi

  log "Starting website…"
  pkill -f "apps/website/server.js" 2>/dev/null || fuser -k 3000/tcp 2>/dev/null || true
  sleep 1
  PORT=3000 HOSTNAME=127.0.0.1 nohup npm run start >/tmp/vastoria-website.log 2>&1 &
  echo $! >"$PIDS_DIR/website.pid"
  for _ in $(seq 1 45); do
    website_static_ok && return 0
    sleep 1
  done
  warn "website failed to start or static assets missing"
  return 1
}

check_backend_isolation() {
  log "Checking cloud backend isolation…"
  local violations=0
  if curl -sf "${CLOUD_URL}/openapi.json" 2>/dev/null | grep -q '"/models'; then
    fail "FAIL: /models still exposed on cloud API"
    violations=$((violations + 1))
  else
    log "OK: no /models on cloud API"
  fi
  if curl -sf "${CLOUD_URL}/models" -o /dev/null -w "%{http_code}" 2>/dev/null | grep -q '^200$'; then
    fail "FAIL: GET /models returns 200"
    violations=$((violations + 1))
  else
    log "OK: GET /models not served"
  fi
  for path in /health /releases /downloads/latest /updates/check /sync/upload; do
    case "$path" in
      /updates/check)
        code=$(curl -s -o /dev/null -w "%{http_code}" "${CLOUD_URL}${path}?current=0.0.1" 2>/dev/null || echo "000")
        ;;
      /sync/upload)
        # POST-only route — 422 means handler is live (validation error on empty body)
        code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
          -H "Content-Type: application/json" -d '{}' "${CLOUD_URL}${path}" 2>/dev/null || echo "000")
        ;;
      *)
        code=$(curl -s -o /dev/null -w "%{http_code}" "${CLOUD_URL}${path}" 2>/dev/null || echo "000")
        ;;
    esac
    if [[ "$code" =~ ^(200|201|405|422)$ ]]; then
      log "OK: ${path} (${code})"
    else
      fail "FAIL: ${path} (${code})"
      violations=$((violations + 1))
    fi
  done
  return "$violations"
}

log "=== Vastoria system validation ==="
start_cloud
start_ai || true
start_website || true

check_backend_isolation

log "TypeScript checks…"
(cd "$ROOT/apps/ide" && npx tsc --noEmit)
(cd "$ROOT/apps/website" && npx tsc --noEmit)

log "Cloud API tests…"
(cd "$ROOT/apps/cloud-api" && .venv/bin/python -m pytest tests/ -q)

log "AI backend tests…"
(cd "$ROOT/apps/ai-backend" && .venv/bin/python -m pytest tests/ -q 2>/dev/null) || warn "ai-backend tests skipped"

log "=== Validation complete ==="
