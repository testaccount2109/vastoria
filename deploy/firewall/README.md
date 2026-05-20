# Vastoria Firewall

## Principle

| Exposure | Ports | Service |
|----------|-------|---------|
| **Public** | 80, 443 | Caddy/Nginx → `vastoria.online` |
| **Admin** | 22 | SSH |
| **Never public** | 11434 | Ollama |
| **Never public** | 18420 | Local AI backend |
| **Never public** | 18430 | Cloud API (proxy via 443 only) |
| **Never public** | 3000 | Next.js website (proxy via 443 only) |
| **Never public** | 5432 | PostgreSQL |
| **Never public** | 1420 | IDE dev server |

## Install (Ubuntu/Debian)

```bash
sudo bash deploy/firewall/ufw-vastoria.sh
```

## Service binding (required)

Services must listen on **127.0.0.1**, not `0.0.0.0`:

```bash
# Cloud API
HOST=127.0.0.1 PORT=18430 vastoria-cloud

# Local AI (user machine only)
HOST=127.0.0.1 PORT=18420 vastoria-ai

# Website behind Caddy
HOSTNAME=127.0.0.1 PORT=3000 npm run start
```

## Verify

```bash
sudo ufw status verbose
ss -tlnp | grep -E ':(80|443|3000|18420|18430|11434)\s'
```

Expected: only `0.0.0.0:80`, `0.0.0.0:443`, `0.0.0.0:22` public; app ports on `127.0.0.1` only.

## Website „blockiert“ von außen?

Port **3000** is intentionally blocked. Public access is only through Caddy:

```bash
bash deploy/start-public.sh
```

Then use `https://vastoria.online/`, not `:3000`.
