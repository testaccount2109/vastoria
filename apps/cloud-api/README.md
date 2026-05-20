# Vastoria Cloud Backend

Cloud API for **Windows releases & downloads**, **project sync**, and **Ollama model metadata** (no inference).

Stack: **FastAPI**, **PostgreSQL** (SQLite for local dev), **Docker**, **Nginx**.

Production URL: `https://vastoria.online/api`. Local dev can still run on loopback.

## Features

| Area | Endpoints | Notes |
|------|-----------|-------|
| **Releases** | `GET/POST /api/releases`, `PATCH /api/releases/{version}`, `POST /api/releases/{version}/artifacts` | Create releases, upload installer/portable/msi, changelogs |
| **Downloads** | `GET /api/downloads/latest`, `GET /api/downloads/windows`, `GET /api/downloads/{version}`, `GET /api/downloads/artifacts/{id}/file` | Windows x86_64 only |
| **Sync** | `POST /api/sync/upload`, `GET /api/sync/download/{id}`, `GET /api/sync/history/{id}`, `POST /api/sync/rollback/{id}` | Snapshot sync & version history |
| **Updates** | `GET /api/updates/check`, `GET /api/updates/latest` | IDE version check (`platform=windows_x86_64`) |

**Auth:** stub only. Admin routes accept header `X-Vastoria-Admin: allow` until real auth is added.

## Quick start (local)

```bash
cd apps/cloud-api
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
vastoria-cloud
```

Production OpenAPI docs: `https://vastoria.online/api/docs`

## Docker (PostgreSQL + API + Nginx)

```bash
cd apps/cloud-api/deploy
docker compose up --build
```

- API (internal): `cloud-api:18430`
- Public route shape: `/api/*`
- Postgres: `vastoria:vastoria@vastoria_cloud`

## Admin examples (stub auth)

```bash
# Create release
curl -X POST https://vastoria.online/api/releases \
  -H 'Content-Type: application/json' \
  -H 'X-Vastoria-Admin: allow' \
  -d '{"version":"0.2.0","changelog":"## 0.2.0\n\n- feature","tags":["windows","stable"]}'

# Upload installer
curl -X POST https://vastoria.online/api/releases/0.2.0/artifacts \
  -H 'X-Vastoria-Admin: allow' \
  -F artifact_type=installer \
  -F recommended=true \
  -F file=@Vastoria-0.2.0-x64-setup.exe
```

## Configuration

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL URL (omit for SQLite) |
| `PUBLIC_BASE_URL` | Production default: `https://vastoria.online/api` |
| `DOWNLOADS_BASE_URL` | Production default: `https://vastoria.online/downloads` |
| `ARTIFACT_STORAGE_PATH` | Windows build storage root |
| `BLOB_STORAGE_PATH` | Sync content-addressed blobs |
| `SEED_RELEASES_ON_STARTUP` | Load `data/releases.json` if DB empty |
| `SEED_MODELS_ON_STARTUP` | Load `data/model_catalog.json` |

## Architecture

```
vastoria.online/api → cloud-api:18430
              ├── PostgreSQL (releases, models, sync metadata)
              └── Volumes (artifacts, sync blobs)
```

Stateless API workers: session data in Postgres; binary artifacts on disk (S3-compatible backend can replace `ArtifactStorage` later).
