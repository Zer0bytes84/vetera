import {
  Component,
  lazy,
  type ErrorInfo,
  type ReactNode,
  Suspense,
} from "react";
import type { ThemeMode } from "@/app/hooks/use-theme-mode";
import { Spinner } from "@/components/ui/spinner";
import { DashboardOrbitPage } from "@/modules/dashboard/dashboard-orbit-page";
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
const FinancialAnalyticsPage = lazy(async () => {
  const module = await import("@/modules/finances/financial-analytics-page");
  return { default: module.FinancialAnalyticsV2Page };
});
const PatientDetailPage = lazy(async () => {
  const module = await import("@/modules/patients/patient-detail-page");
  return { default: module.PatientDetailPage };
});
const AIAgentChat = lazy(async () => {
  const module = await import("@/components/AIAgentChat");
  return { default: module.AIAgentChat };
});

interface ViewRegistryProps {
  currentTheme: ThemeMode;
  onNavigate: (view: View) => void;
  onNavigateToPatient?: (patientId: string) => void;
  onOpenAIAgent?: () => void;
  onCloseAIAgent?: () => void;
  onThemeChange: (mode: ThemeMode) => void;
  patientId?: string | null;
  userAvatarUrl?: string | null;
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

type ViewErrorBoundaryProps = { children: ReactNode };
type ViewErrorBoundaryState = { error: Error | null };

class ViewErrorBoundary extends Component<
  ViewErrorBoundaryProps,
  ViewErrorBoundaryState
> {
  state: ViewErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ViewErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[View] Module render failed:", error, errorInfo);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm">
          <p className="font-semibold text-base">Cette vue n’a pas pu être chargée.</p>
          <p className="mt-2 text-muted-foreground text-sm">
            L’application reste disponible. Rechargez uniquement cette vue pour reprendre.
          </p>
          <button
            className="mt-5 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm"
            onClick={() => window.location.reload()}
            type="button"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }
}

function renderLazyView(node: ReactNode) {
  return (
    <ViewErrorBoundary>
      <Suspense fallback={<ViewLoadingState />}>{node}</Suspense>
    </ViewErrorBoundary>
  );
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
      return renderLazyView(
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
      return renderLazyView(
        <FinancialAnalyticsPage onNavigate={props.onNavigate} />
      );
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
    case "assistant":
      return renderLazyView(
        <AIAgentChat
          currentView={view}
          onClose={props.onCloseAIAgent}
          patientId={props.patientId}
          userAvatarUrl={props.userAvatarUrl}
          userDisplayName={props.userDisplayName}
        />
      );
    default:
      return <DashboardOrbitPage />;
  }
}
