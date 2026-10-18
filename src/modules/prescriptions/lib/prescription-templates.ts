/**
 * Modèles d'ordonnances — fonctions pures.
 *
 * Un modèle conserve ce qui ne dépend pas du patient : médicaments,
 * posologies (par kg), fréquences, durées, instructions. Les doses calculées
 * (mg, mL) ne sont jamais stockées : elles sont recalculées au moment de
 * l'application, avec le poids du patient courant.
 */

import type { PrescriptionDosageUnit } from "@/types/db";

import {
  checkPrescriptionSafety,
  type SafetyAlert,
  type SafetyMedication,
  type SafetyPatient,
} from "./prescription-safety";

export interface PrescriptionTemplateItem {
  concentrationMgPerMl?: number;
  dosageMax?: number;
  dosageMin?: number;
  dosagePerKg: number;
  dosageUnit: PrescriptionDosageUnit;
  duration: string;
  form?: string;
  frequency: string;
  instructions?: string;
  medicationClass?: string;
  medicationId?: string;
  medicationName: string;
  quantity?: string;
  route?: string;
  warnings?: string;
}

export interface PrescriptionTemplate {
  createdAt: string;
  diagnosis?: string;
  generalInstructions?: string;
  id: string;
  items: PrescriptionTemplateItem[];
  name: string;
  updatedAt: string;
}

export const TEMPLATE_NAME_MAX = 80;
const DOSAGE_UNITS: readonly PrescriptionDosageUnit[] = [
  "mg/kg",
  "mg/tot",
  "mL/kg",
  "UI/kg",
  "cp/kg",
];

/** Nom nettoyé : espaces réduits, longueur bornée. */
export function cleanTemplateName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, TEMPLATE_NAME_MAX);
}

function nameKey(name: string): string {
  return cleanTemplateName(name)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Modèle portant déjà ce nom (casse et accents ignorés). */
export function findTemplateByName(
  templates: readonly PrescriptionTemplate[],
  name: string,
  exceptId?: string
): PrescriptionTemplate | undefined {
  const key = nameKey(name);
  return templates.find((tpl) => tpl.id !== exceptId && nameKey(tpl.name) === key);
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Ne garde d'une ligne que les champs propres au modèle. */
export function toTemplateItem(
  item: PrescriptionTemplateItem
): PrescriptionTemplateItem {
  return {
    medicationId: optionalText(item.medicationId),
    medicationName: item.medicationName.trim(),
    medicationClass: optionalText(item.medicationClass),
    form: optionalText(item.form),
    dosagePerKg: optionalNumber(item.dosagePerKg) ?? 0,
    dosageUnit: DOSAGE_UNITS.includes(item.dosageUnit)
      ? item.dosageUnit
      : "mg/kg",
    dosageMin: optionalNumber(item.dosageMin),
    dosageMax: optionalNumber(item.dosageMax),
    concentrationMgPerMl: optionalNumber(item.concentrationMgPerMl),
    frequency: typeof item.frequency === "string" ? item.frequency : "",
    duration: typeof item.duration === "string" ? item.duration : "",
    route: optionalText(item.route),
    quantity: optionalText(item.quantity),
    instructions: optionalText(item.instructions),
    warnings: optionalText(item.warnings),
  };
}

/** Lecture tolérante du JSON stocké : les entrées illisibles sont écartées. */
export function parseTemplates(raw: string | null): PrescriptionTemplate[] {
  if (!raw) {
    return [];
  }
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Les modèles d'ordonnance sont illisibles.");
  }
  return parsed.flatMap((entry): PrescriptionTemplate[] => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const tpl = entry as Partial<PrescriptionTemplate>;
    const name = typeof tpl.name === "string" ? cleanTemplateName(tpl.name) : "";
    if (typeof tpl.id !== "string" || !name || !Array.isArray(tpl.items)) {
      return [];
    }
    const items = tpl.items
      .filter(
        (it): it is PrescriptionTemplateItem =>
          Boolean(it) &&
          typeof it === "object" &&
          typeof it.medicationName === "string" &&
          it.medicationName.trim() !== ""
      )
      .map(toTemplateItem);
    if (items.length === 0) {
      return [];
    }
    return [
      {
        id: tpl.id,
        name,
        diagnosis: optionalText(tpl.diagnosis),
        generalInstructions: optionalText(tpl.generalInstructions),
        items,
        createdAt: typeof tpl.createdAt === "string" ? tpl.createdAt : "",
        updatedAt: typeof tpl.updatedAt === "string" ? tpl.updatedAt : "",
      },
    ];
  });
}

/** Tri d'affichage : ordre alphabétique français. */
export function sortTemplates(
  templates: readonly PrescriptionTemplate[]
): PrescriptionTemplate[] {
  return [...templates].sort((a, b) =>
    a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
  );
}

export interface SaveTemplateInput {
  diagnosis?: string;
  generalInstructions?: string;
  items: readonly PrescriptionTemplateItem[];
  name: string;
}

/**
 * Ajoute un modèle, ou remplace celui qui porte déjà ce nom (son identifiant
 * et sa date de création sont conservés).
 */
export function upsertTemplate(
  templates: readonly PrescriptionTemplate[],
  input: SaveTemplateInput,
  options: { id: () => string; now: string }
): { saved: PrescriptionTemplate; templates: PrescriptionTemplate[]; replaced: boolean } {
  const name = cleanTemplateName(input.name);
  if (!name) {
    throw new Error("Donnez un nom au modèle.");
  }
  const items = input.items
    .filter((it) => it.medicationName.trim() !== "")
    .map(toTemplateItem);
  if (items.length === 0) {
    throw new Error("Ajoutez au moins un médicament avant d'enregistrer un modèle.");
  }
  const existing = findTemplateByName(templates, name);
  const saved: PrescriptionTemplate = {
    id: existing?.id ?? options.id(),
    name,
    diagnosis: optionalText(input.diagnosis?.trim()),
    generalInstructions: optionalText(input.generalInstructions?.trim()),
    items,
    createdAt: existing?.createdAt || options.now,
    updatedAt: options.now,
  };
  return {
    saved,
    replaced: Boolean(existing),
    templates: existing
      ? templates.map((tpl) => (tpl.id === existing.id ? saved : tpl))
      : [...templates, saved],
  };
}

export function renameTemplate(
  templates: readonly PrescriptionTemplate[],
  id: string,
  newName: string,
  now: string
): PrescriptionTemplate[] {
  const name = cleanTemplateName(newName);
  if (!name) {
    throw new Error("Donnez un nom au modèle.");
  }
  if (!templates.some((tpl) => tpl.id === id)) {
    throw new Error("Ce modèle n'existe plus.");
  }
  if (findTemplateByName(templates, name, id)) {
    throw new Error("Un autre modèle porte déjà ce nom.");
  }
  return templates.map((tpl) =>
    tpl.id === id ? { ...tpl, name, updatedAt: now } : tpl
  );
}

export function removeTemplate(
  templates: readonly PrescriptionTemplate[],
  id: string
): PrescriptionTemplate[] {
  return templates.filter((tpl) => tpl.id !== id);
}

/**
 * Lignes prêtes à insérer dans une ordonnance, numérotées à la suite des
 * lignes existantes. Les doses calculées restent à faire par l'appelant,
 * avec le poids du patient courant.
 */
export function instantiateTemplateItems<T extends { id: string; sortOrder: number }>(
  template: PrescriptionTemplate,
  startSortOrder: number,
  makeLine: (item: PrescriptionTemplateItem, sortOrder: number) => T
): T[] {
  return template.items.map((item, idx) =>
    makeLine(toTemplateItem(item), startSortOrder + idx)
  );
}

/**
 * Contrôle de sécurité d'un modèle pour le patient courant, avant ou au
 * moment de l'application : les lignes du modèle sont vérifiées après celles
 * déjà présentes dans l'ordonnance, contre les traitements en cours, les
 * allergies et les affections chroniques. Seules les alertes qui touchent une
 * ligne du modèle sont renvoyées.
 */
export function checkTemplateSafety(input: {
  active?: SafetyMedication[];
  draft: SafetyMedication[];
  patient?: SafetyPatient | null;
  resolveAliases?: (medicationId: string | undefined) => string[];
  template: PrescriptionTemplate;
}): SafetyAlert[] {
  const templateKeys = new Set<string>();
  const templateMeds = input.template.items.map((item, idx) => {
    const key = `template_${input.template.id}_${idx}`;
    templateKeys.add(key);
    return {
      key,
      name: item.medicationName,
      className: item.medicationClass,
      aliases: input.resolveAliases?.(item.medicationId) ?? [],
    };
  });
  return checkPrescriptionSafety({
    active: input.active,
    draft: [...input.draft, ...templateMeds],
    patient: input.patient,
  }).filter(
    (alert) =>
      templateKeys.has(alert.medicationKey) ||
      (alert.other?.origin === "ordonnance" && templateKeys.has(alert.other.key))
  );
}
