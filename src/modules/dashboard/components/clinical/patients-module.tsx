import { PawPrint } from "lucide-react";
import { KpiSegments } from "../../v2/kpi-mini-chart";
import { EmptyState, SignalBadge, focusRing } from "@/design-system/primitives";
import { WidgetShell } from "@/design-system/patterns/widget-shell";
import type { buildPatientFollowUpRows } from "../../model/clinical-dashboard";
import {
  ModuleLink,
  ModuleTotals,
  PatientPortrait,
  RowSkeleton,
  type WidgetState,
} from "./shared";

export function PatientsModule({
  summary,
  rows,
  state,
  onPatient,
  onIntent,
  onIntentCancel,
  onPatients,
}: {
  summary: { count: number; underTreatment: number; hospitalized: number };
  rows: ReturnType<typeof buildPatientFollowUpRows>;
  state: WidgetState;
  onPatient: (id: string) => void;
  onIntent: () => void;
  onIntentCancel: () => void;
  onPatients: () => void;
}) {
  return (
    <WidgetShell
      // The empty state carries its own button to the same page.
      actions={
        rows.length ? (
          <ModuleLink onClick={onPatients}>Dossiers</ModuleLink>
        ) : undefined
      }
      className="clinical-module clinical-patients-module"
      error={state.error}
      icon={PawPrint}
      onRetry={state.retry}
      pending={state.loading}
      showSkeleton={state.skeleton}
      skeleton={<RowSkeleton />}
      subtitle="Soins en cours, puis dossiers récemment suivis"
      title="Suivi des patients"
    >
      <ModuleTotals
        values={[
          { label: "patients actifs", value: summary.count },
          {
            label: "sous traitement",
            value: summary.underTreatment,
            tone: summary.underTreatment ? "watch" : "quiet",
          },
          {
            label: "hospitalisés",
            value: summary.hospitalized,
            tone: summary.hospitalized ? "watch" : "quiet",
          },
        ]}
      />
      <KpiSegments
        caption="Situation des dossiers actifs"
        segments={[
          {
            label: "Hospitalisés",
            value: rows.filter((row) => row.hospitalized).length,
            color: "var(--clinical-amber)",
          },
          {
            label: "Sous traitement",
            value: rows.filter(
              (row) => !row.hospitalized && row.patient.status === "traitement"
            ).length,
            color: "var(--primary)",
          },
          {
            label: "Autres dossiers",
            value: rows.filter(
              (row) => !row.hospitalized && row.patient.status !== "traitement"
            ).length,
            color: "var(--clinical-green)",
          },
        ]}
      />
      {rows.length ? (
        <div className="divide-y divide-hairline">
          {rows.slice(0, 3).map(({ patient, ownerName, hospitalized }) => (
            <button
              className={`flex w-full items-center gap-3 rounded-control py-3 text-left transition-colors duration-150 hover:bg-frame ${focusRing}`}
              data-row-id={patient.id}
              key={patient.id}
              onBlur={onIntentCancel}
              onClick={() => onPatient(patient.id)}
              onFocus={onIntent}
              onPointerEnter={onIntent}
              onPointerLeave={onIntentCancel}
              type="button"
            >
              <PatientPortrait patient={patient} />
              <span className="min-w-0 flex-1">
                <span className="t-13 block truncate font-medium">
                  {patient.name}
                </span>
                <span className="t-12 mt-1 block truncate text-ink-muted">
                  {patient.species} · {ownerName}
                </span>
              </span>
              <SignalBadge
                tone={
                  hospitalized || patient.status === "traitement"
                    ? "watch"
                    : "quiet"
                }
              >
                {hospitalized
                  ? "Hospitalisé"
                  : patient.status === "traitement"
                    ? "Traitement"
                    : "Dossier actif"}
              </SignalBadge>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          action={
            <ModuleLink onClick={onPatients}>Ouvrir les patients</ModuleLink>
          }
          compact
          description="Créez un patient pour relier ses visites, ses notes et son suivi."
          title="Le premier dossier commence ici"
        />
      )}
      {rows.length > 3 && (
        <div className="t-12 mt-1 border-hairline border-t pt-3 text-ink-muted">
          {rows.length - 3} autre{rows.length - 3 > 1 ? "s" : ""} dossier
          {rows.length - 3 > 1 ? "s" : ""} dans la bibliothèque patients
        </div>
      )}
    </WidgetShell>
  );
}
