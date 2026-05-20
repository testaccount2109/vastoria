import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri";
import type { FileEntry, ReadFileResult } from "./types";

const MOCK_TREE: FileEntry[] = [
  {
    name: "src",
    path: "/mock/workspace/src",
    isDirectory: true,
    children: [
      { name: "main.ts", path: "/mock/workspace/src/main.ts", isDirectory: false },
      { name: "utils.ts", path: "/mock/workspace/src/utils.ts", isDirectory: false },
    ],
  },
  { name: "README.md", path: "/mock/workspace/README.md", isDirectory: false },
];

const MOCK_FILES: Record<string, string> = {
  "/mock/workspace/src/main.ts": `// Vastoria mock workspace\nexport function main() {\n  console.log("Hello from Vastoria");\n}\n`,
  "/mock/workspace/src/utils.ts": `export const add = (a: number, b: number) => a + b;\n`,
  "/mock/workspace/README.md": `# Vastoria\n\nOpen a folder via **File → Open Folder** when running in Tauri.\n`,
};

export async function readDirectory(path: string): Promise<FileEntry[]> {
  if (isTauri()) {
    return invoke<FileEntry[]>("read_directory", { path });
  }
  if (path === "/mock/workspace") return MOCK_TREE;
  const node = findNode(MOCK_TREE, path);
  return node?.children ?? [];
}

export async function readDirectoryRecursive(root: string): Promise<FileEntry[]> {
  if (isTauri()) {
    return invoke<FileEntry[]>("read_directory_recursive", { root });
  }
  return MOCK_TREE;
}

export async function readFile(path: string): Promise<ReadFileResult> {
  if (isTauri()) {
    return invoke<ReadFileResult>("read_file", { path });
  }
  return {
    path,
    content: MOCK_FILES[path] ?? `// ${path}\n`,
  };
}

export async function writeFile(path: string, content: string): Promise<void> {
  if (isTauri()) {
    await invoke("write_file", { path, content });
    return;
  }
  MOCK_FILES[path] = content;
}

function findNode(entries: FileEntry[], path: string): FileEntry | undefined {
  for (const e of entries) {
    if (e.path === path) return e;
    if (e.children) {
      const found = findNode(e.children, path);
      if (found) return found;
    }
  }
  return undefined;
}
