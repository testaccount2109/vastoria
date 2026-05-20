#!/usr/bin/env python3
"""Register a release and upload Windows installer + portable (+ optional MSI) to Vastoria Cloud."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    import httpx
except ImportError:  # pragma: no cover
    print("Install httpx: pip install httpx", file=sys.stderr)
    sys.exit(1)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Upload Vastoria Windows build to cloud API")
    default_api = (
        os.environ.get("CLOUD_API_URL")
        or os.environ.get("VASTORIA_API_URL")
        or "https://vastoria.online/api"
    )
    p.add_argument("--api-url", default=default_api)
    p.add_argument("--version", default=os.environ.get("VERSION"))
    p.add_argument("--installer", type=Path, default=os.environ.get("INSTALLER_OUT"))
    p.add_argument("--portable", type=Path, default=os.environ.get("PORTABLE_OUT"))
    p.add_argument("--msi", type=Path, default=os.environ.get("MSI_OUT"))
    p.add_argument("--changelog-file", type=Path, default=os.environ.get("CHANGELOG_FILE"))
    p.add_argument("--changelog", default=os.environ.get("CHANGELOG", ""))
    p.add_argument("--prerelease", action="store_true", default=os.environ.get("PRERELEASE", "0") == "1")
    p.add_argument("--admin-key", default=os.environ.get("VASTORIA_ADMIN_KEY", "allow"))
    p.add_argument("--recommended", action="store_true", default=True)
    p.add_argument("--manifest", type=Path, help="manifest.json from build-windows.ps1")
    return p.parse_args()


def load_changelog(args: argparse.Namespace) -> str:
    if args.changelog:
        return args.changelog
    if args.changelog_file and args.changelog_file.is_file():
        text = args.changelog_file.read_text(encoding="utf-8")
        version = args.version or ""
        pattern = rf"##\s*\[{re.escape(version)}\][^\n]*\n(.*?)(?=\n##\s*\[|\Z)"
        m = re.search(pattern, text, re.DOTALL)
        if m:
            return f"## {version}\n\n{m.group(1).strip()}"
        return text.strip()[:8000]
    return f"## {args.version}\n\nAutomated Windows build."


def admin_headers(key: str) -> dict[str, str]:
    return {"X-Vastoria-Admin": key}


def ensure_release(client: httpx.Client, args: argparse.Namespace, headers: dict[str, str]) -> None:
    version = args.version
    assert version
    changelog = load_changelog(args)
    payload = {
        "version": version,
        "changelog": changelog,
        "prerelease": args.prerelease,
        "tags": ["windows", "x64"],
        "recommended": args.recommended,
    }
    r = client.post(f"{args.api_url.rstrip('/')}/releases", json=payload, headers=headers)
    if r.status_code == 201:
        print(f"Created release {version}")
        return
    if r.status_code == 409:
        print(f"Release {version} exists, updating changelog…")
        client.patch(
            f"{args.api_url.rstrip('/')}/releases/{version}",
            json={"changelog": changelog, "prerelease": args.prerelease},
            headers=headers,
        )
        return
    r.raise_for_status()


def upload_artifact(
    client: httpx.Client,
    args: argparse.Namespace,
    headers: dict[str, str],
    path: Path,
    artifact_type: str,
    recommended: bool,
) -> None:
    version = args.version
    assert version
    if not path.is_file():
        raise FileNotFoundError(path)
    with path.open("rb") as f:
        files = {"file": (path.name, f, "application/octet-stream")}
        data = {
            "artifact_type": artifact_type,
            "recommended": str(recommended).lower(),
        }
        url = f"{args.api_url.rstrip('/')}/releases/{version}/artifacts"
        print(f"Uploading {artifact_type}: {path.name} ({path.stat().st_size} bytes)…")
        r = client.post(url, files=files, data=data, headers=headers, timeout=600.0)
    r.raise_for_status()
    body = r.json()
    print(f"  → artifact id {body['artifact']['id']}")


def main() -> int:
    args = parse_args()

    if args.manifest and args.manifest.is_file():
        data = json.loads(args.manifest.read_text(encoding="utf-8"))
        args.version = args.version or data["version"]
        if not args.installer:
            args.installer = Path(data["installer"]["path"])
        if not args.portable:
            args.portable = Path(data["portable"]["path"])
        if not args.msi and data.get("msi"):
            args.msi = Path(data["msi"]["path"])

    if not args.version or not args.installer or not args.portable:
        print("Need --version, --installer, --portable (or --manifest)", file=sys.stderr)
        return 1

    headers = admin_headers(args.admin_key)
    with httpx.Client() as client:
        ensure_release(client, args, headers)
        upload_artifact(client, args, headers, args.installer, "installer", args.recommended)
        upload_artifact(client, args, headers, args.portable, "portable", False)
        if args.msi and args.msi.is_file():
            upload_artifact(client, args, headers, args.msi, "msi", False)
    print("Upload complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
