import { FloralArtwork } from "@/components/FloralArtwork";
import { ArrowUpRight, Activity, PawPrint } from "lucide-react";
import {
  useAppointmentsRepository,
  usePatientsRepository,
  useProductsRepository,
  useTasksRepository,
  useTransactionsRepository,
} from "@/data/repositories";
import { useFloralBackground } from "@/lib/floral-background";
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
  const [background] = useFloralBackground();
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
    <section
      className="studio-garden mx-4 mb-5 lg:mx-6"
      aria-label="Repères de la rubrique"
    >
      <FloralArtwork className="studio-garden-art" scene={background} />
      <div className="studio-garden-toolbar">
        <span>
          <PawPrint size={16} />
          Les repères du cabinet
        </span>
      </div>
      <div className="studio-garden-widgets">
        {cards.map((card) => (
          <button
            className="studio-glass-widget"
            key={card.title}
            type="button"
            onClick={() => onNavigate(card.target)}
          >
            <span className="studio-glass-heading">
              <Activity size={20} />
              {card.title}
              <ArrowUpRight size={16} />
            </span>
            <span className="studio-glass-value">
              {loading ? "…" : card.value}
            </span>
            <span className="studio-glass-detail">{card.detail}</span>
            <span className="studio-glass-footer">
              Ouvrir la rubrique <ArrowUpRight size={14} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
