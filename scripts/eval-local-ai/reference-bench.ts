// Reference case bench (fictional "Max" otitis note of the 2026-10-25 field test):
// runs the assistant panel's own generation path, without appointment, with each
// generator, and keeps the full texts (fictional case) to explain each refusal.
import { modelScaffold, prepareSoapDraft } from "@/modules/consultations/local-ai/soap-pipeline";
import { evidenceTokens } from "@/modules/consultations/local-ai/dictation-scaffold";
import { assembleGuidedNote, guidedDictationTranscript } from "@/modules/consultations/local-ai/guided-soap";
import { EMPTY_SOAP } from "@/modules/consultations/local-ai/soap-schema";
import { SOAP_FULL_HEADINGS, layoutSoapNote, soapNoteText, stripSoapLayout } from "@/modules/consultations/local-ai/soap-layout";
import type { LocalModelStatus } from "@/modules/consultations/local-ai/models";
import type { LocalPatientContext } from "@/modules/consultations/local-ai/patient-context";
import type { LocalSoapNote } from "@/modules/consultations/local-ai/soap-schema";
import type { LocalAiProgress } from "@/modules/consultations/local-ai/worker-protocol";

const seconds = (from: number) => +((performance.now() - from) / 1000).toFixed(2);
const KEYS = ["subjective", "objective", "assessment", "plan"] as const;

export interface ReferenceCase {
  rubriques: LocalSoapNote;
  gabaritPlanTest: string;
}

/** Words removed from and added to a section (longest common subsequence). */
export function tokenDiff(source: string, output: string) {
  const a = evidenceTokens(source);
  const b = evidenceTokens(output);
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const removed: string[] = [];
  const added: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) removed.push(a[i++]);
    else added.push(b[j++]);
  }
  removed.push(...a.slice(i));
  added.push(...b.slice(j));
  // Same words in another order: a pure reordering removes and adds the same multiset.
  const sorted = (list: string[]) => [...list].sort().join(" ");
  return { removed, added, reorderedOnly: removed.length > 0 && sorted(removed) === sorted(added), identical: removed.length === 0 && added.length === 0 };
}

/**
 * The note as the vet validates it: skeleton laid by code (full headings in the
 * text, bullets, numbered plan) around the accepted content. Checks that the
 * canvas adds no word, keeps every dictated number, and writes every heading.
 */
export function assembledChecks(note: LocalSoapNote, answers: LocalSoapNote) {
  const laidOut = layoutSoapNote(note);
  const text = soapNoteText(laidOut);
  const sorted = (tokens: string[]) => [...tokens].sort().join(" ");
  const numbers = (value: string) => evidenceTokens(value).filter((token) => /^[+-]?\d/.test(token));
  const dictated = KEYS.map((key) => answers[key]).join(" ");
  const textNumbers = numbers(text);
  return {
    text,
    headings: KEYS.filter((key) => note[key].trim()).every((key) => text.includes(SOAP_FULL_HEADINGS[key])),
    // Canvas only: each section's words are those of the accepted content, in the same order.
    canvasOnly: KEYS.every((key) => evidenceTokens(stripSoapLayout(key, laidOut[key])).join(" ") === evidenceTokens(note[key]).join(" ")),
    // Same words as the dictation, whatever the rubric they were routed to.
    sameWordsAsDictation: sorted(evidenceTokens(KEYS.map((key) => note[key]).join(" "))) === sorted(evidenceTokens(dictated)),
    numbersKept: numbers(dictated).every((value) => textNumbers.includes(value)),
    lists: KEYS.filter((key) => laidOut[key]).every((key) => laidOut[key].split("\n").every((line, index) => (key === "plan" ? line.startsWith(`${index + 1}. `) : line.startsWith("- ")))),
  };
}

// Context the panel builds when it is opened without an appointment.
const contextWithoutVisit = (): LocalPatientContext => ({
  patient: { id: "max", nom: "Max", espece: "Chien", race: null, sexe: "M", naissance: null, statut: "sante", allergies: "", affectionsChroniques: "", notes: "", poids: null },
  consultation: { motif: "Consultation", date: new Date().toISOString() },
  dernieresConsultations: [],
});

export async function runReference(
  models: LocalModelStatus,
  item: ReferenceCase,
  options: { generators: string[]; variants: string[]; cases: string[] },
  log: (line: string) => void,
) {
  const rows: unknown[] = [];
  const cases: Record<string, LocalSoapNote> = {
    reference: item.rubriques,
    gabarit: { ...item.rubriques, plan: item.gabaritPlanTest },
  };
  for (const generator of options.generators)
    for (const caseName of options.cases)
      for (const variant of options.variants) {
        // The generator preference is read from the page address in development builds.
        const url = new URL(location.href);
        url.searchParams.set("generator", generator);
        history.replaceState(null, "", url);
        const answers = cases[caseName];
        // "panneau": what the panel sent on the test day (one text, rubric titles inline);
        // "guidee": the rubric answers as the panel now passes them.
        const transcript = guidedDictationTranscript(answers);
        const guidedSource = variant === "panneau" ? undefined : answers;
        const scaffold = modelScaffold(transcript, guidedSource);
        const outputs: { number: 1 | 2; seconds: number; generator?: string; text: string }[] = [];
        const started = performance.now();
        let stage = "";
        const onProgress = (event: LocalAiProgress) => {
          if (event.stage && event.stage !== stage) stage = event.stage;
        };
        let note: LocalSoapNote | null = null;
        let error: string | null = null;
        try {
          // "dictee": the way out after a refusal, no model (the panel's own assembly).
          note = variant === "dictee" ? assembleGuidedNote(EMPTY_SOAP, answers) : await prepareSoapDraft({
            models,
            transcript,
            context: contextWithoutVisit(),
            guidedSource,
            signal: new AbortController().signal,
            onProgress,
            onAttempt: (attempt) => outputs.push({ ...attempt, seconds: seconds(started) }),
          });
        } catch (failure) {
          error = failure instanceof Error ? failure.message : String(failure);
        }
        const diffs = outputs.map((output) => {
          let parsed: Record<string, string> | null = null;
          try {
            parsed = JSON.parse(output.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
          } catch {
            /* Format refusal: no section to compare. */
          }
          return {
            attempt: output.number,
            generator: output.generator,
            seconds: output.seconds,
            sections: parsed
              ? Object.fromEntries(KEYS.map((key) => [key, tokenDiff(scaffold[key], String(parsed![key] ?? ""))]))
              : null,
          };
        });
        const assembled = note ? assembledChecks(note, answers) : null;
        rows.push({ generator, case: caseName, variant, accepted: Boolean(note), error, totalSeconds: seconds(started), transcript, scaffold, outputs, diffs, note, assembled });
        log(`référence ${caseName} · ${variant} · ${generator} : ${note ? "acceptée" : `refusée (${error})`}, ${outputs.length} essai(s), ${seconds(started)} s`);
      }
  return rows;
}
