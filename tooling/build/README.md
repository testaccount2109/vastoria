# Vastoria Windows build pipeline

Windows-only pipeline that builds the **React + Tauri** IDE and packages:

| Artifact | Path |
|----------|------|
| NSIS installer | `dist/builds/<version>/Vastoria-<version>-x64-setup.exe` |
| Portable exe | `dist/builds/<version>/Vastoria-<version>-x64-portable.exe` |
| MSI (optional) | `dist/builds/<version>/Vastoria-<version>-x64.msi` |

## Requirements

- Windows 10/11 x64
- Node.js 22+, pnpm 9+, Rust stable (`x86_64-pc-windows-msvc`)
- WebView2 (installed automatically by the NSIS bootstrapper when missing)

## Local build

```powershell
pnpm install
.\tooling\build\scripts\build-windows.ps1
```

Set `SKIP_UPLOAD=0` and `VASTORIA_API_URL=https://vastoria.online/api` to register the release on the cloud API after building.

## CI

Workflow: `.github/workflows/release-windows.yml`

- **Runner:** `windows-latest`
- **Build job:** pnpm + Rust caches, NSIS + MSI + portable artifacts
- **Deploy job:** uploads Windows artifacts and release metadata to `/var/www/vastoria/downloads/windows`
- **GitHub Release job:** publishes the release only after the public `/downloads/windows` URLs verify successfully

## Code signing

Configure Authenticode signing in CI by setting repository secrets and extending `build-windows.ps1` with `signtool.exe` after bundle creation. Tauri supports `certificateThumbprint` in `tauri.conf.json` → `bundle.windows`.

## Auto-updater

Production update checks use `https://vastoria.online/api/updates/latest?platform=windows_x86_64`. Add your updater public key to `tauri.conf.json` → `plugins.updater.pubkey` before enabling signed Tauri updater artifacts.

## Steps (inside `build-windows.ps1`)

1. `pnpm install` — monorepo dependencies
2. `pnpm --filter @vastoria/ide build` — Vite frontend
3. `tauri build --bundles nsis,msi` — Windows x64 bundles
4. Copy portable binary from `target/release/`
5. Write `manifest.json` with SHA256 checksums
6. Optional cloud upload via `upload-release.py`
