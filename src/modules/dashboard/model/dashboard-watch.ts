/**
 * Rangée « À surveiller » du tableau de bord : projections en lecture seule
 * des vraies données (rappels médicaux, stock, hospitalisations).
 * Fonctions pures, sans accès aux dépôts.
 */
import type { Hospitalization, Patient, Product } from "@/types/db";
import { parseDashboardDate, startOfDay } from "../v2/model";

export type WatchTone = "critical" | "warning" | "neutral";

export interface WatchRow {
  detail: string;
  id: string;
  /** Texte court aligné à droite (échéance, cage…). */
  meta: string;
  patientId?: string;
  title: string;
  tone: WatchTone;
}

export interface WatchList {
  /** Lignes affichées (déjà limitées). */
  rows: WatchRow[];
  /** Nombre total d'éléments concernés, au-delà de la limite affichée. */
  total: number;
  /** Nombre d'éléments en tonalité critique. */
  critical: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const toneWeight: Record<WatchTone, number> = { critical: 0, warning: 1, neutral: 2 };

function shortDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** "2026-10-18" → minuit local, sans décalage de fuseau. */
function dateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return parseDashboardDate(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

function finalize(rows: (WatchRow & { order: number })[], limit: number): WatchList {
  const sorted = [...rows].sort(
    (a, b) => toneWeight[a.tone] - toneWeight[b.tone] || a.order - b.order
  );
  return {
    rows: sorted.slice(0, limit).map(({ order: _order, ...row }) => row),
    total: rows.length,
    critical: rows.filter((row) => row.tone === "critical").length,
  };
}

// ---------------------------------------------------------------------------
// Rappels médicaux à venir
// ---------------------------------------------------------------------------

export interface WatchReminder {
  echeance: string;
  id: string;
  patient_id: string;
  statut: string;
  type: string;
}

export function buildUpcomingReminders({
  horizonDays = 14,
  limit = 4,
  now,
  patients,
  reminders,
  types,
}: {
  horizonDays?: number;
  limit?: number;
  now: Date;
  patients: Pick<Patient, "id" | "name" | "status">[];
  reminders: WatchReminder[];
  types: { id: string; name: string }[];
}): WatchList {
  const today = startOfDay(now);
  const patientById = new Map(patients.map((p) => [p.id, p]));
  const typeById = new Map(types.map((t) => [t.id, t.name]));
  const rows = reminders.flatMap((reminder) => {
    if (reminder.statut !== "en_cours") return [];
    const due = dateOnly(reminder.echeance);
    if (!due) return [];
    const delta = daysBetween(today, due);
    if (delta > horizonDays) return [];
    const patient = patientById.get(reminder.patient_id);
    if (patient?.status === "decede") return [];
    const tone: WatchTone = delta < 0 ? "critical" : delta === 0 ? "warning" : "neutral";
    return [
      {
        id: `reminder:${reminder.id}`,
        title: patient?.name ?? "Patient",
        detail: typeById.get(reminder.type) ?? "Rappel médical",
        meta:
          delta < 0
            ? `En retard · ${shortDate(due)}`
            : delta === 0
              ? "Aujourd’hui"
              : `Le ${shortDate(due)}`,
        patientId: reminder.patient_id,
        tone,
        order: due.getTime(),
      },
    ];
  });
  return finalize(rows, limit);
}

// ---------------------------------------------------------------------------
// Stock à surveiller
// ---------------------------------------------------------------------------

/** "3 dose" reads "3 doses": units are stored singular; a plural form is kept. */
export function quantityLabel(quantity: number, unit: string) {
  const plural = Math.abs(quantity) > 1 && unit && !/[sx]$/i.test(unit) && !/\s/.test(unit);
  return `${quantity} ${plural ? `${unit}s` : unit}`.trim();
}

export function buildStockWatch({
  expiryDays = 60,
  limit = 4,
  now,
  products,
}: {
  expiryDays?: number;
  limit?: number;
  now: Date;
  products: Product[];
}): WatchList {
  const today = startOfDay(now);
  const rows = products.flatMap((product) => {
    if (product.archivedAt || product.stockTracked === false) return [];
    const quantity = product.availableQuantity ?? product.quantity;
    const parts: string[] = [];
    const tones: WatchTone[] = [];
    const raise = (next: WatchTone) => tones.push(next);

    if (quantity <= 0) {
      parts.push("Rupture de stock");
      raise("critical");
    } else if (quantity <= product.minStock) {
      parts.push(`Sous le seuil de ${product.minStock}`);
      raise("warning");
    }

    const expiryValue = product.nearestExpiryDate ?? product.expiryDate;
    const expiry = expiryValue ? dateOnly(expiryValue) : null;
    let order = Number.POSITIVE_INFINITY;
    if ((product.expiredQuantity ?? 0) > 0 || (expiry && expiry < today)) {
      parts.push("Lot périmé");
      raise("critical");
      order = expiry?.getTime() ?? 0;
    } else if (expiry && daysBetween(today, expiry) <= expiryDays) {
      parts.push(`Périme le ${shortDate(expiry)}`);
      raise("warning");
      order = expiry.getTime();
    }

    if (tones.length === 0) return [];
    const tone = tones.reduce((worst, next) =>
      toneWeight[next] < toneWeight[worst] ? next : worst
    );
    return [
      {
        id: `stock:${product.id}`,
        title: product.name,
        detail: parts.join(" · "),
        meta: quantityLabel(quantity, product.unit),
        tone,
        order,
      },
    ];
  });
  return finalize(rows, limit);
}

// ---------------------------------------------------------------------------
// Hospitalisés
// ---------------------------------------------------------------------------

const ACTIVE_STAY = new Set<Hospitalization["status"]>(["admitted", "monitoring", "critical"]);
const STAY_LABEL: Partial<Record<Hospitalization["status"], string>> = {
  admitted: "Admis",
  monitoring: "Sous surveillance",
  critical: "État critique",
};

export function buildHospitalizedWatch({
  limit = 4,
  now,
  patients,
  stays,
}: {
  limit?: number;
  now: Date;
  patients: Pick<Patient, "id" | "name">[];
  stays: Hospitalization[];
}): WatchList {
  const patientById = new Map(patients.map((p) => [p.id, p]));
  const rows = stays.flatMap((stay) => {
    if (!ACTIVE_STAY.has(stay.status)) return [];
    const admitted = parseDashboardDate(stay.admissionDate);
    const day = admitted ? Math.max(1, daysBetween(admitted, now) + 1) : null;
    const patient = patientById.get(stay.patientId);
    return [
      {
        id: `stay:${stay.id}`,
        title: patient?.name ?? "Patient",
        detail: [STAY_LABEL[stay.status], stay.diagnosis?.trim()].filter(Boolean).join(" · "),
        meta: [stay.cage ? `Cage ${stay.cage}` : null, day ? `J${day}` : null]
          .filter(Boolean)
          .join(" · "),
        patientId: stay.patientId,
        tone: (stay.status === "critical"
          ? "critical"
          : stay.status === "monitoring"
            ? "warning"
            : "neutral") as WatchTone,
        order: admitted?.getTime() ?? 0,
      },
    ];
  });
  return finalize(rows, limit);
}
