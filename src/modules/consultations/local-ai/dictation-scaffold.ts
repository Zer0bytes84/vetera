import { EMPTY_SOAP, containsDosage, type LocalSoapNote } from "./soap-schema";
import { parsePatientMentions } from "./patient-mentions";

// Only explicit section labels and stated care intentions are recognized here.
// Unlabelled observations stay in S for the veterinarian to classify at review.
// No diagnosis, finding or prescription is inferred from the patient history.
const marker =
  /(?<![\p{L}\p{N}])(?:(subjectif|motif|antécédents|objectif|examen(?:\s+clinique)?|évaluations?|analyses?|diagnostics?|plan(?:\s+de\s+soins)?)\s*[:,-]|(à\s+l[’']examen)\s*[:,]?|((?:^\s*(?:ne\s+pas\s+)?(?:prévoir|prévu|contrôle)|(?:ne\s+)?nécessite|besoin(?=\s+(?:de|d[’']))))(?![\p{L}\p{N}]))/giu;
const sectionFor = (label: string): keyof LocalSoapNote => {
  label = label.trim().replace(/^ne\s+(?:pas\s+)?/iu, "");
  if (/^(?:objectif|examen|à)/iu.test(label)) return "objective";
  if (/^(?:évaluation|analyse|diagnostic)/iu.test(label)) return "assessment";
  if (/^(?:plan|prévoir|prévu|contrôle|nécessite|besoin)/iu.test(label))
    return "plan";
  return "subjective";
};
// « Le patient a », « la patiente est » : un fragment sujet + auxiliaire sans
// observation propre rejoint le segment de plan au lieu de rester seul en S.
const isSubjectFragment = (text: string) =>
  /^(?:le|la|l[’'])\s+(?:patient(?:e)?|animal|chat(?:te)?|chien(?:ne)?)\s+(?:a|ont|est|sont|présente|présentent)\s*$/iu.test(
    text.trim()
  );

export function buildDictationScaffold(transcript: string): LocalSoapNote {
  // Mentions have already been checked against the open patient by the caller.
  // Removing their syntax keeps identity metadata out of the clinical prose.
  let text = transcript;
  // Use the exact same parser as patient resolution; email addresses are not
  // mentions, and apostrophes or quoted compound names must be removed whole.
  for (const mention of parsePatientMentions(transcript).reverse()) {
    const prefix = /\b(?:pour|patient)\s+$/iu.exec(
      text.slice(0, mention.start)
    );
    const start = prefix?.index ?? mention.start;
    text =
      text.slice(0, start) +
      text.slice(mention.end).replace(/^\s*[,;:]?\s*/u, "");
  }
  const result = { ...EMPTY_SOAP };
  let current: keyof LocalSoapNote = "subjective";
  const append = (part: string) => {
    const value = part.trim().replace(/^[,;:]\s*/, "");
    if (!value) return;
    // Les posologies n'interrompent plus la dictée : le segment est écarté de
    // la trame (le vétérinaire le saisit dans l'ordonnance) et signalé dans
    // l'interface. La sortie du modèle reste vérifiée séparément.
    if (containsDosage(value)) return;
    result[current] = [result[current], value].filter(Boolean).join(" ");
  };
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/u)) {
    let offset = 0;
    // A new RegExp per sentence avoids state shared across concurrent calls.
    for (const match of sentence.matchAll(new RegExp(marker))) {
      const before = sentence.slice(offset, match.index);
      const section = sectionFor(match[1] ?? match[2] ?? match[3]);
      if (match[3] && section === "plan" && isSubjectFragment(before)) {
        // « Le patient a besoin de… » reste entier : le fragment de sujet
        // rejoint le segment de plan au lieu de rester seul en S.
        current = section;
      } else {
        append(before);
        current = section;
        // Keep action verbs: they distinguish a plan from a completed finding.
        offset = match[3] ? match.index : match.index + match[0].length;
      }
    }
    append(sentence.slice(offset));
  }
  return result;
}

// Retire les phrases contenant une posologie avant l'envoi au modèle local.
// La dictée d'origine reste affichée et enregistrée telle quelle ; seul le
// texte transmis à l'assistant est assaini. Les phrases retirées sont
// renvoyées pour être replacées telles quelles dans le plan par du code
// déterministe. La sortie du modèle reste vérifiée par parseGeneratedSoap :
// aucune posologie ne peut en sortir.
export function removeDosageSentences(transcript: string): {
  text: string;
  dosageDetected: boolean;
  dosageSentences: string[];
} {
  const kept: string[] = [];
  const dosageSentences: string[] = [];
  for (const sentence of transcript.split(/(?<=[.!?])\s+|\n+/u)) {
    if (!sentence.trim()) continue;
    if (containsDosage(sentence)) {
      dosageSentences.push(sentence.trim());
      continue;
    }
    kept.push(sentence.trim());
  }
  return {
    text: kept.join(" "),
    dosageDetected: dosageSentences.length > 0,
    dosageSentences,
  };
}

// Replace les phrases de posologie dictées par le vétérinaire dans le plan,
// mot pour mot, sans passer par le modèle. Le modèle ne voit ni ne produit
// jamais de posologie ; la vérification stricte de sa sortie est inchangée.
export function mergeDosageIntoPlan(
  note: LocalSoapNote,
  dosageSentences: string[]
): LocalSoapNote {
  if (!dosageSentences.length) return note;
  return {
    ...note,
    plan: [note.plan, ...dosageSentences].filter(Boolean).join("\n\n"),
  };
}

const evidence = (text: string) =>
  (
    text
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLocaleLowerCase("fr-FR")
      .replaceAll("−", "-")
      .match(/[+-]?\d+(?:[.,]\d+)?|\p{L}+|[<>≤≥=%/]/gu) ?? []
  )
    .map((token) => token.replace(/(\d),(?=\d)/gu, "$1."))
    .join(" ");

export class SoapFidelityError extends Error {
  constructor() {
    super(
      "La réponse de l’assistant ne reprend pas fidèlement les observations dictées. Votre dictée est conservée ; aucune note n’a été enregistrée."
    );
    this.name = "SoapFidelityError";
  }
}

export function assertFaithfulSoap(note: LocalSoapNote, source: LocalSoapNote) {
  // This phase is extractive. Only capitalization, accents, whitespace and
  // prose punctuation may change; numbers, signs, omissions, additions and
  // moved facts are refused. Decimal commas and points are equivalent.
  for (const key of Object.keys(source) as (keyof LocalSoapNote)[]) {
    if (evidence(note[key]) !== evidence(source[key]))
      throw new SoapFidelityError();
  }
}
