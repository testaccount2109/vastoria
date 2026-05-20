import { aiContextUpdateUrl } from "./config";
import type { FileContextPayload } from "@/lib/ipc/types";

export interface ContextPushResult {
  ok: boolean;
  error?: string;
}

/**
 * Push workspace context to the AI backend (optional layer).
 * Failures are non-fatal — chat can proceed without fresh context.
 */
export async function pushWorkspaceContext(
  projectId: string,
  payload: FileContextPayload,
): Promise<ContextPushResult> {
  const url = aiContextUpdateUrl();
  if (!url) {
    return { ok: false, error: "AI backend disabled" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        cwd: payload.cwd,
        open_files: payload.openFiles.map((f) => ({
          path: f.path,
          content: f.content,
          language: f.language ?? null,
        })),
        active_file: payload.activeFile
          ? {
              path: payload.activeFile.path,
              selection: payload.activeFile.selection ?? null,
            }
          : null,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return { ok: false, error: `Context update failed: ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Context update failed",
    };
  }
}
