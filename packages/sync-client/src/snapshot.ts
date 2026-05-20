import { hashContent } from "./hash";
import type { FilePayload, FileSnapshotNode, SnapshotTree } from "./types";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "target",
  "dist",
  ".venv",
  "__pycache__",
  ".vastoria",
]);

export interface LocalFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: LocalFileEntry[];
}

export interface SnapshotBuildOptions {
  maxFiles?: number;
  readFile: (path: string) => Promise<string>;
}

export interface SnapshotBuildResult {
  tree: SnapshotTree;
  files: FilePayload[];
  manifest: Array<{ path: string; content_hash: string }>;
}

function shouldSkip(name: string): boolean {
  return SKIP_DIRS.has(name) || name.startsWith(".");
}

export async function buildSnapshot(
  entries: LocalFileEntry[],
  options: SnapshotBuildOptions,
): Promise<SnapshotBuildResult> {
  const maxFiles = options.maxFiles ?? 2000;
  const files: FilePayload[] = [];
  const manifest: Array<{ path: string; content_hash: string }> = [];

  async function walk(
    nodes: LocalFileEntry[],
    relPrefix: string,
  ): Promise<FileSnapshotNode[]> {
    const result: FileSnapshotNode[] = [];
    for (const entry of nodes) {
      if (shouldSkip(entry.name)) continue;

      const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;

      if (entry.isDirectory) {
        const children = entry.children
          ? await walk(entry.children, relPath)
          : [];
        result.push({
          path: relPath,
          is_directory: true,
          children,
        });
        continue;
      }

      if (files.length >= maxFiles) continue;

      const content = await options.readFile(entry.path);
      const content_hash = await hashContent(content);
      manifest.push({ path: relPath, content_hash });
      files.push({ path: relPath, content_hash, content });
      result.push({
        path: relPath,
        is_directory: false,
        content_hash,
        size: content.length,
        children: [],
      });
    }
    return result;
  }

  const treeNodes = await walk(entries, "");
  return { tree: { nodes: treeNodes }, files, manifest };
}

export function diffManifests(
  oldEntries: Array<{ path: string; content_hash: string }>,
  newEntries: Array<{ path: string; content_hash: string }>,
): { added: string[]; removed: string[]; changed: string[] } {
  const oldMap = new Map(oldEntries.map((e) => [e.path, e.content_hash]));
  const newMap = new Map(newEntries.map((e) => [e.path, e.content_hash]));
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const [path, hash] of newMap) {
    if (!oldMap.has(path)) added.push(path);
    else if (oldMap.get(path) !== hash) changed.push(path);
  }
  for (const path of oldMap.keys()) {
    if (!newMap.has(path)) removed.push(path);
  }
  return { added, removed, changed };
}

export function filterIncrementalFiles(
  files: FilePayload[],
  changedPaths: Set<string>,
): FilePayload[] {
  return files.filter((f) => changedPaths.has(f.path));
}
