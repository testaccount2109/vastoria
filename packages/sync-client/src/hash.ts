export async function hashContent(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function projectIdFromPath(rootPath: string): string {
  const normalized = rootPath.replace(/\\/g, "/").replace(/\/+$/, "");
  return `proj-${normalized}`;
}

interface ManifestEntry {
  path: string;
  content_hash: string;
}

/** Matches Python `version_hash_for_project`. */
export async function versionHashFromManifest(
  projectId: string,
  entries: ManifestEntry[],
): Promise<string> {
  const sorted = [...entries]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((e) => ({ content_hash: e.content_hash, path: e.path }));
  const payload = `${projectId}\n${JSON.stringify(sorted)}`;
  return hashContent(payload);
}
