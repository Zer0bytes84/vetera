import { Channel, convertFileSrc, invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/services/browser-store";
import type { AIProvisioningProgress } from "../services/ai-model-provisioning";

export interface LocalModelStatus {
  root: string | null;
  whisperReady: boolean;
  whisperModel?: string | null;
  generatorReady: boolean;
  embeddingReady?: boolean;
}
export const EMPTY_MODEL_STATUS: LocalModelStatus = {
  root: null,
  whisperReady: false,
  generatorReady: false,
};
export async function getLocalModels(): Promise<LocalModelStatus> {
  return isTauriRuntime()
    ? invoke("local_ai_model_status")
    : EMPTY_MODEL_STATUS;
}
export async function downloadLocalModels(
  onProgress?: (progress: AIProvisioningProgress) => void,
  accessToken?: string
): Promise<LocalModelStatus> {
  if (!isTauriRuntime()) {
    throw new Error("Le téléchargement des outils locaux se fait dans l’application de bureau. Vous pouvez continuer à utiliser la version web.");
  }
  const channel = new Channel<AIProvisioningProgress>();
  channel.onmessage = progress => onProgress?.(progress);
  return invoke("download_local_ai_models", { onProgress: channel, accessToken: accessToken?.trim() || null });
}
export async function cancelLocalModelDownload() {
  if (isTauriRuntime()) await invoke("cancel_local_ai_download");
}
export async function importLocalModel(
  kind: "whisper" | "generator" | "embeddinggemma"
) {
  if (!isTauriRuntime())
    throw new Error(
      "L’import des modèles se fait dans l’application Baitari de bureau."
    );
  const { open } = await import("@tauri-apps/plugin-dialog");
  const path = await open(
    kind !== "generator"
      ? {
          directory: true,
          multiple: false,
          title:
            kind === "whisper"
              ? "Choisir le dossier de dictée téléchargé"
              : "Choisir le dossier de recherche locale téléchargé",
        }
      : {
          directory: false,
          multiple: false,
          title: "Choisir le fichier de préparation des notes",
          filters: [{ name: "Préparation des notes", extensions: ["task"] }],
        }
  );
  if (!path || Array.isArray(path)) return null;
  return invoke<LocalModelStatus>("import_local_ai_model", {
    kind,
    source: path,
  });
}
export function getLocalModelUrls(status: LocalModelStatus) {
  if (!status.root)
    throw new Error("Importez d’abord les modèles locaux depuis le disque.");
  const modelRoot = `${convertFileSrc(status.root).replace(/\/$/, "")}/`;
  return {
    modelRoot,
    modelUrl: `${modelRoot}generator/gemma3.task`,
    runtimeRoot: new URL(
      `${import.meta.env.BASE_URL}local-ai-runtime/`,
      window.location.href
    ).href,
  };
}
