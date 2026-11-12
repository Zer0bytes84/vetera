// Agenda « Ouvrir » demonstration: from the Agenda list, « Ouvrir » on a
// completed appointment targets it in Flux without restarting it, then on a new
// one starts its consultation. query = "<appearance>|<completed id>:<name>|<new id>:<name>".
// Each state is photographed by the shell ("ready:<name>" → "done:<name>") and
// measured in the page: route, focused card, consultation open.
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { ensureSession, sleep, waitFor } from "./capture-dictee";

const buttonText = (text: string, root: ParentNode = document) =>
  [...root.querySelectorAll<HTMLElement>("button, [role='tab'], [role='menuitem']")].find(
    (b) => b.textContent?.trim() === text,
  );

export async function captureAgenda(signal: string, query: string) {
  const [appearance, completed, fresh] = query.split("|");
  const [completedId, completedName] = completed.split(":");
  const [freshId, freshName] = fresh.split(":");
  const results: Record<string, unknown>[] = [];
  const shot = async (name: string, measures: Record<string, unknown> = {}) => {
    await sleep(700);
    results.push({ name, ...measures });
    await writeTextFile(`${signal}.results.json`, JSON.stringify(results, null, 2));
    await writeTextFile(signal, `ready:${appearance}-${name}`);
    for (let i = 0; i < 1200 && (await readTextFile(signal).catch(() => "")).trim() !== `done:${appearance}-${name}`; i++) await sleep(250);
  };
  await ensureSession();
  if (appearance.startsWith("premium")) throw new Error("Premium a été retiré : une seule interface (Clean), clair ou sombre.");
  const mode = appearance.endsWith("dark") ? "dark" : "light";
  localStorage.setItem("baitari:ai-models-onboarding-dismissed", "true");
  if (!sessionStorage.getItem("agenda-themed")) {
    sessionStorage.setItem("agenda-themed", "1");
    localStorage.setItem("theme", mode);
    location.reload();
    return;
  }
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setFocus();

  const measure = (id: string) => ({
    hash: location.hash,
    pendingStart: sessionStorage.getItem("vetera:pending-consultation-start"),
    pendingShow: sessionStorage.getItem("vetera:flux-show"),
    consultationOpen: document.body.innerText.includes("Retour au tableau"),
    focusedCard: document.activeElement?.textContent?.trim().slice(0, 80) ?? null,
    appointmentId: id,
  });

  const openFromAgenda = async (id: string, patient: string, label: string) => {
    location.hash = "#/agenda";
    const list = await waitFor(() => buttonText("Liste"), 60_000);
    await sleep(1200);
    list.click();
    const trigger = await waitFor(() => document.querySelector<HTMLElement>(`[aria-label="Actions pour ${patient}"]`), 30_000);
    trigger.scrollIntoView({ block: "center" });
    trigger.click();
    const ouvrir = await waitFor(() => buttonText("Ouvrir", document.querySelector("[role='menu']") ?? document), 10_000);
    await shot(`${label}-agenda-menu`, { appointmentId: id, patient });
    ouvrir.click();
    await waitFor(() => (location.hash.startsWith("#/flux") ? true : null), 15_000);
  };

  // 1. Completed: targeted in Flux, never restarted.
  await openFromAgenda(completedId, completedName, "termine");
  await waitFor(() => (document.activeElement?.textContent?.includes(completedName) ? true : null), 15_000).catch(() => null);
  await sleep(800);
  await shot("termine-flux", measure(completedId));

  // 2. New: its consultation starts in Flux.
  await openFromAgenda(freshId, freshName, "neuf");
  await waitFor(() => (document.body.innerText.includes("Retour au tableau") ? true : null), 20_000).catch(() => null);
  await sleep(1200);
  await shot("neuf-flux", measure(freshId));

  await writeTextFile(signal, "restored");
}
