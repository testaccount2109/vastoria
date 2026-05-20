#!/usr/bin/env bash
# Shared helpers for Vastoria Windows builds (local validation on Unix hosts).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
IDE_DIR="${ROOT_DIR}/apps/ide"
TAURI_DIR="${IDE_DIR}/src-tauri"
DIST_DIR="${ROOT_DIR}/dist/builds"

log() { printf '\033[1;34m[build]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[build]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[build]\033[0m %s\n' "$*" >&2; }

read_version() {
  if [[ -n "${VERSION:-}" ]]; then
    echo "${VERSION#v}"
    return
  fi
  python3 - <<'PY' "${TAURI_DIR}/tauri.conf.json"
import json, sys
print(json.load(open(sys.argv[1]))["version"])
PY
}

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

ensure_cmd() {
  for c in "$@"; do
    command -v "$c" >/dev/null 2>&1 || { err "Missing command: $c"; exit 1; }
  done
}

apply_build_profile() {
  : "${CARGO_BUILD_JOBS:=2}"
  : "${NODE_OPTIONS:=--max-old-space-size=4096}"
  : "${CARGO_INCREMENTAL:=0}"
  export CARGO_BUILD_JOBS NODE_OPTIONS CARGO_INCREMENTAL
  log "Build profile: CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS} NODE_OPTIONS=${NODE_OPTIONS}"
}
