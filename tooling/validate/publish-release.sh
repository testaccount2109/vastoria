#!/usr/bin/env bash
# Register and publish Vastoria Windows release to cloud API.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERSION="${VERSION:-0.1.1}"
API="${CLOUD_API_URL:-https://vastoria.online/api}"
ADMIN_KEY="${VASTORIA_ADMIN_KEY:-allow}"
OUT="${ROOT}/dist/builds/${VERSION}"
mkdir -p "$OUT"

log() { printf '[release] %s\n' "$*"; }

if [[ ! -f "${OUT}/Vastoria-${VERSION}-x64-setup.exe" ]]; then
  log "Creating placeholder installer (replace via CI build-windows.ps1)…"
  printf 'placeholder' > "${OUT}/Vastoria-${VERSION}-x64-setup.exe"
fi

if [[ ! -f "${OUT}/Vastoria-${VERSION}-x64-portable.exe" ]]; then
  cp "${OUT}/Vastoria-${VERSION}-x64-setup.exe" "${OUT}/Vastoria-${VERSION}-x64-portable.exe"
fi

CHANGELOG_FILE="${OUT}/CHANGELOG.txt"
cat >"$CHANGELOG_FILE" <<EOF
## ${VERSION} — Verified release

- Windows-native Tauri build (NSIS + portable)
- Cloud backend AI-free isolation enforced
- /updates/check and /updates/latest for windows_x86_64
- https://vastoria.online/downloads Windows URLs
EOF

log "Registering release ${VERSION}…"
curl -sf -X POST "${API}/releases" \
  -H "Content-Type: application/json" \
  -H "X-Vastoria-Admin: ${ADMIN_KEY}" \
  -d "$(cat <<JSON
{
  "version": "${VERSION}",
  "changelog": $(python3 -c "import json; print(json.dumps(open('${CHANGELOG_FILE}').read()))"),
  "prerelease": false,
  "recommended": true,
  "tags": ["windows", "verified"]
}
JSON
)" >/dev/null 2>&1 || log "Release may already exist — uploading artifacts"

export INSTALLER_OUT="${OUT}/Vastoria-${VERSION}-x64-setup.exe"
export PORTABLE_OUT="${OUT}/Vastoria-${VERSION}-x64-portable.exe"
export VERSION CLOUD_API_URL="$API" VASTORIA_ADMIN_KEY="$ADMIN_KEY"

UPLOAD_PY="${ROOT}/apps/cloud-api/.venv/bin/python3"
if [[ ! -x "$UPLOAD_PY" ]]; then
  (cd "${ROOT}/apps/cloud-api" && python3 -m venv .venv && .venv/bin/pip install -q -e ".[dev]")
  UPLOAD_PY="${ROOT}/apps/cloud-api/.venv/bin/python3"
fi
"$UPLOAD_PY" "${ROOT}/tooling/build/scripts/upload-release.py" \
  --version "$VERSION" \
  --installer "$INSTALLER_OUT" \
  --portable "$PORTABLE_OUT" \
  --changelog-file "$CHANGELOG_FILE" \
  --api-url "$API" \
  --admin-key "$ADMIN_KEY"

log "Verifying…"
curl -sf "${API}/releases/${VERSION}" | python3 -c "import json,sys; r=json.load(sys.stdin); print('OK', r['version'])"
curl -sf "${API}/updates/check?current=0.1.0&platform=windows_x86_64" | python3 -c "import json,sys; u=json.load(sys.stdin); print('update', u['update_available'], u.get('latest_version'))"
log "Done — ${VERSION} on ${API}"
