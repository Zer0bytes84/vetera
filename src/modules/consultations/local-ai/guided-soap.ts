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

/** Trace of human input only; headings keep the selected section explicit. */
export function guidedTranscript(answers: LocalSoapNote): string {
  return SOAP_SECTIONS.filter(({ key }) => answers[key].trim())
    .map(({ key, title }) => `${title}\n${answers[key].trim()}`)
    .join("\n\n");
}
