# Changelog

All notable releases of Vastoria IDE are documented here.

## [0.1.2] — 2026-05-18

### Added
- Windows-first build pipeline (`build-windows.ps1`, `release-windows.yml`)
- NSIS installer, portable exe, and optional MSI artifacts
- PowerShell, Windows Terminal, and CMD terminal integration

### Changed
- **Platform pivot:** Windows is the only officially supported platform
- Rebranded website and docs for Native Windows AI IDE positioning
- Cloud API artifacts: `installer`, `portable`, `msi` on `windows_x86_64`
- AppData storage path for recent projects (`%LOCALAPPDATA%\Vastoria\`)

### Removed
- Linux AppImage, tar.gz, and Linux CI workflow
- Wayland/X11/CachyOS marketing and download flows

## [0.1.1] — 2026-05-17

### Added
- `/updates/check` and `/updates/latest` on cloud API (version checks only)
- Production `deploy/docker-compose.cloud.yml` (AI-free backend)
- `tooling/validate/system-validate.sh` end-to-end validation with self-heal

### Changed
- Cloud API no longer exposes `/models` (AI metadata stays on local ai-backend)
- Infrastructure config: local-first URLs vs production cloud domains
- Download base: `https://vastoria.online/downloads`

### Security
- Enforced backend isolation: no Ollama, no inference, no agents on cloud

## [0.1.0] — 2026-05-10

### Added
- Initial Tauri desktop shell with Monaco editor and integrated terminal
- AI panel hooks for local Ollama backend
- Optional cloud sync for project snapshots
