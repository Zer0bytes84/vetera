// Development-only capture scenario, injected by vite.capture.config.ts into
// the debug desktop window. It sets the requested theme and index generation,
// opens the search, types the query, then signals "ready" through a file and
// restores the viewer's own settings once the screenshot is taken.
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

interface CaptureConfig {
  scenario: "palette" | "assistant";
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
  if (!(await prepare())) return;
  await step("app");
  await waitFor(() => document.querySelector("[data-sidebar]") ?? document.querySelector("main"));
  await step("palette");
  await sleep(1500);
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
