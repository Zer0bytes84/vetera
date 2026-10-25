// Reference case bench (fictional "Max" otitis note of the 2026-10-25 field test):
// runs the assistant panel's own generation path, without appointment, with each
// generator, and keeps the full texts (fictional case) to explain each refusal.
import { modelScaffold, prepareSoapDraft } from "@/modules/consultations/local-ai/soap-pipeline";
import { evidenceTokens } from "@/modules/consultations/local-ai/dictation-scaffold";
import { guidedDictationTranscript } from "@/modules/consultations/local-ai/guided-soap";
import { SOAP_FULL_HEADINGS } from "@/modules/consultations/local-ai/soap-layout";
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

/** Per non-empty section: full heading on the first line, every other line a bullet (plan: numbered 1, 2, 3…). */
export function modelLayout(note: Record<string, string>) {
  return Object.fromEntries(
    KEYS.filter((key) => String(note[key] ?? "").trim()).map((key) => {
      const lines = String(note[key]).trim().split("\n").map((line) => line.trim()).filter(Boolean);
      const heading = lines[0]?.replace(/\s*:$/u, "") === SOAP_FULL_HEADINGS[key];
      const body = lines.slice(1);
      const listed =
        body.length > 0 &&
        body.every((line, index) => (key === "plan" ? line.startsWith(`${index + 1}. `) : line.startsWith("- ")));
      return [key, { heading, listed, lines: body.length }];
    })
  );
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
        const guidedSource = variant.startsWith("guidee") ? answers : undefined;
        const layout = variant === "guidee-forme";
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
          note = await prepareSoapDraft({
            models,
            transcript,
            context: contextWithoutVisit(),
            guidedSource,
            signal: new AbortController().signal,
            onProgress,
            onAttempt: (attempt) => outputs.push({ ...attempt, seconds: seconds(started) }),
            layout,
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
            // Layout written by the model itself, before any code touches it.
            layout: parsed ? modelLayout(parsed) : null,
            sections: parsed
              ? Object.fromEntries(KEYS.map((key) => [key, tokenDiff(scaffold[key], String(parsed![key] ?? ""))]))
              : null,
          };
        });
        rows.push({ generator, case: caseName, variant, accepted: Boolean(note), error, totalSeconds: seconds(started), transcript, scaffold, outputs, diffs, note });
        log(`référence ${caseName} · ${variant} · ${generator} : ${note ? "acceptée" : `refusée (${error})`}, ${outputs.length} essai(s), ${seconds(started)} s`);
      }
  return rows;
}
