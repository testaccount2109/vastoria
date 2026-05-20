# Vastoria System Integration

Vastoria is exposed publicly as one product under `https://vastoria.online`.
Backend services remain private and are reached through path-based routing.

## Public Routes

| Route | Service |
|-------|---------|
| `https://vastoria.online/` | Website |
| `https://vastoria.online/downloads` | Website downloads page |
| `https://vastoria.online/downloads/windows` | Website Windows downloads page and static artifact root |
| `https://vastoria.online/releases` | Website release history |
| `https://vastoria.online/changelog` | Website changelog |
| `https://vastoria.online/docs` | Website docs |
| `https://vastoria.online/api/*` | Cloud API, proxied internally |

## Internal Services

| Service | Binding | Public access |
|---------|---------|---------------|
| Website | `127.0.0.1:3000` | Via `/` only |
| Cloud API | `127.0.0.1:18430` | Via `/api/*` only |
| PostgreSQL | Docker/private network | None |
| Local AI backend | User machine loopback | None |
| Ollama | User machine loopback | None |

The desktop AI backend and Ollama are local-only. They are intentionally not
proxied by production Caddy or Nginx.

## Production Defaults

| Setting | Value |
|---------|-------|
| `VASTORIA_ENV` | `production` |
| `PUBLIC_BASE_URL` | `https://vastoria.online/api` |
| `DOWNLOADS_BASE_URL` | `https://vastoria.online/downloads` |
| `NEXT_PUBLIC_CLOUD_API_URL` | `https://vastoria.online/api` |
| `NEXT_PUBLIC_DOWNLOADS_URL` | `https://vastoria.online/downloads` |

Shared URL resolution lives in `packages/config`.

## Release Paths

Windows release automation publishes:

| File | Public URL |
|------|------------|
| Latest metadata | `/downloads/windows/latest.json` |
| Release history metadata | `/downloads/windows/releases.json` |
| Changelog markdown | `/downloads/windows/CHANGELOG.md` |
| Setup installer | `/downloads/windows/vX.Y.Z/Vastoria-X.Y.Z-x64-setup.exe` |
| Portable executable | `/downloads/windows/vX.Y.Z/Vastoria-X.Y.Z-x64-portable.exe` |
| MSI package | `/downloads/windows/vX.Y.Z/Vastoria-X.Y.Z-x64.msi` |

The website reads static metadata first, then falls back to `/api` if needed.

## Reverse Proxy

Production proxy config:

- `deploy/proxy/Caddyfile`
- fallback Nginx config: `deploy/proxy/nginx-vastoria.conf`

Both configs expose only `vastoria.online` publicly and route:

- `/api/*` to the Cloud API
- `/downloads/*` to `/var/www/vastoria/downloads`
- all other paths to the Next.js website

## Offline-First Rules

1. IDE editing, terminal, and file I/O never require network.
2. AI inference stays on the user's machine; there is no cloud AI fallback.
3. Sync disables gracefully when `/api` is unreachable.
4. Website downloads and changelogs are driven by release metadata under `/downloads/windows`.
