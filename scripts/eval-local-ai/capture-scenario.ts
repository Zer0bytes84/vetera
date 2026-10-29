// Development-only capture scenario, injected by vite.capture.config.ts into
// the debug desktop window. It sets the requested theme and index generation,
// opens the search, types the query, then signals "ready" through a file and
// restores the viewer's own settings once the screenshot is taken.
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

interface CaptureConfig {
  scenario: "palette" | "assistant" | "outils-ia" | "reset" | "dictee" | "micro" | "tableau";
  /** "dictee": generator preference set before the dictation (gemma3 or gemma4). */
  generator?: string;
  /** "outils-ia": position the switch must reach ("on" = new assistant version). */
  toggle?: "on" | "off";
  theme: "light" | "dark";
  generation: "sections" | "passages";
  query: string;
  patientId?: string;
  signal: string;
}
const config = (window as unknown as { __CAPTURE__: CaptureConfig }).__CAPTURE__;
const KEYS = ["theme", "baitari.search.generation"] as const;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async <T>(probe: () => T | null | undefined, timeout = 30_000) => {
  const started = Date.now();
  for (;;) {
    const value = probe();
    if (value) return value;
    if (Date.now() - started > timeout) throw new Error("Élément introuvable pour la capture.");
    await sleep(250);
  }
};
const setInput = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};
const byText = (selector: string, text: string) =>
  [...document.querySelectorAll<HTMLElement>(selector)].find((element) => element.textContent?.trim().includes(text));

async function prepare() {
  if (!sessionStorage.getItem("capture-originals")) {
    const originals = Object.fromEntries(KEYS.map((key) => [key, localStorage.getItem(key)]));
    sessionStorage.setItem("capture-originals", JSON.stringify(originals));
    await writeTextFile(config.signal + ".originals.json", JSON.stringify(originals));
    localStorage.setItem("theme", config.theme);
    localStorage.setItem("baitari.search.generation", config.generation);
    location.reload();
    return false;
  }
  return true;
}

function restore() {
  const originals = JSON.parse(sessionStorage.getItem("capture-originals") ?? "{}") as Record<string, string | null>;
  for (const key of KEYS) {
    if (originals[key] === null || originals[key] === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, originals[key]!);
  }
}

const step = (name: string) => writeTextFile(config.signal, `step: ${name}`).catch(() => {});

async function run() {
  // "reset" writes the viewer's own values back (theme given, no index key).
  if (config.scenario === "reset") {
    localStorage.setItem("theme", config.theme);
    localStorage.removeItem("baitari.search.generation");
    // Generator choice made by an "outils-ia" capture: back to the app default.
    localStorage.removeItem("baitari.generator");
    await writeTextFile(config.signal, "restored");
    return;
  }
  // Native dictation acceptance: real panel, real microphone (query = clips, generator = generators).
  if (config.scenario === "micro") {
    localStorage.setItem("baitari:ai-models-onboarding-completed", "true");
    const { captureMicro } = await import("./capture-micro");
    await captureMicro(config.signal, config.query.split(","), (config.generator ?? "gemma3").split(","));
    return;
  }
  // Dashboard widgets: one pass per appearance listed in the query.
  if (config.scenario === "tableau") {
    const { captureDashboard } = await import("./capture-tableau");
    await captureDashboard(config.signal, config.query.split(","));
    return;
  }
  // No reload here: the first launch on an empty folder is still creating its database.
  if (config.scenario === "dictee") {
    // Field test path: generator chosen on that computer, note dictated by rubric.
    if (config.generator) localStorage.setItem("baitari.generator", config.generator);
    localStorage.setItem("baitari:ai-models-onboarding-completed", "true");
    const { captureDictation } = await import("./capture-dictee");
    await captureDictation(config.signal, config.query);
    return;
  }
  if (!(await prepare())) return;
  await step("app");
  await waitFor(() => document.querySelector("[data-sidebar]") ?? document.querySelector("main"));
  await step("palette");
  await sleep(1500);
  if (config.scenario === "outils-ia") {
    // The real Settings card: the switch writes the generator preference that
    // the next notes use (kept after the capture; the shell restores it at the end).
    await writeTextFile(config.signal + ".generator-before", localStorage.getItem("baitari.generator") ?? "(absente)");
    sessionStorage.setItem("baitari:pending-ai-settings", "true");
    location.hash = "#/parametres";
    const title = await waitFor(() => byText("h4", "Nouvelle version de l’Assistant IA"));
    title.scrollIntoView({ block: "center" });
    await sleep(1500);
    await writeTextFile(config.signal, "ready");
    for (let i = 0; i < 600 && (await readTextFile(config.signal).catch(() => "")).trim() !== "done"; i++) await sleep(500);
    const card = title.closest("article")!;
    const toggle = await waitFor(() => card.querySelector<HTMLElement>('[role="switch"]'));
    if ((toggle.getAttribute("aria-checked") === "true") !== (config.toggle === "on")) toggle.click();
    await sleep(1200);
    await writeTextFile(config.signal, `ready-2 ${localStorage.getItem("baitari.generator") ?? "(absente)"} ${toggle.getAttribute("aria-checked")}`);
    for (let i = 0; i < 600 && (await readTextFile(config.signal).catch(() => "")).trim() !== "done-2"; i++) await sleep(500);
    restore();
    await writeTextFile(config.signal, "restored");
    return;
  }
  if (config.scenario === "palette") {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
    const input = await waitFor(() => {
      const found = document.querySelector<HTMLInputElement>("[data-command-palette-input]");
      if (!found) window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
      return found;
    });
    await step("saisie");
    setInput(input, config.query);
    // Instant lexical results, then the semantic pass (model warm-up included).
    await sleep(25_000);
  } else {
    await step("patient");
    location.hash = `#/patient/${encodeURIComponent(config.patientId ?? "")}`;
    // The patient file must be open before the assistant, so it takes this patient.
    await waitFor(() => document.body.innerText.includes("Dossier patient") || null);
    await sleep(1500);
    const assistant = await waitFor(() =>
      [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
        /assistant/i.test(button.getAttribute("aria-label") ?? button.textContent ?? ""),
      ),
    );
    assistant.click();
    await step("assistant");
    (await waitFor(() => byText("button", "Cas similaires"))).click();
    const input = await waitFor(() =>
      document.querySelector<HTMLInputElement>('input[aria-label="Rechercher dans les dossiers"], input[aria-label="Rechercher un cas similaire"]'),
    );
    setInput(input, config.query);
    await sleep(300);
    (await waitFor(() => byText("button", "Rechercher") as HTMLButtonElement | undefined)).click();
    await sleep(1500);
    await waitFor(() => !document.querySelector(".assistant-thinking-text") || null, 180_000);
    await sleep(1000);
  }
  await writeTextFile(config.signal, "ready");
  // The shell takes the screenshot, then writes "done".
  for (let i = 0; i < 600; i++) {
    const state = await readTextFile(config.signal).catch(() => "");
    if (state.trim() === "done") break;
    await sleep(500);
  }
  restore();
  await writeTextFile(config.signal, "restored");
}

run().catch(async (error) => {
  restore();
  await writeTextFile(config.signal, `failed: ${error instanceof Error ? error.message : String(error)}`).catch(() => {});
});
