// Patient record capture: the record of one patient (header, safety zone,
// synthesis, chronology), then the command palette searched by its reference
// in each typed form. query = "<patient id>|<search 1>,<search 2>,…".
// Each state is photographed by the shell ("ready:<name>" → "done:<name>")
// and measured in the page; nothing is written to the database.
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { ensureSession, sleep, waitFor } from "./capture-dictee";

const setInput = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};
const textOf = (selector: string) => document.querySelector<HTMLElement>(selector)?.innerText.trim() ?? null;

export async function captureDossier(signal: string, query: string, restore: () => void = () => {}) {
  const [patientId, searches = ""] = query.split("|");
  // Red console lines met along the way are kept with the measures.
  const consoleErrors: string[] = (window as unknown as { __CAPTURE_ERRORS__?: string[] }).__CAPTURE_ERRORS__ ?? [];
  const results: Record<string, unknown>[] = [];
  const shot = async (name: string, measures: Record<string, unknown> = {}) => {
    await sleep(700);
    results.push({ name, ...measures, consoleErrors: [...consoleErrors] });
    await writeTextFile(`${signal}.results.json`, JSON.stringify(results, null, 2));
    await writeTextFile(signal, `ready:${name}`);
    for (let i = 0; i < 1200 && (await readTextFile(signal).catch(() => "")).trim() !== `done:${name}`; i++) await sleep(250);
  };
  await ensureSession();
  localStorage.setItem("baitari:ai-models-onboarding-dismissed", "true");
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setFocus();

  location.hash = `#/patient/${encodeURIComponent(patientId)}`;
  await waitFor(() => document.querySelector(".medical-patient-header"), 60_000);
  await waitFor(() => document.querySelector("#patient-chronologie .patient-timeline-event"), 30_000).catch(() => null);
  await sleep(2500);
  const scroller = document.querySelector<HTMLElement>('[data-slot="shell-scroll-panel"]');
  scroller?.scrollTo({ top: 0 });
  await shot("dossier-haut", {
    name: textOf(".medical-identity-name"),
    reference: textOf(".medical-reference"),
    owner: textOf(".medical-identity-owner strong"),
    allergy: textOf(".medical-safety-allergy p"),
    safety: textOf(".medical-safety"),
    prevention: textOf(".medical-prevention"),
    tabs: [...document.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent?.trim()),
  });
  // The synthesis: the record tabs, the last visit and prevention.
  document.querySelector(".medical-register")?.scrollIntoView({ block: "start" });
  // Computed ink of the parts the finish pass tunes, read from the page itself.
  const ink = (selector: string) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const style = getComputedStyle(element);
    return { color: style.color, size: style.fontSize, weight: style.fontWeight, family: style.fontFamily.split(",")[0] };
  };
  await shot("dossier-synthese", {
    reason: ink(".patient-overview-reason"),
    zero: ink(".patient-context-value"),
    timelineTitle: ink(".patient-timeline-title"),
    piece: ink(".patient-timeline-piece"),
  });
  document.querySelector("#patient-chronologie")?.scrollIntoView({ block: "start" });
  await shot("dossier-chronologie", {
    events: document.querySelectorAll("#patient-chronologie .patient-timeline-event").length,
    pieces: [...document.querySelectorAll("#patient-chronologie .patient-timeline-piece")].map((piece) => (piece as HTMLElement).innerText.replace(/\s+/g, " ").trim()),
  });
  // One « Afficher plus », when the chronology offers it.
  const more = [...document.querySelectorAll<HTMLButtonElement>("#patient-chronologie button")].find(
    (button) => button.textContent?.trim() === "Afficher plus"
  );
  if (more) {
    more.click();
    await sleep(500);
    document.querySelector("#patient-chronologie .patient-timeline-more")?.scrollIntoView({ block: "end" });
    await shot("dossier-chronologie-plus", {
      events: document.querySelectorAll("#patient-chronologie .patient-timeline-event").length,
      more: textOf("#patient-chronologie .patient-timeline-more"),
    });
    // Then every event, down to the oldest.
    for (let i = 0; i < 100; i++) {
      const next = [...document.querySelectorAll<HTMLButtonElement>("#patient-chronologie button")].find(
        (button) => button.textContent?.trim() === "Afficher plus"
      );
      if (!next) break;
      next.click();
      await sleep(300);
    }
    [...document.querySelectorAll("#patient-chronologie .patient-timeline-event")].at(-1)?.scrollIntoView({ block: "end" });
    await shot("dossier-chronologie-fin", {
      events: document.querySelectorAll("#patient-chronologie .patient-timeline-event").length,
      pieces: [...document.querySelectorAll("#patient-chronologie .patient-timeline-piece, #patient-chronologie [data-kind='piece'] .patient-timeline-body")].map((piece) => (piece as HTMLElement).innerText.replace(/\s+/g, " ").trim()),
    });
  }
  // The foot of the record: permanent information, under the chronology.
  scroller?.scrollTo({ top: scroller.scrollHeight });
  await shot("dossier-bas", { permanent: textOf(".medical-permanent") });

  for (const search of searches.split(",").filter(Boolean)) {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
    const input = await waitFor(() => {
      const found = document.querySelector<HTMLInputElement>("[data-command-palette-input]");
      if (!found) window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
      return found;
    });
    setInput(input, search);
    await sleep(1500);
    const first = document.querySelector<HTMLElement>('[cmdk-item][data-value^="patient:"]');
    await shot(`palette-${search}`, { search, firstPatient: first?.innerText.replace(/\s+/g, " ").trim() ?? null });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await sleep(600);
  }
  restore();
  await writeTextFile(signal, "restored");
}
