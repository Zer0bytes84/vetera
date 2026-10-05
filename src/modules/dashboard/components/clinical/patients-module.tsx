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
      className="clinical-module clinical-patients-module"
      title="Suivi des patients"
      subtitle="Soins en cours, puis dossiers récemment suivis"
      actions={<ModuleLink onClick={onPatients}>Dossiers</ModuleLink>}
      pending={state.loading}
      showSkeleton={state.skeleton}
      error={state.error}
      onRetry={state.retry}
      skeleton={<RowSkeleton />}
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
              type="button"
              key={patient.id}
              data-row-id={patient.id}
              onPointerEnter={onIntent}
              onFocus={onIntent}
              onPointerLeave={onIntentCancel}
              onBlur={onIntentCancel}
              className={`flex w-full items-center gap-3 rounded-control py-3 text-left transition-colors duration-150 hover:bg-frame ${focusRing}`}
              onClick={() => onPatient(patient.id)}
            >
              <PatientPortrait patient={patient} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                  {patient.name}
                </span>
                <span className="mt-1 block truncate text-[11px] text-ink-muted">
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
          compact
          title="Le premier dossier commence ici"
          description="Créez un patient pour relier ses visites, ses notes et son suivi."
          action={
            <ModuleLink onClick={onPatients}>Ouvrir les patients</ModuleLink>
          }
        />
      )}
      {rows.length > 3 && (
        <div className="mt-1 border-t border-hairline pt-3 text-[11px] text-ink-muted">
          {rows.length - 3} autre{rows.length - 3 > 1 ? "s" : ""} dossier
          {rows.length - 3 > 1 ? "s" : ""} dans la bibliothèque patients
        </div>
      )}
    </WidgetShell>
  );
}
