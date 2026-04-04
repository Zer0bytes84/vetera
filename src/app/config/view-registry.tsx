import { lazy, Suspense, type ReactNode } from "react"

import { Spinner } from "@/components/ui/spinner"
import type { View } from "@/types"

import type { ThemeMode } from "../hooks/use-theme-mode"
import { DashboardPage } from "../../modules/dashboard/dashboard-page"

const AgendaPage = lazy(() => import("@/components/Agenda"))
const CliniquePage = lazy(() => import("@/components/Clinique"))
const FinancesPage = lazy(() => import("@/components/Finances"))
const HelpPage = lazy(() => import("@/components/Help"))
const NotesPage = lazy(() => import("@/components/Notes"))
const ParametresPage = lazy(() => import("@/components/Parametres"))
const PatientsPage = lazy(() => import("@/components/Patients"))
const StockPage = lazy(() => import("@/components/Stock"))
const TasksPage = lazy(() => import("@/components/Tasks"))
const TeamPage = lazy(() => import("@/components/Team"))

type ViewRegistryProps = {
  onNavigate: (view: View) => void
  currentTheme: ThemeMode
  onThemeChange: (mode: ThemeMode) => void
}

function ViewLoadingState() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 py-10">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        Chargement du module...
      </div>
    </div>
  )
}

function renderLazyView(node: ReactNode) {
  return <Suspense fallback={<ViewLoadingState />}>{node}</Suspense>
}

export function renderView(view: View, props: ViewRegistryProps) {
  switch (view) {
    case "dashboard":
      return <DashboardPage onNavigate={props.onNavigate} />
    case "agenda":
      return renderLazyView(<AgendaPage />)
    case "clinique":
      return renderLazyView(<CliniquePage onNavigate={props.onNavigate} />)
    case "patients":
      return renderLazyView(<PatientsPage />)
    case "notes":
      return renderLazyView(<NotesPage />)
    case "stock":
      return renderLazyView(<StockPage />)
    case "finances":
      return renderLazyView(<FinancesPage />)
    case "equipe":
      return renderLazyView(<TeamPage />)
    case "parametres":
      return renderLazyView(
        <ParametresPage currentTheme={props.currentTheme} onThemeChange={props.onThemeChange} />
      )
    case "taches":
      return renderLazyView(<TasksPage />)
    case "aide":
      return renderLazyView(<HelpPage />)
    default:
      return <DashboardPage onNavigate={props.onNavigate} />
  }
}
