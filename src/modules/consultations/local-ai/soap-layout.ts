import { SOAP_SECTIONS, type LocalSoapNote } from "./soap-schema";

/**
 * Layout of a SOAP note: full section headings, one bullet per observation and
 * a numbered plan. This is a canvas around the dictated words, never clinical
 * content: the fidelity check removes it before comparing.
 */
export const SOAP_FULL_HEADINGS: Record<keyof LocalSoapNote, string> = {
  subjective: "S — Subjectif (Ce que le propriétaire rapporte)",
  objective: "O — Objectif (Ce que le vétérinaire observe et mesure)",
  assessment: "A — Évaluation (Diagnostic / Analyse)",
  plan: "P — Plan (Actions et suivi)",
};

// A list marker at the start of a line: "-", "•", "–", "*" or "1." / "1)".
const LIST_MARKER = /^[ \t]*(?:[-•–*]|\d{1,2}[.)])[ \t]+/u;

// One item per line, then per sentence: a sentence ends on . ! ? followed by
// a space (decimals such as 38.5 stay whole). Existing markers are dropped first.
const items = (text: string) =>
  text
    .split("\n")
    .flatMap((line) => line.replace(LIST_MARKER, "").split(/(?<=[.!?])\s+/u))
    .map((item) => item.trim())
    .filter(Boolean);

/** One bullet per sentence; the plan is numbered. Words are left untouched. */
export function layoutSection(key: keyof LocalSoapNote, text: string) {
  return items(text)
    .map((item, index) => (key === "plan" ? `${index + 1}. ${item}` : `- ${item}`))
    .join("\n");
}

export function layoutSoapNote(note: LocalSoapNote): LocalSoapNote {
  return Object.fromEntries(
    SOAP_SECTIONS.map(({ key }) => [key, layoutSection(key, note[key])])
  ) as LocalSoapNote;
}

/** The whole note as one text, with the full headings written in it. */
export function soapNoteText(note: LocalSoapNote) {
  return SOAP_SECTIONS.filter(({ key }) => note[key].trim())
    .map(({ key }) => `${SOAP_FULL_HEADINGS[key]}\n${note[key].trim()}`)
    .join("\n\n");
}

const comparable = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("fr-FR").replace(/[^\p{L}]+/gu, " ").trim();

/** The section without its own heading on the first line (full or short title). */
export function dropSoapHeading(key: keyof LocalSoapNote, text: string) {
  const lines = text.trim().split("\n");
  const short = SOAP_SECTIONS.find((section) => section.key === key)!.title;
  const headings = [SOAP_FULL_HEADINGS[key], short].map(comparable);
  if (headings.includes(comparable(lines[0] ?? ""))) lines.shift();
  return lines.join("\n").trim();
}

/**
 * Removes the canvas before the fidelity check: a first line that is this
 * section's heading, and list markers at line starts. Only the canvas goes;
 * any dictated word, number or sign stays compared.
 */
export function stripSoapLayout(key: keyof LocalSoapNote, text: string) {
  return dropSoapHeading(key, text)
    .split("\n")
    .map((line) => line.replace(LIST_MARKER, ""))
    .join("\n");
}

/** Each section laid out under its own full heading: the canvas shown to the model. */
export function headedLayout(note: LocalSoapNote): LocalSoapNote {
  const laidOut = layoutSoapNote(note);
  return Object.fromEntries(
    SOAP_SECTIONS.map(({ key }) => [
      key,
      laidOut[key] ? `${SOAP_FULL_HEADINGS[key]}\n${laidOut[key]}` : "",
    ])
  ) as LocalSoapNote;
}
