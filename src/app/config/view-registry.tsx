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

// Each page's code is fetched once, by the first of two callers: the page itself when it opens, or
// `prefetchView` when the pointer or the keyboard reaches its navigation entry. The entry is then
// already there at the click, and the loading line below has nothing to announce.
const loadClinicalWorkspace = () => import("@/modules/clinique/pages/clinical-workspace");
const loadAgendaPage = () => import("@/modules/agenda/pages/agenda-page");
const loadFlowBoardPage = () => import("@/modules/flow-board/flow-board-page");
const loadFinancesPage = () => import("@/modules/finances/pages/finances-page");
const loadNotesPage = () => import("@/components/NotesPro");
const loadParametresPage = () => import("@/components/Parametres");
const loadPatientsPage = () => import("@/modules/patients/pages/patients-page");
const loadStockPage = () => import("@/modules/stock/pages/stock-page");
const loadTasksPage = () => import("@/components/Tasks");
const loadTeamPage = () => import("@/components/Team");
const loadFinancialAnalyticsPage = () => import("@/modules/finances/financial-analytics-page");
const loadPatientDetailPage = () => import("@/modules/patients/patient-detail-page");

const ClinicalWorkspace = lazy(loadClinicalWorkspace);
const AgendaPage = lazy(loadAgendaPage);
const FlowBoardPage = lazy(loadFlowBoardPage);
const FinancesPage = lazy(loadFinancesPage);
const NotesPage = lazy(loadNotesPage);
const ParametresPage = lazy(loadParametresPage);
const PatientsPage = lazy(loadPatientsPage);
const StockPage = lazy(loadStockPage);
const TasksPage = lazy(loadTasksPage);
const TeamPage = lazy(loadTeamPage);
const FinancialAnalyticsPage = lazy(async () => {
  const module = await loadFinancialAnalyticsPage();
  return { default: module.FinancialAnalyticsV2Page };
});
const PatientDetailPage = lazy(async () => {
  const module = await loadPatientDetailPage();
  return { default: module.PatientDetailPage };
});

const VIEW_LOADERS: Partial<Record<View, () => Promise<unknown>>> = {
  soins: loadClinicalWorkspace,
  clinique: loadClinicalWorkspace,
  agenda: loadAgendaPage,
  flux: loadFlowBoardPage,
  patients: loadPatientsPage,
  patient_detail: loadPatientDetailPage,
  notes: loadNotesPage,
  stock: loadStockPage,
  finances: loadFinancesPage,
  finances_analytics: loadFinancialAnalyticsPage,
  taches: loadTasksPage,
  equipe: loadTeamPage,
  parametres: loadParametresPage,
};

/** Fetches a page's code ahead of the click. Safe to call many times; a failed fetch is retried by the page itself. */
export function prefetchView(view: View) {
  void VIEW_LOADERS[view]?.().catch(() => undefined);
}

interface ViewRegistryProps {
  currentTheme: ThemeMode;
  onNavigate: (view: View) => void;
  onNavigateToPatient?: (patientId: string) => void;
  /** Opens the full patient record, without the quick-read panel. */
  onOpenPatientRecord?: (patientId: string) => void;
  onOpenAIAgent?: () => void;
  onThemeChange: (mode: ThemeMode) => void;
  patientId?: string | null;
  userDisplayName?: string;
}

function ViewLoadingState() {
  return (
    <div className="view-loading flex min-h-[40vh] items-center justify-center px-6 py-10">
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
    case "soins":
      return renderLazyView(<ClinicalWorkspace initialTab="soins" onNavigate={props.onNavigate} onNavigateToPatient={props.onNavigateToPatient} />);
    case "agenda":
      return renderLazyView(<AgendaPage onNavigate={props.onNavigate} />);
    case "clinique":
      return renderLazyView(<ClinicalWorkspace onNavigate={props.onNavigate} onNavigateToPatient={props.onNavigateToPatient} />);
    case "flux":
      return renderLazyView(<FlowBoardPage onNavigate={props.onNavigate} onNavigateToPatient={props.onNavigateToPatient} />);
    case "patients":
      return renderLazyView(
        <PatientsPage onNavigateToPatient={props.onOpenPatientRecord ?? props.onNavigateToPatient} />
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
    default:
      return <DashboardOrbitPage />;
  }
}
