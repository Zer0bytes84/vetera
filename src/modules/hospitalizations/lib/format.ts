import type { HospitalizationStatus } from "@/types/db";

export const HOSPITALIZATION_STATUS_LABELS: Record<HospitalizationStatus, string> =
  {
    admitted: "Admis",
    monitoring: "Surveillance",
    critical: "Critique",
    discharged: "Sorti",
    transferred: "Transféré",
    deceased: "Décédé",
  };

export const HOSPITALIZATION_STATUS_TONE: Record<
  HospitalizationStatus,
  "info" | "warning" | "success" | "destructive" | "neutral"
> = {
  admitted: "info",
  monitoring: "warning",
  critical: "destructive",
  discharged: "success",
  transferred: "neutral",
  deceased: "destructive",
};

/**
 * Calcule la durée d'hospitalisation en minutes.
 * Si pas de dischargeDate, prend now comme borne.
 */
export function computeHospitalizationDurationMinutes(
  admissionDate: string,
  dischargeDate: string | null | undefined,
  now: Date = new Date()
): number {
  const start = new Date(admissionDate).getTime();
  if (Number.isNaN(start)) return 0;
  const end = dischargeDate
    ? new Date(dischargeDate).getTime()
    : now.getTime();
  if (Number.isNaN(end) || end < start) return 0;
  return Math.floor((end - start) / 60000);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days >= 1) {
    return `${days}j ${remainingHours}h`;
  }
  const remainingMin = minutes % 60;
  return remainingMin > 0 ? `${hours}h ${remainingMin}m` : `${hours}h`;
}

/**
 * "il y a 2h", "il y a 15min", "il y a 3j"
 */
export function formatTimeAgo(
  date: string,
  now: Date = new Date()
): string {
  const target = new Date(date).getTime();
  if (Number.isNaN(target)) return "—";
  const diffMs = now.getTime() - target;
  if (diffMs < 60000) return "à l'instant";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `il y a ${weeks} sem`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}

/**
 * Couleur indicative pour un score de douleur (0-10).
 * 0-3 vert, 4-6 ambre, 7-10 rouge.
 */
export function painScoreTone(
  score: number | null | undefined
): "success" | "warning" | "destructive" | "neutral" {
  if (score == null) return "neutral";
  if (score <= 3) return "success";
  if (score <= 6) return "warning";
  return "destructive";
}

/**
 * Détecte si une constante est dans la zone "alerte rouge"
 * pour un mammifère de compagnie (chien/chat).
 * Heuristique simple, à raffiner par espèce plus tard.
 */
export function vitalIsCritical(
  kind: "temperature" | "heartRate" | "respiratoryRate" | "spo2",
  value: number | null | undefined
): boolean {
  if (value == null) return false;
  switch (kind) {
    case "temperature":
      return value < 37 || value > 40;
    case "heartRate":
      return value < 50 || value > 180;
    case "respiratoryRate":
      return value < 8 || value > 60;
    case "spo2":
      return value < 92;
  }
}
