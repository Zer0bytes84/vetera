import type { Patient } from "@/types/db";

export const normalizePatientName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fr")
    .trim()
    .replace(/\s+/g, " ");
export interface PatientMention {
  start: number;
  end: number;
  name: string;
  key: string;
}
const mentionPattern = () =>
  /(^|[^\p{L}\p{N}_@])@(?:"([^"\n]+)"|([\p{L}\p{N}_][\p{L}\p{N}_'’-]*))/gu;
export function parsePatientMentions(text: string): PatientMention[] {
  return [...text.matchAll(mentionPattern())].map((match) => ({
    start: match.index! + match[1].length,
    end: match.index! + match[0].length,
    name: match[2] ?? match[3],
    key: normalizePatientName(match[2] ?? match[3]),
  }));
}
export function resolvePatientMentions(
  text: string,
  patients: Patient[],
  choices: Record<string, string> = {}
) {
  return parsePatientMentions(text).map((mention) => {
    const candidates = patients.filter(
      (patient) => normalizePatientName(patient.name) === mention.key
    );
    const chosen = candidates.find(
      (patient) => patient.id === choices[mention.key]
    );
    return {
      ...mention,
      candidates,
      patient: chosen ?? (candidates.length === 1 ? candidates[0] : null),
    };
  });
}
export function assertMentionsForPatient(
  text: string,
  patients: Patient[],
  patientId: string,
  choices: Record<string, string> = {}
) {
  const mentions = resolvePatientMentions(text, patients, choices);
  for (const mention of mentions) {
    if (!mention.candidates.length)
      throw new Error(
        `Le patient @${mention.name} est introuvable. Corrigez sa mention avant de générer la note.`
      );
    if (!mention.patient)
      throw new Error(
        `Plusieurs patients portent le nom ${mention.name}. Choisissez la fiche exacte.`
      );
    if (mention.patient.id !== patientId)
      throw new Error(
        `@${mention.name} désigne un autre patient. Ouvrez sa consultation pour dicter sa note ; cette note reste liée au patient de la fiche actuelle.`
      );
  }
  return mentions;
}
export function autocompleteMention(text: string, caret: number) {
  const match = /(?:^|\s)@([\p{L}\p{N}_'’-]*)$/u.exec(text.slice(0, caret));
  return match
    ? { start: caret - match[1].length - 1, end: caret, query: match[1] }
    : null;
}
export function insertPatientMention(
  text: string,
  range: { start: number; end: number },
  name: string
) {
  const token = /^[\p{L}\p{N}_'’-]+$/u.test(name)
    ? `@${name}`
    : `@"${name.replaceAll('"', "")}"`;
  const value = `${text.slice(0, range.start)}${token} ${text.slice(range.end)}`;
  return { value, caret: range.start + token.length + 1 };
}
export function normalizeSpokenMentions(text: string) {
  // Whisper can spell the spoken word "arobase" without its final e.
  return text.replace(/\barobas(?:e)?\s+([\p{L}\p{N}_'’-]+)/giu, "@$1");
}
