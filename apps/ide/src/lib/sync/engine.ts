import {
  SyncEngine,
  type LocalFileEntry,
  type SyncEngineStatus,
} from "@vastoria/sync-client";
import { readDirectoryRecursive, readFile, writeFile, type FileEntry } from "@/lib/ipc";
import { getSyncApiBase } from "./config";

function toLocalEntries(entries: FileEntry[]): LocalFileEntry[] {
  return entries.map((e) => ({
    name: e.name,
    path: e.path,
    isDirectory: e.isDirectory,
    children: e.children ? toLocalEntries(e.children) : undefined,
  }));
}

export async function buildTreeForRoot(rootPath: string): Promise<LocalFileEntry[]> {
  const tree = await readDirectoryRecursive(rootPath);
  return toLocalEntries(tree);
}

export function createSyncEngine(
  getRootPath: () => string | null,
  onStatus?: (status: SyncEngineStatus) => void,
): SyncEngine {
  return new SyncEngine({
    baseUrl: getSyncApiBase(),
    readFile: async (path) => (await readFile(path)).content,
    writeFile: async (path, content) => writeFile(path, content),
    getFileTree: async () => {
      const root = getRootPath();
      if (!root) return [];
      return buildTreeForRoot(root);
    },
    onStatus,
  });
}
