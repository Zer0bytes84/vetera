// Lot 3 demonstration: a note kept without any visit, dictated from the
// patient's record through the real microphone (the shell plays the recording:
// "play:<clip>" → "played:<clip>"), structured by the assistant, validated by
// the vet, then found again in the record, absent from Flux, and found by the
// search (instant words and semantic meaning). Each state is photographed by
// the shell ("ready:<name>" → "done:<name>") and measured in the database.
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { button, ensurePatient, ensureSession, setTextarea, sleep, waitFor } from "./capture-dictee";

const alertText = () => document.querySelector('[role="alert"]')?.textContent ?? null;
const setInput = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

export async function captureLot3(signal: string, clip: string) {
  const results: Record<string, unknown>[] = [];
  const save = () => writeTextFile(`${signal}.results.json`, JSON.stringify(results, null, 2));
  const waitShell = async (expected: string, timeout = 300_000) => {
    const started = Date.now();
    while ((await readTextFile(signal).catch(() => "")).trim() !== expected) {
      if (Date.now() - started > timeout) throw new Error(`Le shell n’a pas répondu : ${expected}`);
      await sleep(100);
    }
  };
  const shot = async (name: string, measures: Record<string, unknown> = {}) => {
    await sleep(800);
    results.push({ name, ...measures });
    await save();
    await writeTextFile(signal, `ready:${name}`);
    await waitShell(`done:${name}`, 120_000);
  };
  const { runDbRead } = await import("@/services/sqlite/database");
  const counts = (patientId: string) =>
    runDbRead(async (db) => ({
      appointments: (await db.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM appointments"))[0].n,
      patientAppointments: (await db.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM appointments WHERE patient_id = ?", [patientId]))[0].n,
      notes: await db.select<{ id: string; title: string; created_at: string; tags: string }[]>(
        "SELECT id, title, created_at, tags FROM notes WHERE patient_id = ?", [patientId]),
      embeddings: await db.select<{ note_id: string; source_type: string; section: string }[]>(
        "SELECT note_id, source_type, section FROM embeddings WHERE patient_id = ? AND note_id IS NOT NULL", [patientId]),
    }));

  await ensureSession();
  const patientId = await ensurePatient();
  if (!patientId) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setFocus();
  const before = await counts(patientId);
  location.hash = `#/patient/${encodeURIComponent(patientId)}`;
  await waitFor(() => button("Note hors visite"), 60_000);
  await sleep(1500);
  await shot("1-dossier", { before });

  // 1. The record's own entry point.
  button("Note hors visite")!.click();
  await waitFor(() => document.getElementById("patient-off-visit-note"));
  await shot("2-note-vide");

  // 2. Dictation through the assistant, real microphone.
  document.querySelector<HTMLButtonElement>('[aria-label="Dicter la note avec l’assistant"]')!.click();
  // The assistant's own Dicter button, not the record's one that opened it.
  const dicter = () =>
    [...document.querySelectorAll<HTMLButtonElement>("button")].find(
      (element) => element.textContent?.trim().endsWith("Dicter") && !element.disabled && !element.getAttribute("aria-label")?.includes("avec l’assistant"),
    );
  await waitFor(() => document.querySelector("textarea.assistant-dictation-field") && dicter(), 120_000);
  const field = () => document.querySelector<HTMLTextAreaElement>("textarea.assistant-dictation-field");
  // Microphone path: the shell plays the recording while the app listens.
  // Transcript path (no microphone permission for this build): the same
  // whisper model transcribed the same recording; its text enters the field.
  const transcript = await readTextFile(`${signal}.transcript.txt`).catch(() => null);
  // Rubrics separated by "---" are dictated one after the other, as in the guided panel.
  const rubrics = transcript?.split(/\n?^-{3,}$\n?/m).map((part) => part.trim()) ?? [];
  if (transcript) {
    setTextarea(field()!, rubrics[0]);
    await sleep(500);
  } else {
    dicter()!.click();
    await waitFor(() => document.body.innerText.includes("Écoute en cours") || alertText(), 300_000);
    if (alertText()) throw new Error(`Dictée impossible : ${alertText()}`);
    await writeTextFile(signal, `play:${clip}`);
    await waitShell(`played:${clip}`);
    await sleep(300);
    (button("Arrêter") ?? button("Stop"))!.click();
    await waitFor(() => (field()?.value.trim() ? true : null) || alertText(), 600_000);
  }
  const dictated = field()?.value ?? "";
  await shot("3-dictee", { dictated, path: transcript ? "transcription whisper du clip" : "micro", error: alertText() });

  // 3. The assistant structures the note; the vet reviews it.
  for (let i = 1; i < 4; i++) {
    const next = button("Continuer vers");
    if (!next) break;
    next.click();
    await sleep(500);
    if (rubrics[i]) {
      setTextarea(field()!, rubrics[i]);
      await sleep(400);
    }
  }
  const generated = performance.now();
  button("Relire la note SOAP")!.click();
  await waitFor(() => document.body.innerText.includes("Relecture & Validation SOAP") || alertText(), 900_000);
  results.push({ name: "generation", seconds: +((performance.now() - generated) / 1000).toFixed(1), refusal: alertText(), verbatim: document.body.innerText.includes("Note reprise mot pour mot") });
  if (!document.body.innerText.includes("Relecture & Validation SOAP")) {
    button("Relire ma dictée comme note")?.click();
    await waitFor(() => document.body.innerText.includes("Relecture & Validation SOAP"), 60_000);
  }
  const unsaved = await counts(patientId);
  await shot("4-relecture", { notesBeforeValidation: unsaved.notes.length });

  // 4. Validation: the only moment anything is written.
  button("Valider et enregistrer la note")!.click();
  await waitFor(() => document.body.innerText.includes("validée le"), 60_000);
  const after = await counts(patientId);
  await shot("5-note-validee", { after });

  // 5. Found again in the record's chronology.
  button("Revenir au dossier")!.click();
  await sleep(500);
  document.getElementById("record-tab-timeline")?.click();
  await waitFor(() => button("Lire la note"), 30_000);
  document.getElementById("record-tab-content")?.scrollIntoView({ block: "start" });
  await shot("6-chronologie");

  // 6. Not a visit: Flux does not show it.
  location.hash = "#/flux";
  await waitFor(() => document.body.innerText.includes("Flux"), 30_000);
  await sleep(1500);
  await shot("7-flux", { fluxMentionsMax: document.querySelector("main")?.innerText.includes("Max") ?? null });

  // 7. Search: instant words, then meaning only (no word of the note).
  const { searchAllPatientsClinical } = await import("@/modules/consultations/local-ai/embedding-store");
  const sources = ["soap", "document", "protocol", "patient", "consultation", "product"] as const;
  const sections = ["subjective", "objective", "assessment", "plan", "document", "protocol", "patient", "consultation", "product"] as const;
  const noteId = after.notes.find((note) => note.tags.includes("offVisitNote"))?.id;
  for (const [name, query] of [["8-recherche-mot", "gastrite"], ["9-recherche-sens", "il rejette sa nourriture, estomac irrité"]] as const) {
    const found = await searchAllPatientsClinical({ sourceTypes: [...sources], sections: [...sections] }, query);
    location.hash = `#/patient/${encodeURIComponent(patientId)}`;
    await sleep(800);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
    const input = await waitFor(() => document.querySelector<HTMLInputElement>("[data-command-palette-input]"), 10_000);
    setInput(input, query);
    await sleep(20_000);
    await shot(name, {
      query,
      noteId,
      hit: found.find((row) => row.sourceId === noteId) ?? null,
      top: found.slice(0, 3).map((row) => ({ sourceId: row.sourceId, sourceType: row.sourceType, match: row.match, score: row.score })),
    });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.querySelector<HTMLElement>("[data-command-palette-input]")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await sleep(800);
  }
  results.push({ name: "index", final: await counts(patientId) });
  await save();
  await writeTextFile(signal, "restored");
}
