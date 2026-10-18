import { isTauriRuntime } from "@/services/browser-store";
import { getSetting, setSetting } from "@/services/appSettingsService";
import type { PatientRecordPdf } from "./patient-record-types";

const DIRECTORY_KEY = "patient_record_pdf_directory";

export async function requirePatientRecordSession(artifact: PatientRecordPdf): Promise<void> {
  const { authRepository } = await import("@/data/repositories");
  const user = await authRepository.getCurrentUser();
  if (!user || user.id !== artifact.requestedBy) {
    throw new Error("Votre session a changé. Rouvrez l’export depuis le dossier patient.");
  }
}

/** Save the exact artifact that was previewed. A cancelled picker writes nothing. */
export async function savePatientRecordPdf(artifact: PatientRecordPdf): Promise<{ path: string; downloaded: boolean } | null> {
  await requirePatientRecordSession(artifact);
  if (!isTauriRuntime()) {
    const data = new Blob([Uint8Array.from(artifact.bytes).buffer], { type: "application/pdf" });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = artifact.filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return { path: artifact.filename, downloaded: true };
  }

  const { save } = await import("@tauri-apps/plugin-dialog");
  const { desktopDir, join, dirname } = await import("@tauri-apps/api/path");
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  let directory: string | null = null;
  try { directory = await getSetting(DIRECTORY_KEY); } catch { /* A preference must not prevent saving. */ }
  const defaultPath = await join(directory || await desktopDir(), artifact.filename);
  const path = await save({
    title: "Enregistrer le dossier patient",
    defaultPath,
    filters: [{ name: "Dossier PDF", extensions: ["pdf"] }],
  });
  if (!path) return null;
  await requirePatientRecordSession(artifact);
  await writeFile(path, artifact.bytes);
  try { await setSetting(DIRECTORY_KEY, await dirname(path)); } catch { /* The PDF is already safely written. */ }
  return { path, downloaded: false };
}

function artifactDataUrl(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return `data:application/pdf;base64,${btoa(binary)}`;
}

/** WebKit prints locally rendered pages, without an external viewer or service. */
export async function printPatientRecordPdf(artifact: PatientRecordPdf, signal?: AbortSignal): Promise<void> {
  await requirePatientRecordSession(artifact);
  const { renderPdfPages } = await import("@/modules/documents/lib/managed-document-pdf");
  const pages = await renderPdfPages(artifactDataUrl(artifact.bytes), signal);
  if (signal?.aborted) throw new DOMException("Impression annulée", "AbortError");
  await requirePatientRecordSession(artifact);
  const frame = document.createElement("iframe");
  frame.title = `Impression du dossier de ${artifact.patientName}`;
  frame.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.appendChild(frame);
  const target = frame.contentDocument;
  const view = frame.contentWindow;
  if (!target || !view) {
    frame.remove();
    throw new Error("L’impression du dossier n’a pas pu être préparée.");
  }
  const cleanup = () => frame.remove();
  signal?.addEventListener("abort", cleanup, { once: true });
  try {
    target.open();
    target.write("<!doctype html><html lang='fr'><head><title>Dossier patient</title><style>@page{size:A4;margin:0}body{margin:0}img{display:block;width:210mm;height:297mm;break-after:page}img:last-child{break-after:auto}</style></head><body></body></html>");
    target.close();
    target.title = artifact.filename;
    let abortLoading: (() => void) | undefined;
    const interrupted = new Promise<never>((_resolve, reject) => {
      abortLoading = () => reject(new DOMException("Impression annulée", "AbortError"));
      signal?.addEventListener("abort", abortLoading, { once: true });
      if (signal?.aborted) abortLoading();
    });
    const loaded = Promise.all(pages.map((source, index) => new Promise<void>((resolve, reject) => {
      const image = target.createElement("img");
      image.alt = `Page ${index + 1} du dossier`;
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Une page du dossier n’a pas pu être préparée pour l’impression."));
      image.src = source;
      target.body.appendChild(image);
    })));
    try { await Promise.race([loaded, interrupted]); }
    finally { if (abortLoading) signal?.removeEventListener("abort", abortLoading); }
    if (signal?.aborted) throw new DOMException("Impression annulée", "AbortError");
    view.addEventListener("afterprint", cleanup, { once: true });
    view.focus();
    view.print();
    setTimeout(cleanup, 120_000);
  } catch (error) {
    cleanup();
    throw error;
  } finally {
    signal?.removeEventListener("abort", cleanup);
  }
}
