import hashlib
import json
from typing import Any


def hash_content(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_manifest(entries: list[dict[str, Any]]) -> str:
    """Stable JSON for file path + content hash pairs."""
    sorted_entries = sorted(entries, key=lambda e: e["path"])
    return json.dumps(sorted_entries, separators=(",", ":"), sort_keys=True)


def version_hash_for_project(project_id: str, entries: list[dict[str, Any]]) -> str:
    """Project-scoped snapshot version id."""
    payload = f"{project_id}\n{canonical_manifest(entries)}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def flatten_tree(nodes: list, prefix: str = "") -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for node in nodes:
        path = node.path if hasattr(node, "path") else node["path"]
        is_dir = (
            node.is_directory
            if hasattr(node, "is_directory")
            else node.get("is_directory", False)
        )
        content_hash = (
            node.content_hash
            if hasattr(node, "content_hash")
            else node.get("content_hash")
        )
        if not is_dir:
            entries.append({"path": path, "content_hash": content_hash or ""})
        children = (
            node.children
            if hasattr(node, "children")
            else node.get("children", [])
        )
        if children:
            entries.extend(flatten_tree(children))
    return entries
