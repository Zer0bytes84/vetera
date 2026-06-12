import type { View } from "@/types";

export type NotificationSource =
  | "appointment"
  | "reminder"
  | "postop"
  | "task"
  | "stock"
  | "soap"
  | "automation"
  | "audit";

export type NotificationSeverity = "critical" | "warn" | "info";

export type NotificationTarget =
  | { view: View }
  | { view: "patient_detail"; patientId: string }
  | { view: "agenda"; appointmentId?: string }
  | { view: "clinique"; patientId?: string }
  | { view: "taches"; taskId?: string }
  | { view: "stock"; productId?: string };

/**
 * Représentation normalisée d'une notification multi-sources.
 * L'`id` est dérivé de la source + entité pour rester stable d'un refresh
 * à l'autre (ex: "appointment:abc123"), ce qui permet de conserver l'état
 * read/dismiss même quand l'entité source mute.
 */
export interface NotificationItem {
  /** Court libellé affiché en CTA (ex: "Ouvrir la fiche patient"). */
  clickHint: string;
  createdAt: string;
  data?: Record<string, unknown>;
  description: string;
  id: string;
  severity: NotificationSeverity;
  source: NotificationSource;
  target: NotificationTarget;
  title: string;
}

/**
 * Persistance légère du read/dismiss — une seule ligne par `notificationId`.
 * Vit en SQLite pour survivre aux redémarrages ; pas de duplication des
 * données métier (l'entité source reste la source de vérité).
 */
export interface NotificationState {
  createdAt: string;
  dismissedAt: string | null;
  notificationId: string;
  readAt: string | null;
}

export type NotificationFilter = "all" | "unread" | "critical";

export const NOTIFICATION_SEVERITY_WEIGHT: Record<
  NotificationSeverity,
  number
> = {
  critical: 3,
  warn: 2,
  info: 1,
};

/**
 * Génère un id déterministe à partir de (source, identifiant entité).
 * Le préfixe de source permet d'éviter les collisions cross-domain.
 */
export function buildNotificationId(
  source: NotificationSource,
  entityId: string
): string {
  return `${source}:${entityId}`;
}

/**
 * Mapping centralisé source → couleur d'accent (utilisé par les widgets
 * ET le dropdown pour rester cohérent avec le design system).
 */
export const NOTIFICATION_SOURCE_ACCENT: Record<
  NotificationSource,
  { dot: string; ring: string; label: string }
> = {
  appointment: {
    dot: "bg-sky-500",
    ring: "ring-sky-500/30",
    label: "Rendez-vous",
  },
  reminder: {
    dot: "bg-blue-500",
    ring: "ring-blue-500/30",
    label: "Rappel",
  },
  postop: {
    dot: "bg-rose-500",
    ring: "ring-rose-500/30",
    label: "Post-op",
  },
  task: {
    dot: "bg-amber-500",
    ring: "ring-amber-500/30",
    label: "Tâche",
  },
  stock: {
    dot: "bg-indigo-500",
    ring: "ring-indigo-500/30",
    label: "Stock",
  },
  soap: {
    dot: "bg-violet-500",
    ring: "ring-violet-500/30",
    label: "SOAP",
  },
  automation: {
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    label: "Automatisation",
  },
  audit: {
    dot: "bg-zinc-400",
    ring: "ring-zinc-400/30",
    label: "Activité",
  },
};
