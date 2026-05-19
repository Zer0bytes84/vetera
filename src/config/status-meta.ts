import type { Appointment, Patient } from "@/types/db";

type StatusColor = { label: string; className: string };

export const APPOINTMENT_TYPE_META: Record<
  Appointment["type"],
  {
    badgeClassName: string;
    surfaceClassName: string;
    dotClassName: string;
    iconClassName: string;
  }
> = {
  Consultation: {
    badgeClassName:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    surfaceClassName:
      "border-emerald-200/70 bg-emerald-500/8 dark:border-emerald-900/70 dark:bg-emerald-500/10",
    dotClassName: "bg-emerald-500",
    iconClassName:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  Vaccin: {
    badgeClassName: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    surfaceClassName:
      "border-blue-200/70 bg-blue-500/8 dark:border-blue-900/70 dark:bg-blue-500/10",
    dotClassName: "bg-blue-500",
    iconClassName:
      "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  },
  Chirurgie: {
    badgeClassName: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    surfaceClassName:
      "border-rose-200/70 bg-rose-500/8 dark:border-rose-900/70 dark:bg-rose-500/10",
    dotClassName: "bg-rose-500",
    iconClassName:
      "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  },
  Urgence: {
    badgeClassName:
      "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    surfaceClassName:
      "border-amber-200/70 bg-amber-500/10 dark:border-amber-900/70 dark:bg-amber-500/12",
    dotClassName: "bg-amber-500",
    iconClassName:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
  Contrôle: {
    badgeClassName:
      "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    surfaceClassName:
      "border-violet-200/70 bg-violet-500/8 dark:border-violet-900/70 dark:bg-violet-500/10",
    dotClassName: "bg-violet-500",
    iconClassName:
      "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  },
};

export const APPOINTMENT_STATUS_META: Record<
  Appointment["status"],
  StatusColor
> = {
  scheduled: {
    label: "Planifié",
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  in_progress: {
    label: "En cours",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  completed: {
    label: "Terminé",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  cancelled: {
    label: "Annulé",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  no_show: {
    label: "Absent",
    className:
      "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
};

/** Clinique overrides: different labels/colors for in-progress appointments */
export const CLINIQUE_STATUS_META: Record<
  Appointment["status"],
  StatusColor
> = {
  ...APPOINTMENT_STATUS_META,
  scheduled: {
    label: "À lancer",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  no_show: {
    label: "Absent",
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

/** Patient-level status (shared between Clinique and Patients) */
export const PATIENT_STATUS_META: Record<
  Patient["status"],
  StatusColor
> = {
  sante: {
    label: "En bonne santé",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  traitement: {
    label: "En traitement",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  hospitalise: {
    label: "Hospitalisé",
    className:
      "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
  decede: {
    label: "Décédé",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
};

export const PRIORITY_META: Record<
  string,
  { label: string; badgeClassName: string; cardClassName: string }
> = {
  high: {
    label: "Urgent",
    badgeClassName:
      "bg-red-500/10 text-red-700 dark:text-red-300",
    cardClassName: "border-l-destructive bg-destructive/5",
  },
  medium: {
    label: "Normal",
    badgeClassName:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    cardClassName:
      "border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/10",
  },
  low: {
    label: "Faible",
    badgeClassName:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    cardClassName:
      "border-l-blue-500 bg-blue-500/5 dark:bg-blue-500/10",
  },
};

export const STOCK_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  expired: {
    label: "Expiré",
    className:
      "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  out: {
    label: "Rupture",
    className: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
  low: {
    label: "Stock Bas",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  ok: {
    label: "OK",
    className:
      "bg-green-500/10 text-green-700 dark:text-green-300",
  },
};

export const TEAM_STATUS_META: Record<
  string,
  { label: string; className: string; icon: string }
> = {
  active: {
    label: "Actif",
    className:
      "border-green-100 bg-green-50 text-green-600 dark:border-green-500/20 dark:bg-green-500/10",
    icon: "check",
  },
  inactive: {
    label: "Inactif",
    className:
      "bg-muted/50 text-muted-foreground",
    icon: "cancel",
  },
};

export const TRANSACTION_TYPE_META: Record<
  string,
  {
    label: string;
    badgeClassName: string;
    amountClassName: string;
  }
> = {
  income: {
    label: "Revenu",
    badgeClassName:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amountClassName:
      "text-emerald-600 dark:text-emerald-400",
  },
  expense: {
    label: "Dépense",
    badgeClassName: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    amountClassName: "text-rose-600 dark:text-rose-400",
  },
};

export const TRANSACTION_STATUS_META: Record<
  string,
  StatusColor
> = {
  paid: {
    label: "Payé",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  pending: {
    label: "En attente",
    className:
      "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
};

export const SPECIES_TONE: Record<
  string,
  string
> = {
  chien: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  chat: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  nac: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export function getSpeciesTone(species?: string): string {
  const normalized = species?.toLowerCase() ?? "";
  if (normalized.includes("chien")) return SPECIES_TONE.chien;
  if (normalized.includes("chat")) return SPECIES_TONE.chat;
  if (normalized.includes("nac")) return SPECIES_TONE.nac;
  return "bg-muted text-muted-foreground";
}
