// Acceptance of the native dictation through the real panel and the real
// microphone: the scenario clicks the panel's own Dicter / Arrêter buttons; the
// shell plays each recording through the speakers while the microphone listens
// (signal "play:<clip>" → "played:<clip>"). Times are read in the page:
// click on Dicter → listening, click on Arrêter → text shown in the field.
// Then the note is generated from the dictated rubrics, once per generator:
// click → "Rédaction de la note" (assistant loaded) → review tab (note written).
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { button, ensurePatient, ensureSession, setTextarea, sleep, waitFor } from "./capture-dictee";

const now = () => performance.now();
const seconds = (from: number, to: number) => +((to - from) / 1000).toFixed(2);
const field = () => document.querySelector<HTMLTextAreaElement>("textarea.assistant-dictation-field");
const alertText = () => document.querySelector('[role="alert"]')?.textContent ?? null;

export async function captureMicro(signal: string, clips: string[], generators: string[]) {
  const results: Record<string, unknown>[] = [];
  const save = () => writeTextFile(`${signal}.results.json`, JSON.stringify(results, null, 2));
  const waitShell = async (expected: string, timeout = 300_000) => {
    const started = Date.now();
    while ((await readTextFile(signal).catch(() => "")).trim() !== expected) {
      if (Date.now() - started > timeout) throw new Error(`Le shell n’a pas répondu : ${expected}`);
      await sleep(100);
    }
  };
  await ensureSession();
  const patientId = await ensurePatient();
  if (!patientId) return;
  location.hash = `#/patient/${encodeURIComponent(patientId)}`;
  await waitFor(() => document.body.innerText.includes("Dossier patient"));
  await sleep(1500);
  const opened = now();
  (await waitFor(() =>
    [...document.querySelectorAll<HTMLButtonElement>("button")].find((element) =>
      /assistant/i.test(element.getAttribute("aria-label") ?? element.textContent ?? ""),
    ),
  )).click();
  // The Dicter button is usable as soon as it is enabled (native companion status only).
  await waitFor(() => button("Dicter"), 60_000);
  results.push({ step: "panneau", dicterActifApres: seconds(opened, now()) });
  const dictated: Record<string, string> = {};
  for (const clip of clips.filter(Boolean)) {
    setTextarea(field()!, "");
    await sleep(500);
    const clicked = now();
    button("Dicter")!.click();
    await waitFor(() => document.body.innerText.includes("Écoute en cours") || alertText(), 300_000);
    const listening = now();
    if (alertText()) {
      results.push({ clip, error: alertText() });
      await save();
      break;
    }
    await writeTextFile(signal, `play:${clip}`);
    await waitShell(`played:${clip}`);
    await sleep(300);
    const stopped = now();
    (button("Arrêter") ?? button("Stop"))!.click();
    await waitFor(() => (field()?.value.trim() ? true : null) || alertText(), 600_000);
    const shown = now();
    dictated[clip] = field()?.value ?? "";
    results.push({
      clip,
      dicterVersEcoute: seconds(clicked, listening),
      arretVersTexte: seconds(stopped, shown),
      dicterVersTexte: seconds(clicked, shown),
      texte: dictated[clip],
      erreur: alertText(),
    });
    await save();
    await sleep(1500);
  }
  // Note: the four rubrics, the Plan being the dictated reference Plan.
  const reference = JSON.parse(await readTextFile(`${signal}.case.json`)) as { rubriques: Record<string, string> };
  const answers = [reference.rubriques.subjective, reference.rubriques.objective, reference.rubriques.assessment, dictated["plan-reference"] ?? reference.rubriques.plan];
  for (const [index, value] of answers.entries()) {
    setTextarea(field()!, value);
    await sleep(300);
    if (index < 3) button("Continuer vers")!.click();
    await sleep(500);
  }
  for (const generator of generators) {
    localStorage.setItem("baitari.generator", generator);
    const clicked = now();
    (button("Relire la note SOAP") ?? button("Relire ma dictée comme note"))!.click();
    await waitFor(() => document.body.innerText.includes("Rédaction de la note") || document.body.innerText.includes("Relecture & Validation SOAP") || alertText(), 600_000);
    const loaded = now();
    await waitFor(() => document.body.innerText.includes("Relecture & Validation SOAP") || alertText(), 600_000);
    const written = now();
    const plan = document.querySelector<HTMLTextAreaElement>("#soap-field-plan")?.value ?? null;
    results.push({
      step: "note",
      generator,
      chargementAssistant: seconds(clicked, loaded),
      redaction: seconds(loaded, written),
      total: seconds(clicked, written),
      erreur: alertText(),
      plan,
    });
    await save();
    // Back to the dictation for the next generator.
    button("Revoir la dictée")?.click();
    await sleep(1500);
  }
  await writeTextFile(signal, "restored");
}
