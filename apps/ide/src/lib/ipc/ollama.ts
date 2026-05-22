import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  OllamaModel,
  OllamaProgressEvent,
  OllamaStatus,
  RuntimeInfo,
} from "./types";

export function getOllamaStatus(): Promise<OllamaStatus> {
  return invoke("ollama_status");
}

export function getOllamaModels(): Promise<OllamaModel[]> {
  return invoke("ollama_models");
}

export function pullOllamaModel(model: string): Promise<void> {
  return invoke("ollama_pull_model", { model });
}

export function updateOllamaModel(model: string): Promise<void> {
  return invoke("ollama_update_model", { model });
}

export function removeOllamaModel(model: string): Promise<void> {
  return invoke("ollama_remove_model", { model });
}

export function startOllamaModel(model: string): Promise<void> {
  return invoke("ollama_start_model", { model });
}

export function stopOllamaModel(model: string): Promise<void> {
  return invoke("ollama_stop_model", { model });
}

export function installOllama(): Promise<void> {
  return invoke("install_ollama");
}

export function cancelOllamaOperation(operationId: string): Promise<void> {
  return invoke("ollama_cancel_operation", { operationId });
}

export function getRuntimeInfo(): Promise<RuntimeInfo> {
  return invoke("runtime_info");
}

export function onOllamaProgress(callback: (event: OllamaProgressEvent) => void) {
  return listen<OllamaProgressEvent>("ollama://progress", (event) => callback(event.payload));
}
