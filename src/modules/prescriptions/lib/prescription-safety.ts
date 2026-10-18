/**
 * Contrôle de sécurité des ordonnances : moteur pur, sans accès aux données.
 *
 * Compare chaque médicament de l'ordonnance en cours :
 * - aux autres médicaments de la même ordonnance et aux traitements encore
 *   actifs du patient → « interaction médicamenteuse » ;
 * - aux allergies et affections chroniques du dossier → « contre-indication ».
 *
 * Les alertes sont informatives : elles ne bloquent jamais la validation.
 * Les règles vivent dans `prescription-safety-rules.ts`.
 */

import type { Prescription, PrescriptionItem } from "@/types/db";

import {
  CONTRAINDICATION_RULES,
  type ContraindicationRule,
  INTERACTION_RULES,
  type InteractionRule,
  SAFETY_GROUPS,
  type SafetyGroupId,
} from "./prescription-safety-rules";

export type SafetyAlertLevel = "interaction" | "contraindication";

export interface SafetyMedication {
  /** Autres noms du même produit (DCI, nom commercial). */
  aliases?: string[];
  className?: string;
  /** Identifiant stable : id de la ligne d'ordonnance. */
  key: string;
  name: string;
  /** Date de l'ordonnance d'origine, pour un traitement en cours. */
  prescribedOn?: string;
}

export interface SafetyPatient {
  allergies?: string | null;
  chronicConditions?: string | null;
}

export interface SafetyAlert {
  id: string;
  level: SafetyAlertLevel;
  /** Ligne de l'ordonnance en cours concernée. */
  medicationKey: string;
  medicationName: string;
  /** Pour une interaction : l'autre médicament. */
  other?: {
    key: string;
    name: string;
    /** "ordonnance" = même ordonnance ; "traitement" = traitement en cours. */
    origin: "ordonnance" | "traitement";
    prescribedOn?: string;
  };
  reason: string;
  ruleId: string;
  /** Pour une contre-indication : la mention du dossier en cause. */
  patientFinding?: {
    field: "allergies" | "conditions";
    text: string;
  };
}

export interface SafetyCheckInput {
  /** Traitements encore actifs (autres ordonnances du patient). */
  active?: SafetyMedication[];
  /** Médicaments de l'ordonnance en cours de rédaction. */
  draft: SafetyMedication[];
  patient?: SafetyPatient | null;
}

// ---------------------------------------------------------------------------
// Normalisation et correspondance tolérante
// ---------------------------------------------------------------------------

/** Minuscules, sans accents ni ponctuation, espaces simples. */
export function normalizeMedicalText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Vrai si `keyword` apparaît dans `text` au début d'un mot. */
export function matchesKeyword(text: string, keyword: string): boolean {
  const haystack = ` ${normalizeMedicalText(text)}`;
  const needle = normalizeMedicalText(keyword);
  return needle.length > 0 && haystack.includes(` ${needle}`);
}

function medicationText(med: SafetyMedication): string {
  return [med.name, ...(med.aliases ?? []), med.className ?? ""].join(" | ");
}

function moleculeNames(med: SafetyMedication): Set<string> {
  return new Set(
    [med.name, ...(med.aliases ?? [])]
      .map(normalizeMedicalText)
      .filter((name) => name.length > 0)
  );
}

/** Groupes (classe ou molécule) auxquels appartient le médicament. */
export function medicationGroups(med: SafetyMedication): Set<SafetyGroupId> {
  const text = medicationText(med);
  const groups = new Set<SafetyGroupId>();
  for (const [id, group] of Object.entries(SAFETY_GROUPS) as [
    SafetyGroupId,
    (typeof SAFETY_GROUPS)[SafetyGroupId],
  ][]) {
    if (group.keywords.some((keyword) => matchesKeyword(text, keyword))) {
      groups.add(id);
    }
  }
  return groups;
}

function sameMolecule(a: SafetyMedication, b: SafetyMedication): boolean {
  const names = moleculeNames(a);
  for (const name of moleculeNames(b)) {
    if (names.has(name)) {
      return true;
    }
  }
  return false;
}

/** Découpe un champ libre du dossier en mentions (« A, B ; C »). */
function splitFindings(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/[,;\n/]+|\s+et\s+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

// ---------------------------------------------------------------------------
// Moteur
// ---------------------------------------------------------------------------

function matchInteraction(
  groupsA: Set<SafetyGroupId>,
  groupsB: Set<SafetyGroupId>,
  rule: InteractionRule
): boolean {
  const [x, y] = rule.between;
  return (
    (groupsA.has(x) && groupsB.has(y)) || (groupsA.has(y) && groupsB.has(x))
  );
}

function interactionAlerts(
  med: SafetyMedication,
  other: SafetyMedication,
  origin: "ordonnance" | "traitement"
): SafetyAlert[] {
  const otherRef = {
    key: other.key,
    name: other.name,
    origin,
    prescribedOn: other.prescribedOn,
  };
  if (sameMolecule(med, other)) {
    return [
      {
        id: `doublon:${med.key}:${other.key}`,
        level: "interaction",
        ruleId: "doublon",
        medicationKey: med.key,
        medicationName: med.name,
        other: otherRef,
        reason:
          origin === "traitement"
            ? "Même médicament déjà en cours : risque de surdosage."
            : "Même médicament prescrit deux fois sur l'ordonnance.",
      },
    ];
  }
  const groupsA = medicationGroups(med);
  const groupsB = medicationGroups(other);
  return INTERACTION_RULES.filter((rule) =>
    matchInteraction(groupsA, groupsB, rule)
  ).map((rule) => ({
    id: `${rule.id}:${med.key}:${other.key}`,
    level: "interaction" as const,
    ruleId: rule.id,
    medicationKey: med.key,
    medicationName: med.name,
    other: otherRef,
    reason: rule.reason,
  }));
}

function findingFor(
  rule: ContraindicationRule,
  patient: SafetyPatient
): string | null {
  const source =
    rule.field === "allergies" ? patient.allergies : patient.chronicConditions;
  return (
    splitFindings(source).find((finding) =>
      rule.keywords.some((keyword) => matchesKeyword(finding, keyword))
    ) ?? null
  );
}

function contraindicationAlerts(
  med: SafetyMedication,
  patient: SafetyPatient
): SafetyAlert[] {
  const groups = medicationGroups(med);
  const alerts: SafetyAlert[] = [];
  for (const rule of CONTRAINDICATION_RULES) {
    if (!groups.has(rule.group)) {
      continue;
    }
    const finding = findingFor(rule, patient);
    if (finding) {
      alerts.push({
        id: `${rule.id}:${med.key}`,
        level: "contraindication",
        ruleId: rule.id,
        medicationKey: med.key,
        medicationName: med.name,
        patientFinding: { field: rule.field, text: finding },
        reason: rule.reason,
      });
    }
  }

  // Allergie qui nomme directement le médicament, sa molécule ou sa classe,
  // même sans règle dédiée (ex. « allergie au Metacam », « céphalosporines »).
  if (!alerts.some((alert) => alert.patientFinding?.field === "allergies")) {
    const names = [
      ...moleculeNames(med),
      ...[...groups].flatMap((id) => SAFETY_GROUPS[id].keywords),
    ];
    const direct = splitFindings(patient.allergies).find((finding) =>
      names.some((name) => name.length >= 4 && matchesKeyword(finding, name))
    );
    if (direct) {
      alerts.push({
        id: `allergie-directe:${med.key}`,
        level: "contraindication",
        ruleId: "allergie-directe",
        medicationKey: med.key,
        medicationName: med.name,
        patientFinding: { field: "allergies", text: direct },
        reason: "Allergie à ce médicament déclarée dans le dossier.",
      });
    }
  }
  return alerts;
}

/**
 * Vérifie l'ordonnance en cours. Fonction pure : mêmes entrées, mêmes
 * alertes, dans l'ordre des lignes de l'ordonnance.
 */
export function checkPrescriptionSafety({
  active = [],
  draft,
  patient,
}: SafetyCheckInput): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  draft.forEach((med, index) => {
    // Interactions avec les lignes précédentes : chaque paire une seule fois,
    // rattachée au médicament ajouté en dernier.
    for (const previous of draft.slice(0, index)) {
      alerts.push(...interactionAlerts(med, previous, "ordonnance"));
    }
    for (const current of active) {
      alerts.push(...interactionAlerts(med, current, "traitement"));
    }
    if (patient) {
      alerts.push(...contraindicationAlerts(med, patient));
    }
  });
  return alerts;
}

// ---------------------------------------------------------------------------
// Traitements en cours
// ---------------------------------------------------------------------------

/** Durée retenue quand la durée saisie est vide ou illisible. */
export const DEFAULT_TREATMENT_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Convertit une durée libre (« 5-7 jours », « 2 semaines », « à vie ») en
 * jours. `Infinity` pour un traitement au long cours, `null` si illisible.
 */
export function durationToDays(duration: string | null | undefined): number | null {
  // Normalisation légère : on garde tirets et décimales (« 5-7 j », « 1,5 mois »).
  const text = (duration ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/,/g, ".")
    .trim();
  if (!text) {
    return null;
  }
  if (
    /\b(a vie|long cours|au long|chronique|permanent|continu|illimite|nouvel ordre)/.test(
      text
    )
  ) {
    return Number.POSITIVE_INFINITY;
  }
  const match = text.match(
    /(\d+(?:\.\d+)?)(?:\s*(?:-|a|au)\s*(\d+(?:\.\d+)?))?\s*(jours?|j|semaines?|sem|mois|ans?|heures?|h)\b/
  );
  if (match) {
    const toNumber = (raw: string) => Number.parseFloat(raw);
    const amount = Math.max(toNumber(match[1]), match[2] ? toNumber(match[2]) : 0);
    const unit = match[3];
    if (unit.startsWith("sem")) return amount * 7;
    if (unit === "mois") return amount * 30;
    if (unit.startsWith("an")) return amount * 365;
    if (unit.startsWith("h")) return Math.max(1, Math.ceil(amount / 24));
    return amount;
  }
  if (/\b(dose unique|injection unique|une fois|unique)\b/.test(text)) {
    return 1;
  }
  return null;
}

/** Vrai si une ligne prescrite le `prescribedOn` est encore en cours à `now`. */
export function isTreatmentActive(
  prescribedOn: string,
  duration: string | null | undefined,
  now: Date
): boolean {
  const start = new Date(prescribedOn);
  if (Number.isNaN(start.getTime())) {
    return false;
  }
  start.setHours(0, 0, 0, 0);
  const days = durationToDays(duration) ?? DEFAULT_TREATMENT_DAYS;
  if (days === Number.POSITIVE_INFINITY) {
    return start.getTime() <= now.getTime();
  }
  return now.getTime() >= start.getTime() && now.getTime() < start.getTime() + days * DAY_MS;
}

/**
 * Traitements en cours du patient : lignes des ordonnances signées ou
 * délivrées (hors ordonnance éditée) dont la durée n'est pas écoulée.
 */
export function collectActiveTreatments({
  excludeAppointmentId,
  items,
  now,
  patientId,
  prescriptions,
  resolveAliases,
}: {
  excludeAppointmentId?: string;
  items: PrescriptionItem[];
  now: Date;
  patientId: string;
  prescriptions: Prescription[];
  resolveAliases?: (medicationId: string) => string[];
}): SafetyMedication[] {
  const byId = new Map(
    prescriptions
      .filter(
        (p) =>
          p.patientId === patientId &&
          (p.status === "signed" || p.status === "dispensed") &&
          p.appointmentId !== excludeAppointmentId
      )
      .map((p) => [p.id, p])
  );
  return items
    .filter((item) => {
      const prescription = byId.get(item.prescriptionId);
      return (
        prescription !== undefined &&
        isTreatmentActive(prescription.prescriptionDate, item.duration, now)
      );
    })
    .map((item) => ({
      key: item.id,
      name: item.medicationName,
      className: item.medicationClass,
      aliases: item.medicationId ? (resolveAliases?.(item.medicationId) ?? []) : [],
      prescribedOn: byId.get(item.prescriptionId)?.prescriptionDate,
    }));
}
