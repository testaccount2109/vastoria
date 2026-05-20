# Vastoria IDE (Desktop Frontend)

Native Windows AI IDE built with **Tauri 2**, **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **Monaco Editor**, and **Zustand**.

## Quick start

```powershell
cd apps\ide
pnpm install
pnpm dev          # Vite only (browser mocks for IPC)
pnpm tauri dev    # Full Tauri app (requires Rust on Windows)
```

## Layout

- **Activity bar + sidebar** — file explorer, placeholders for search/git/extensions
- **Center** — Monaco editor with tabs and horizontal split groups
- **Right** — AI panel (chat UI + diff staging; no AI backend logic)
- **Bottom** — multi-session terminal (PowerShell, Windows Terminal, or CMD)

## AI hooks (integration points)

| Hook | Purpose |
|------|---------|
| `useChatStream` | Pass `streamAdapter` from external AI layer |
| `useFileContext` | Build workspace context payload for prompts |
| `useDiffEdits` | Stage/accept/reject diff proposals in the editor |

## IPC layer (`src/lib/ipc/`)

Tauri commands are wrapped with browser mocks for `pnpm dev`:

- `read_directory`, `read_directory_recursive`, `read_file`, `write_file`
- `pick_folder`, `get_recent_projects`, `add_recent_project`
- `terminal_create`, `terminal_write`, `terminal_resize`, `terminal_close`

## Data paths

- Recent projects: `%LOCALAPPDATA%\Vastoria\recent.json`

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+Shift+O` | Open folder |
| `Ctrl+S` | Save |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+Shift+A` | Toggle AI panel |
| `` Ctrl+` `` | Toggle terminal |
| `Ctrl+Shift+`` ` | New terminal |
| `Ctrl+\` | Split editor |
