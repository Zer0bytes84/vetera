import { routeGuidedTreatments } from "./treatment-routing";
import {
  localSoapSchema,
  SOAP_SECTIONS,
  type LocalSoapNote,
} from "./soap-schema";

/** Human-selected sections, with explicit treatment needs routed verbatim to P. */
export function assembleGuidedNote(
  existing: LocalSoapNote,
  answers: LocalSoapNote,
  humanAnswers: LocalSoapNote = answers,
): LocalSoapNote {
  const routed = routeGuidedTreatments(answers);
  return localSoapSchema.parse(
    Object.fromEntries(
      SOAP_SECTIONS.map(({ key }) => [
        key,
        humanAnswers[key].trim() || routed[key].trim()
          ? routed[key].trim()
          : existing[key].trim(),
      ]),
    ),
  );
}

/** Rubric titles of the assistant's guided dictation, in S, O, A, P order. */
export const GUIDED_RUBRIC_TITLES = [
  "Motif et antécédents",
  "Examen clinique",
  "Évaluation",
  "Plan de soins",
] as const;

/** The guided dictation as one text: one "Title : answer" line per answered rubric. */
export function guidedDictationTranscript(answers: LocalSoapNote): string {
  return SOAP_SECTIONS.map(({ key }, index) =>
    answers[key].trim()
      ? `${GUIDED_RUBRIC_TITLES[index]} : ${answers[key].trim()}`
      : ""
  )
    .filter(Boolean)
    .join("\n");
}

/** Trace of human input only; headings keep the selected section explicit. */
export function guidedTranscript(answers: LocalSoapNote): string {
  return SOAP_SECTIONS.filter(({ key }) => answers[key].trim())
    .map(({ key, title }) => `${title}\n${answers[key].trim()}`)
    .join("\n\n");
}
