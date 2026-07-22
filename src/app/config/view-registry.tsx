/* eslint-disable react-refresh/only-export-components */
import { lazy, type ReactNode, Suspense } from "react";
import type { ThemeMode } from "@/app/hooks/use-theme-mode";
import { Spinner } from "@/components/ui/spinner";
import { DashboardOrbitPage } from "@/modules/dashboard/dashboard-orbit-page";
import { FinancialAnalyticsV2Page } from "@/modules/finances/financial-analytics-page";
import { PatientDetailPage } from "@/modules/patients/patient-detail-page";
import type { View } from "@/types";

const AgendaPage = lazy(() => import("@/components/Agenda"));
const CliniquePage = lazy(() => import("@/components/Clinique"));
const FinancesPage = lazy(() => import("@/components/Finances"));
const HelpPage = lazy(() => import("@/components/Help"));
const NotesPage = lazy(() => import("@/components/NotesPro"));
const ParametresPage = lazy(() => import("@/components/Parametres"));
const PatientsPage = lazy(() => import("@/components/Patients"));
const StockPage = lazy(() => import("@/components/Stock"));
const TasksPage = lazy(() => import("@/components/Tasks"));
const TeamPage = lazy(() => import("@/components/Team"));

interface ViewRegistryProps {
  currentTheme: ThemeMode;
  onNavigate: (view: View) => void;
  onNavigateToPatient?: (patientId: string) => void;
  onOpenAIAgent?: () => void;
  onThemeChange: (mode: ThemeMode) => void;
  patientId?: string | null;
  userDisplayName?: string;
}

function ViewLoadingState() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 py-10">
      <div className="flex items-center gap-3 text-muted-foreground text-sm">
        <Spinner className="size-4" />
        Chargement du module...
      </div>
    </div>
  );
}

function renderLazyView(node: ReactNode) {
  return <Suspense fallback={<ViewLoadingState />}>{node}</Suspense>;
}

export function renderView(view: View, props: ViewRegistryProps) {
  switch (view) {
    case "dashboard":
      return (
        <DashboardOrbitPage
          onNavigate={props.onNavigate}
          onNavigateToPatient={props.onNavigateToPatient}
          onOpenAIAgent={props.onOpenAIAgent}
          userDisplayName={props.userDisplayName}
        />
      );
    case "agenda":
      return renderLazyView(<AgendaPage />);
    case "clinique":
      return renderLazyView(<CliniquePage onNavigate={props.onNavigate} />);
    case "patients":
      return renderLazyView(
        <PatientsPage onNavigateToPatient={props.onNavigateToPatient} />
      );
    case "patient_detail":
      return (
        <PatientDetailPage
          onNavigate={props.onNavigate}
          patientId={props.patientId ?? ""}
        />
      );
    case "notes":
      return renderLazyView(<NotesPage />);
    case "stock":
      return renderLazyView(<StockPage />);
    case "finances":
      return renderLazyView(<FinancesPage onNavigate={props.onNavigate} />);
    case "finances_analytics":
      return <FinancialAnalyticsV2Page onNavigate={props.onNavigate} />;
    case "equipe":
      return renderLazyView(<TeamPage />);
    case "parametres":
      return renderLazyView(
        <ParametresPage
          currentTheme={props.currentTheme}
          onNavigate={props.onNavigate}
          onThemeChange={props.onThemeChange}
        />
      );
    case "taches":
      return renderLazyView(<TasksPage />);
    case "aide":
      return renderLazyView(<HelpPage />);
    default:
      return <DashboardOrbitPage />;
  }
}
