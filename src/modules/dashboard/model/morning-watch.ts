import { careDisplayStatus, type CareTask } from "@/modules/care-tasks/domain";
import type { Appointment, Hospitalization, Invoice, Patient } from "@/types/db";
import type { View } from "@/types";
import { formatNumber } from "@/utils/display-format";
import { isOpenInvoice } from "../v2/financial-model";
import { formatCentimes, parseDashboardDate, startOfDay } from "../v2/model";
import type { AlertReminder } from "./alert-bars";

/**
 * « À traiter » : ce que l'équipe doit régler en ouvrant le tableau de bord, une carte par sorte d'anomalie, chacune
 * menant à la page où l'action se fait. Les règles sont celles qui existent déjà ailleurs, jamais de nouvelles :
 *  - Soins : à faire ou en cours ; en retard une fois l'heure prévue passée (la règle de la vue Soins).
 *  - Visites : terminées à l'heure mais encore « planifié » ou « confirmé » (la règle des « Rendez-vous non traités »
 *    du graphique Alertes) ; en mode « ouvert », aussi ceux d'aujourd'hui encore à venir.
 *  - Rappels médicaux : en cours, patient vivant ; échus une fois le jour passé ; en mode « ouvert », jusqu'à sept jours
 *    devant (la fenêtre du graphique Alertes).
 *  - Factures : émises avec un reste à encaisser (la règle des Créances) ; en retard quand le règlement est « overdue ».
 *  - Hospitalisés : séjours actifs ; « à surveiller » quand le séjour est critique ou sous surveillance.
 * Une source qui n'a pas pu être lue donne `count: null` : la carte le dit au lieu de compter zéro.
 */

export type MorningStatus = "late" | "open";
export type MorningId = "care" | "appointments" | "reminders" | "invoices" | "stays";

export interface MorningItem {
  id: MorningId;
  label: string;
  /** null : la source n'a pas pu être lue. */
  count: number | null;
  /** La ligne sous le chiffre : le contexte qui aide à décider. */
  line: string;
  /** La page où l'action se fait. */
  view: View;
  ariaLabel: string;
}

const ACTIVE_STAY = new Set<Hospitalization["status"]>(["admitted", "monitoring", "critical"]);
const REMINDER_AHEAD_DAYS = 7;

const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n > 1 ? many : one}`;

function dateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return parseDashboardDate(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function buildMorningWatch({
  now,
  status,
  careTasks,
  careUnavailable = false,
  appointments,
  reminders,
  remindersUnavailable = false,
  patients,
  invoices,
  stays,
  hospitalization = true,
}: {
  now: Date;
  status: MorningStatus;
  careTasks: Pick<CareTask, "statut" | "heure_prevue">[];
  careUnavailable?: boolean;
  appointments: Pick<Appointment, "startTime" | "endTime" | "status">[];
  reminders: AlertReminder[];
  remindersUnavailable?: boolean;
  patients: Pick<Patient, "id" | "status">[];
  invoices: Pick<
    Invoice,
    "documentStatus" | "issuedAt" | "createdAt" | "grossAmount" | "creditAmount" | "balanceAmount" | "settlementStatus"
  >[];
  stays: Pick<Hospitalization, "status">[];
  /** Le cabinet propose l'hospitalisation : sinon, pas de carte Hospitalisés. */
  hospitalization?: boolean;
}): MorningItem[] {
  const late = status === "late";
  const today = startOfDay(now);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  // Soins
  const openCare = careTasks.filter((task) => task.statut === "a_faire" || task.statut === "en_cours");
  const lateCare = openCare.filter((task) => careDisplayStatus(task, now) === "en_retard").length;
  const care: MorningItem = {
    id: "care",
    label: late ? "Soins en retard" : "Soins à faire",
    count: careUnavailable ? null : late ? lateCare : openCare.length,
    line: careUnavailable
      ? "Chargement impossible"
      : late
        ? `${plural(openCare.length, "soin ouvert", "soins ouverts")} au total`
        : `dont ${formatNumber(lateCare)} en retard`,
    view: "soins",
    ariaLabel: "Ouvrir Soins et hospitalisation",
  };

  // Rendez-vous
  let untreated = 0;
  let upcomingToday = 0;
  let absentToday = 0;
  for (const appointment of appointments) {
    const start = parseDashboardDate(appointment.startTime);
    if (!start) continue;
    const end = parseDashboardDate(appointment.endTime) ?? start;
    const isToday = start >= today && start < tomorrow;
    if (appointment.status === "no_show" && isToday) absentToday += 1;
    if (appointment.status !== "scheduled" && appointment.status !== "confirmed") continue;
    if (end.getTime() < now.getTime()) untreated += 1;
    else if (isToday) upcomingToday += 1;
  }
  const visits: MorningItem = {
    id: "appointments",
    label: late ? "Visites à clore" : "Visites à suivre",
    count: late ? untreated : untreated + upcomingToday,
    line: late
      ? `${plural(absentToday, "absence")} aujourd’hui`
      : `${formatNumber(untreated)} à clore · ${formatNumber(upcomingToday)} à venir aujourd’hui`,
    view: "agenda",
    ariaLabel: "Ouvrir l’agenda",
  };

  // Rappels médicaux
  const deceased = new Set(patients.filter((patient) => patient.status === "decede").map((patient) => patient.id));
  const horizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + REMINDER_AHEAD_DAYS + 1);
  let due = 0;
  let soon = 0;
  for (const reminder of reminders) {
    if (reminder.statut !== "en_cours" || deceased.has(reminder.patient_id)) continue;
    const day = dateOnly(reminder.echeance);
    if (!day) continue;
    if (day < today) due += 1;
    else if (day < horizon) soon += 1;
  }
  const remindersItem: MorningItem = {
    id: "reminders",
    label: late ? "Rappels échus" : "Rappels à envoyer",
    count: remindersUnavailable ? null : late ? due : due + soon,
    line: remindersUnavailable
      ? "Chargement impossible"
      : late
        ? `${formatNumber(soon)} de plus d’ici ${REMINDER_AHEAD_DAYS} jours`
        : `dont ${formatNumber(due)} échu${due > 1 ? "s" : ""} · ${REMINDER_AHEAD_DAYS} jours devant`,
    view: "taches",
    ariaLabel: "Ouvrir les rappels médicaux",
  };

  // Factures
  const open = invoices.filter(isOpenInvoice);
  const overdue = open.filter((invoice) => invoice.settlementStatus === "overdue");
  const owed = (list: typeof open) =>
    list.reduce((sum, invoice) => sum + Math.min(Math.max(0, invoice.grossAmount - invoice.creditAmount), Math.max(0, invoice.balanceAmount)), 0);
  const invoicesItem: MorningItem = {
    id: "invoices",
    label: late ? "Factures en retard" : "Factures impayées",
    count: late ? overdue.length : open.length,
    line: late
      ? `${formatCentimes(owed(overdue))} · ${formatNumber(open.length)} impayée${open.length > 1 ? "s" : ""} au total`
      : `${formatCentimes(owed(open))} à encaisser`,
    view: "finances",
    ariaLabel: "Ouvrir les finances",
  };

  const items = [care, visits, remindersItem, invoicesItem];
  if (!hospitalization) return items;

  // Hospitalisés
  const active = stays.filter((stay) => ACTIVE_STAY.has(stay.status));
  const critical = active.filter((stay) => stay.status === "critical").length;
  const watched = active.filter((stay) => stay.status === "monitoring").length;
  items.push({
    id: "stays",
    label: late ? "Séjours à surveiller" : "Hospitalisés",
    count: late ? critical + watched : active.length,
    line: `${plural(critical, "critique")} · ${formatNumber(watched)} sous surveillance`,
    view: "soins",
    ariaLabel: "Ouvrir les hospitalisations",
  });
  return items;
}
