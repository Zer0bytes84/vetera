/*
 * A question is answered only when it is understood in full (19 November 2026, the agent harness's rule of abstention).
 *
 * Until then the tab looked for a subject and a period in the question and ignored the rest, so « combien de chats »
 * counted every patient, « recettes en espèces » every payment method and « rendez-vous demain soir » the whole day:
 * true figures, answering another question, with nothing on screen to say so. Now every word must be accounted for:
 * a period the catalogue reads, a subject or one of the filters it applies, a patient's name from the base, or a word
 * that carries no meaning of its own (articles, « combien », « svp »). One word left over and the question is refused,
 * with that word named, so the vet can rephrase. A refusal is a safe failure; an answer to another question is not.
 */

import { normalize } from "./language";

/** Phrases read as a whole, removed before the words are counted. Periods first: they are what parsePeriod reads. */
const MONTHS =
  "janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre";
export const PERIOD_PHRASES: RegExp[] = [
  /\bavant hier\b/g,
  /\bapres demain\b/g,
  /\baujourd hui\b/g,
  /\bce jour\b/g,
  /\bdu jour\b/g,
  /\bhier\b/g,
  /\bdemain\b/g,
  /\bsemaine (?:derniere|passee|precedente|prochaine)\b/g,
  /\b(?:cette|la) semaine\b/g,
  new RegExp(`\\b(?:${MONTHS})(?: 20\\d{2})?\\b`, "g"),
  /\bmois (?:dernier|passe|precedent|prochain)\b/g,
  /\b(?:ce|du) mois\b/g,
  /\b(?:annee|an) (?:derniere|dernier|passee|passe|precedente)\b/g,
  /\bcette annee\b/g,
  /\bcet an\b/g,
  /\b\d{1,4} (?:derniers|dernieres) (?:jours|semaines|mois)\b/g,
  /\bdepuis \d{1,4} (?:jours|semaines|mois)\b/g,
  /\b\d{1,4} (?:prochains|prochaines) (?:jours|semaines)\b/g,
  /\b(?:en|de|annee) 20\d{2}\b/g,
];
const SUBJECT_PHRASES: RegExp[] = [
  /\brendez vous\b/g,
  /\bchiffre d affaires\b/g,
  /\bce qu on a\b/g,
  /\ba t on\b/g,
  /\bj ai\b/g,
  /\bai je\b/g,
  /\bce patient\b/g,
  /\bcet animal\b/g,
  /\bce dossier\b/g,
  /\bce chien\b/g,
  /\bce chat\b/g,
  /\bcette chienne\b/g,
  /\bcette chatte\b/g,
  /\bs il te plait\b/g,
  /\bs il vous plait\b/g,
];

/** The subjects and the filters the engine applies (answer.ts): a word here changes what is read or how it is counted. */
const SUBJECT_WORDS = new Set([
  // cash
  "recette",
  "recettes",
  "encaisse",
  "encaisses",
  "encaissement",
  "encaissements",
  "revenu",
  "revenus",
  "tresorerie",
  "caisse",
  "depense",
  "depenses",
  "charge",
  "charges",
  "solde",
  "rentrees",
  "gagne",
  // appointments, with the statuses an answer counts
  "rdv",
  "consultation",
  "consultations",
  "agenda",
  "planning",
  "visite",
  "visites",
  "absence",
  "absences",
  "absent",
  "absents",
  "absente",
  "absentes",
  "annule",
  "annules",
  "annulee",
  "annulees",
  "termine",
  "termines",
  // tasks
  "tache",
  "taches",
  "todo",
  "retard",
  "depasse",
  "depasses",
  "depassee",
  "depassees",
  "ouvertes",
  // patients: records are counted; a species is not a filter the engine applies, so « chats » is not here
  "patient",
  "patients",
  "dossier",
  "dossiers",
  "nouveau",
  "nouveaux",
  "nouvelle",
  "nouvelles",
  "ouverts",
  "inscrits",
  "actifs",
]);

/** Words without meaning of their own in a question about the practice's data. */
const NEUTRAL_WORDS = new Set([
  "combien",
  "nombre",
  "total",
  "liste",
  "quel",
  "quels",
  "quelle",
  "quelles",
  "est",
  "sont",
  "c",
  "ce",
  "cette",
  "ces",
  "cet",
  "le",
  "la",
  "les",
  "l",
  "un",
  "une",
  "de",
  "des",
  "du",
  "d",
  "a",
  "au",
  "aux",
  "en",
  "pour",
  "et",
  "sur",
  "y",
  "on",
  "nous",
  "avons",
  "ai",
  "il",
  "qu",
  "que",
  "qui",
  "mes",
  "nos",
  "notre",
  "mon",
  "ma",
  "moi",
  "donne",
  "donnez",
  "montre",
  "montrez",
  "affiche",
  "voir",
  "voit",
  "dis",
  "svp",
  "stp",
  "please",
  "merci",
  "s",
  "vite",
  "bonjour",
  "salut",
  "eu",
  "avoir",
  "fait",
  "j",
  "t",
  "me",
  "m",
]);

/**
 * Words a filter applies to one subject only: « en retard » is a filter of the tasks, ignored by the appointments' answer.
 * A filter word asked of another subject is a word not understood.
 */
export const SUBJECT_ONLY: Record<
  "cash" | "appointments" | "tasks" | "patients",
  Set<string>
> = {
  cash: new Set([
    "recette",
    "recettes",
    "encaisse",
    "encaisses",
    "encaissement",
    "encaissements",
    "revenu",
    "revenus",
    "tresorerie",
    "caisse",
    "depense",
    "depenses",
    "charge",
    "charges",
    "solde",
    "rentrees",
    "gagne",
  ]),
  appointments: new Set([
    "absence",
    "absences",
    "absent",
    "absents",
    "absente",
    "absentes",
    "annule",
    "annules",
    "annulee",
    "annulees",
    "termine",
    "termines",
  ]),
  tasks: new Set([
    "retard",
    "depasse",
    "depasses",
    "depassee",
    "depassees",
    "ouvertes",
  ]),
  patients: new Set([
    "nouveau",
    "nouveaux",
    "nouvelle",
    "nouvelles",
    "ouverts",
    "inscrits",
    "actifs",
  ]),
};

/** Every word the periods are written with, and the parts of a day: a patient called « Jour » or « Midi » collides. */
const PERIOD_WORDS = new Set(
  `avant hier apres demain aujourd hui jour semaine derniere passee precedente prochaine cette mois dernier passe precedent prochain annee an cet derniers dernieres jours semaines depuis prochains prochaines ${MONTHS.replace(/\|/g, " ")} matin soir midi nuit aprem matinee`.split(
    " "
  )
);

export type Understanding =
  | { ok: true }
  | { ok: false; reason: "words"; words: string[] }
  | { ok: false; reason: "periods"; count: number }
  | { ok: false; reason: "name"; name: string };

/**
 * Is every word of the (normalized) question accounted for? `names` are the patients' names the question matched, in
 * their normalized form. A name that is also a word of the vocabulary (a patient called « Hier », « Mars », « Midi »)
 * cannot be told apart from that word: the question is refused and the vet asked to say « le patient … ».
 */
export function understood(
  text: string,
  names: string[],
  topic?: keyof typeof SUBJECT_ONLY
): Understanding {
  let rest = ` ${text} `;
  let periods = 0;
  for (const name of names) {
    const plain = normalize(name);
    if (
      plain
        .split(" ")
        .some(
          (word) =>
            PERIOD_WORDS.has(word) ||
            SUBJECT_WORDS.has(word) ||
            NEUTRAL_WORDS.has(word)
        )
    ) {
      return { ok: false, reason: "name", name };
    }
  }
  for (const pattern of PERIOD_PHRASES) {
    rest = rest.replace(pattern, () => {
      periods += 1;
      return " ";
    });
  }
  if (periods > 1) {
    return { ok: false, reason: "periods", count: periods };
  }
  for (const name of [...names].sort((a, b) => b.length - a.length)) {
    rest = rest.replace(
      new RegExp(
        `\\b${normalize(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "g"
      ),
      " "
    );
  }
  for (const pattern of SUBJECT_PHRASES) {
    rest = rest.replace(pattern, " ");
  }
  // « en retard » is read here as « retard »: a tasks filter, not a word of the appointments' answer.
  rest = rest.replace(/\ben retard\b/g, " retard ");
  const foreign = (word: string) =>
    topic !== undefined &&
    Object.entries(SUBJECT_ONLY).some(
      ([subject, words]) => subject !== topic && words.has(word)
    );
  const left = rest
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (word) =>
        foreign(word) || (!SUBJECT_WORDS.has(word) && !NEUTRAL_WORDS.has(word))
    );
  return left.length
    ? { ok: false, reason: "words", words: [...new Set(left)] }
    : { ok: true };
}
