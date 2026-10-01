import { SectionCards } from "@/components/section-cards";
import {
  useAppointmentsRepository,
  usePatientsRepository,
  useProductsRepository,
  useTasksRepository,
  useTransactionsRepository,
} from "@/data/repositories";
import {
  formatCentimes,
  parseDashboardDate,
  startOfDay,
} from "@/modules/dashboard/v2/model";
import type { View } from "@/types";
import "@/modules/dashboard/v2/studio-dashboard.css";

type Insight = {
  title: string;
  value: string | number;
  detail: string;
  target: View;
};
export function SectionGarden({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (view: View) => void;
}) {
  const { data: patients, loading: patientsLoading } = usePatientsRepository();
  const { data: appointments, loading: appointmentsLoading } =
    useAppointmentsRepository();
  const { data: products, loading: productsLoading } = useProductsRepository();
  const { data: tasks, loading: tasksLoading } = useTasksRepository();
  const { data: transactions, loading: transactionsLoading } =
    useTransactionsRepository();
  const loading =
    patientsLoading ||
    appointmentsLoading ||
    productsLoading ||
    tasksLoading ||
    transactionsLoading;
  const today = startOfDay(new Date()).getTime();
  const visits = appointments.filter((a) => {
    const date = parseDashboardDate(a.startTime);
    return (
      date &&
      startOfDay(date).getTime() === today &&
      !["cancelled", "no_show"].includes(a.status)
    );
  });
  const reminders: Insight = {
    title: "Actions à suivre",
    value: tasks.filter((t) => t.status !== "done").length,
    detail: "Consulter les rappels et les tâches",
    target: "taches",
  };
  const agenda: Insight = {
    title: "Rendez-vous aujourd’hui",
    value: visits.length,
    detail: "Ouvrir le planning du cabinet",
    target: "agenda",
  };
  const care: Insight = {
    title: "Patients en soins",
    value: patients.filter((p) =>
      ["traitement", "hospitalise"].includes(p.status)
    ).length,
    detail: "Consulter les dossiers patients",
    target: "patients",
  };
  const stock: Insight = {
    title: "Stocks à surveiller",
    value: products.filter((p) => p.quantity <= p.minStock).length,
    detail: "Vérifier les seuils de réapprovisionnement",
    target: "stock",
  };
  const money: Insight = {
    title: "Règlements en attente",
    value: formatCentimes(
      transactions
        .filter((t) => t.type === "income" && t.status === "pending")
        .reduce((sum, t) => sum + t.amount, 0)
    ),
    detail: "Consulter les règlements dans Finances",
    target: "finances",
  };
  const pairs: Partial<Record<View, [Insight, Insight]>> = {
    patients: [agenda, reminders],
    agenda: [care, reminders],
    clinique: [care, stock],
    stock: [care, reminders],
    finances: [
      agenda,
      {
        title: "Analyse financière",
        value: formatCentimes(
          transactions
            .filter((t) => t.type === "income" && t.status === "paid")
            .reduce((s, t) => s + t.amount, 0)
        ),
        detail: "Encaissements enregistrés · toutes dates",
        target: "finances_analytics",
      },
    ],
    finances_analytics: [money, agenda],
    equipe: [agenda, reminders],
    taches: [agenda, stock],
    notes: [care, reminders],
    patient_detail: [agenda, reminders],
    parametres: [stock, reminders],
    aide: [agenda, reminders],
    assistant: [care, agenda],
  };
  const cards = pairs[view];
  if (!cards) return null;
  return (
    <SectionCards
      className="mx-4 mb-5 lg:mx-6"
      items={cards.map(card => ({
        title: card.title,
        value: loading ? "…" : String(card.value),
        footerTitle: card.title === "Rendez-vous aujourd’hui" ? "aujourd’hui" : "Repère du cabinet",
        footerDescription: card.detail,
        badge: loading ? "Chargement" : "Données du cabinet",
        tone: "quiet",
        trend: "neutral",
        onClick: () => onNavigate(card.target),
        actionLabel: "Ouvrir la rubrique",
      }))}
    />
  );
}
