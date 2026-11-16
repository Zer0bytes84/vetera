/*
 * How a question is read: plain words, no model.
 *
 * Three guards run before any subject is looked for, in this order, and each refuses in words:
 *  1. dose: a question about a dose, a posology or a quantity of a drug is never answered here, and nothing is read for it;
 *  2. reminders: vaccine and medical reminders live in the reminders store, which this tab does not read, so an answer
 *     built from the vaccination booklets alone would be an incomplete list given as a complete one;
 *  3. write: a question never changes a record. A record changes only through a card the vet validates.
 */

import type { RefusalReason } from "./types";

export const MAX_QUESTION_LENGTH = 300;

/** Lower case, no accents, words separated by single spaces. « 5mg » stays one word, « mg/kg » keeps its slash. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, " ")
    .trim();
}

export const has = (text: string, pattern: RegExp) => pattern.test(text);

/* ── Dose ─────────────────────────────────────────────────────────────── */

const DOSE_WORDS =
  /\b(dose|doses|doser|dosage|dosages|posologie|posologies|surdosage|sous dosage|mcg|mg|ml|cc|ui|comprime|comprimes|cp|gouttes|goutte|gelule|gelules|ampoule|ampoules|injecter|injection|perfusion|debit|administrer|administre|prescrire|prescris|traiter avec|combien de (?:mg|ml|cp|comprimes)|mg\/kg|ml\/kg|ui\/kg)\b/;
/** A number glued to a unit (« 5mg », « 0,2ml »), which the word list above cannot see once the text is normalized. */
const DOSE_AMOUNT = /\d\s?(?:mg|mcg|ug|ml|cc|ui|g|kg|cp)\b|\b(?:par|\/)\s?(?:kg|kilo)\b/;

export const isDoseQuestion = (raw: string, normalized: string) =>
  has(normalized, DOSE_WORDS) || has(normalized, DOSE_AMOUNT) || /[µμ]g/i.test(raw);

/* ── Reminders ────────────────────────────────────────────────────────── */

const REMINDER_WORDS =
  /\b(vaccin|vaccins|vaccination|vaccinations|vaccinal|vaccinale|vaccinaux|rappel|rappels|relance|relances|vermifuge|vermifuges|vermifuger|antiparasitaire|antiparasitaires|rage|booster)\b/;

export const isReminderQuestion = (normalized: string) => has(normalized, REMINDER_WORDS);

/* ── Write ────────────────────────────────────────────────────────────── */

// Verbs that change records. « annul… » is a write only as a verb: « rendez-vous annulés » is a question about data.
const WRITE_VERBS =
  /\b(supprim\w*|effac\w*|modifi\w*|corrig\w*|cree|crees|creer|creez|ajout\w*|enregistr\w*|envoi\w*|envoy\w*|factur(?:er|ez)|rembours\w*|archiv\w*|planifi\w*|deplac\w*|marqu\w*|valid(?:e|er|ez)|mets|mettre|change|changer|changez|renomm\w*|fusionn\w*|importe|importer|importez)\b/;
const CANCEL_VERB = /\bannul\w*/;
const CANCELLED_NOUN = /\b(rendez vous|rdv|consultations?|visites?|soins?|operations?|hospitalisations?)s? annul\w*/;
const POLITE = /\b(peux tu|peut on|pouvez vous|veuillez|merci de|s il te plait|s il vous plait|il faut|je veux|je voudrais|tu peux|vous pouvez)\b/;

// SQL is not a question. It is never run here, but it is not answered as if it were one either.
const SQL = /\b(drop table|drop database|truncate|alter table|insert into|delete from|update \w+ set|select .+ from|union select|exec )\b/;

export function isWriteRequest(normalized: string): boolean {
  if (has(normalized, WRITE_VERBS) || has(normalized, SQL)) return true;
  if (!has(normalized, CANCEL_VERB)) return false;
  // « annule le rendez-vous de Rex » asks for a change; « rendez-vous annulés ce mois » asks to read.
  const reading = has(normalized, CANCELLED_NOUN) && !has(normalized, POLITE) && !/^annul/.test(normalized);
  return !reading;
}

/** The guard that applies to a question, in the order above, or null. */
export function guardReason(raw: string, normalized: string): Extract<RefusalReason, "dose" | "reminders" | "write"> | null {
  if (isDoseQuestion(raw, normalized)) return "dose";
  if (isReminderQuestion(normalized)) return "reminders";
  if (isWriteRequest(normalized)) return "write";
  return null;
}

/* ── Periods the catalogue does not read ──────────────────────────────── */

const MONTH_NAMES = "janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre";
// A day of a month, a range between two days, a weekday, a quarter: none of these is read, and reading a part of them
// (« du 1er au 15 novembre » as the whole month) would answer a different question than the one asked.
const UNSUPPORTED_PERIOD = new RegExp(
  [
    `\\b(?:\\d{1,2}|1er|premier) (?:${MONTH_NAMES})\\b`,
    "\\bentre (?:le|les|\\d)",
    "\\bdu \\d{1,2}(?:er)?(?: \\w+)? au \\d{1,2}",
    "\\b(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\\b",
    "\\b(?:trimestre|semestre|quinzaine|depuis le debut|depuis toujours|depuis le \\d)\\b",
  ].join("|"),
);

export const hasUnsupportedPeriod = (normalized: string) => UNSUPPORTED_PERIOD.test(normalized);
