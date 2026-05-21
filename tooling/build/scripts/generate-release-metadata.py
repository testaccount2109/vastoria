#!/usr/bin/env python3
"""Generate static Windows release metadata from a Tauri build manifest."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate Vastoria release metadata")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--downloads-base-url", default=os.environ.get("DOWNLOADS_BASE_URL", "https://vastoria.online/downloads"))
    parser.add_argument("--existing-releases", type=Path)
    parser.add_argument("--changelog-file", type=Path, default=Path("CHANGELOG.md"))
    parser.add_argument("--version", default=os.environ.get("VERSION"))
    parser.add_argument("--tag", default=os.environ.get("GITHUB_REF_NAME"))
    parser.add_argument("--prerelease", action="store_true", default=os.environ.get("PRERELEASE", "0") == "1")
    return parser.parse_args()


def run_git(args: list[str]) -> str:
    try:
        return subprocess.check_output(["git", *args], text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return ""


def previous_tag(current_tag: str | None) -> str:
    if current_tag:
        tags = run_git(["tag", "--sort=-creatordate"]).splitlines()
        for tag in tags:
            if tag and tag != current_tag and re.match(r"^v?\d+\.\d+\.\d+", tag):
                return tag
    return run_git(["describe", "--tags", "--abbrev=0", "HEAD^"])


def changelog_from_file(path: Path, version: str) -> str:
    if not path.is_file():
        return ""
    text = path.read_text(encoding="utf-8")
    pattern = rf"##\s*\[?v?{re.escape(version)}\]?[^\n]*\n(.*?)(?=\n##\s|\Z)"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return f"## {version}\n\n{match.group(1).strip()}"
    return ""


def changelog_from_git(version: str, tag: str | None) -> str:
    current = tag or f"v{version}"
    prev = previous_tag(current)
    if prev:
        log = run_git(["log", "--pretty=format:- %s", f"{prev}..{current}"])
    else:
        log = run_git(["log", "--pretty=format:- %s", current])
    body = log if log else "- Automated Windows build"
    return f"## {version}\n\n{body}"


def normalize_existing(raw: Any) -> list[dict[str, Any]]:
    if isinstance(raw, dict) and isinstance(raw.get("releases"), list):
        return raw["releases"]
    if isinstance(raw, list):
        return raw
    return []


def load_existing(path: Path | None) -> list[dict[str, Any]]:
    if not path or not path.is_file() or path.stat().st_size == 0:
        return []
    try:
        return normalize_existing(json.loads(path.read_text(encoding="utf-8")))
    except json.JSONDecodeError:
        return []


def normalize_version(value: str) -> str:
    return value.strip().lstrip("v")


def validate_release_identity(manifest: dict[str, Any], version: str, tag: str) -> None:
    manifest_version = normalize_version(str(manifest.get("version", "")))
    tag_version = normalize_version(tag)
    if not version:
        raise ValueError("Release version is required")
    if manifest_version and manifest_version != version:
        raise ValueError(
            f"Manifest version {manifest_version} does not match release version {version}"
        )
    if tag_version and tag_version != version:
        raise ValueError(f"Tag {tag} does not match release version {version}")


def validate_required_assets(manifest: dict[str, Any]) -> None:
    missing = [
        key
        for key in ("installer", "portable", "msi")
        if not isinstance(manifest.get(key), dict)
    ]
    if missing:
        raise ValueError(f"Manifest missing required Windows assets: {', '.join(missing)}")
    for key in ("installer", "portable", "msi"):
        item = manifest[key]
        for field in ("filename", "sha256", "size_bytes"):
            if not item.get(field):
                raise ValueError(f"Manifest asset {key} missing {field}")


def asset(manifest: dict[str, Any], key: str, base_url: str, version: str, recommended: bool) -> dict[str, Any] | None:
    item = manifest.get(key)
    if not item:
        return None
    filename = item["filename"]
    version_path = version if version.startswith("v") else f"v{version}"
    return {
        "url": f"{base_url.rstrip('/')}/windows/{version_path}/{filename}",
        "sha256": item["sha256"],
        "size_bytes": item["size_bytes"],
        "recommended": recommended,
        "platform": "windows_x86_64",
    }


def main() -> int:
    args = parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    tag = args.tag or os.environ.get("GITHUB_REF_NAME") or ""
    version = normalize_version(args.version or tag or manifest["version"])
    tag = tag or f"v{version}"
    validate_release_identity(manifest, version, tag)
    validate_required_assets(manifest)
    published_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    changelog = changelog_from_file(args.changelog_file, version) or changelog_from_git(version, tag)

    release = {
        "version": version,
        "published_at": published_at,
        "prerelease": args.prerelease,
        "tags": ["windows", "x64"],
        "recommended": not args.prerelease,
        "changelog": changelog,
        "downloads": {
            "installer": asset(manifest, "installer", args.downloads_base_url, version, True),
            "portable": asset(manifest, "portable", args.downloads_base_url, version, False),
            "msi": asset(manifest, "msi", args.downloads_base_url, version, False),
        },
    }
    release["downloads"] = {k: v for k, v in release["downloads"].items() if v}

    releases = [r for r in load_existing(args.existing_releases) if r.get("version") != version]
    releases.insert(0, release)

    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "latest.json").write_text(json.dumps({"release": release}, indent=2) + "\n", encoding="utf-8")
    (args.out_dir / "releases.json").write_text(json.dumps({"releases": releases, "total": len(releases)}, indent=2) + "\n", encoding="utf-8")
    (args.out_dir / "CHANGELOG.md").write_text("\n\n".join(r["changelog"].strip() for r in releases if r.get("changelog")) + "\n", encoding="utf-8")
    (args.out_dir / "RELEASE_NOTES.md").write_text(changelog + "\n", encoding="utf-8")
    print(f"Generated metadata for v{version} in {args.out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
