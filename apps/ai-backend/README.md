# Vastoria AI Backend

FastAPI service that runs **all AI inference locally** via [Ollama](https://ollama.com). Streams tokens over WebSockets and stores optional chat/context metadata in PostgreSQL or SQLite.

Default URL: `http://127.0.0.1:18420`

## Requirements

- Python 3.11+
- Ollama running locally (`ollama serve`)
- At least one model pulled (`ollama pull llama3.2`)

## Quick start

```bash
cd apps/ai-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
vastoria-ai
# or: uvicorn vastoria_ai.main:app --host 127.0.0.1 --port 18420 --reload
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service + Ollama status |
| GET | `/models` | Installed Ollama models |
| POST | `/context/update` | Inject workspace/file/terminal context |
| GET | `/context/{project_id}` | Read stored context |
| GET | `/chat/history/{project_id}` | Chat history for project |
| POST | `/chat/abort/{request_id}` | Abort active stream |
| WS | `/chat/stream` | Streaming chat + abort |

Interactive docs: `/docs`

## WebSocket protocol (`/chat/stream`)

**Client → server**

```json
{
  "type": "chat",
  "request_id": "uuid",
  "payload": {
    "project_id": "/home/user/project",
    "message": "Explain this function",
    "model": "llama3.2",
    "mode": "coding"
  }
}
```

```json
{ "type": "abort", "request_id": "uuid" }
```

```json
{ "type": "ping", "request_id": "" }
```

**Server → client**

```json
{ "type": "token", "request_id": "uuid", "delta": "Hello", "message_id": "..." }
{ "type": "done", "request_id": "uuid", "content": "...", "message_id": "..." }
{ "type": "aborted", "request_id": "uuid" }
{ "type": "error", "request_id": "uuid", "error": "..." }
```

### AI modes

- `coding` — implementation-focused, code fences, minimal diffs
- `designing` — UX/UI specs, structure, design tokens

## Context injection

`POST /context/update` accepts open files, active selection, workspace summary, and terminal output. Context is injected as a system message on each chat request.

## PostgreSQL (optional)

```bash
export DATABASE_URL=postgresql://user:pass@localhost:5432/vastoria_ai
```

Or use `deploy/docker-compose.yml` for local Postgres + API.

## IDE integration

Point the IDE AI hooks to:

- REST: `http://127.0.0.1:18420`
- WebSocket: `ws://127.0.0.1:18420/chat/stream`
