#!/usr/bin/env bash
# Vastoria production firewall (UFW)
#
# PUBLIC:  22 (SSH), 80/443 (Caddy/Nginx → vastoria.online)
# BLOCKED: 11434 Ollama, 18420 local AI, 18430 cloud API direct, 3000 Next.js,
#           5432 PostgreSQL, 1420 IDE dev
#
# Cloud API and website must bind 127.0.0.1 only; only the reverse proxy is public.
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

echo "[ufw] Installing UFW if needed…"
command -v ufw >/dev/null || apt-get update -qq && apt-get install -y ufw

echo "[ufw] Default policies: deny incoming, allow outgoing"
ufw default deny incoming
ufw default allow outgoing
ufw default deny routed

echo "[ufw] Allow SSH, HTTP, HTTPS"
ufw allow OpenSSH comment 'SSH admin'
ufw allow 80/tcp comment 'HTTP → HTTPS redirect / ACME'
ufw allow 443/tcp comment 'HTTPS vastoria.online'

echo "[ufw] Explicitly block local-only Vastoria ports"
for rule in \
  "11434/tcp|Ollama - never public" \
  "18420/tcp|Local AI backend - never public" \
  "18430/tcp|Cloud API - use reverse proxy on 443 only" \
  "3000/tcp|Next.js - bind 127.0.0.1 behind Caddy" \
  "5432/tcp|PostgreSQL - Docker internal only" \
  "1420/tcp|IDE Vite dev - local only"; do
  port="${rule%%|*}"
  comment="${rule#*|}"
  ufw deny "${port}" comment "${comment}" 2>/dev/null || true
done

echo "[ufw] Enabling (non-interactive)…"
ufw --force enable

echo ""
ufw status verbose
echo ""
echo "Done. Verify services bind loopback:"
echo "  ss -tlnp | grep -E '18420|18430|3000|11434'"
