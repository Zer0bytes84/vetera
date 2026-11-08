import { FolderOpen, Users } from "lucide-react";
import type { ReactNode, Ref } from "react";
import {
  DataTable,
  type DataColumn,
  type DataRow,
} from "@/components/ui/data-table";
import { IconButton, QuietButton } from "@/components/ui/tuff-controls";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { PATIENT_STATUS_META } from "@/config/status-meta";
import { speciesIcon } from "@/lib/species-icon";
import {
  formatOwnerName,
  formatPatientDate,
  formatVisitTimeRange,
  getAgeLabel,
} from "@/modules/patients/components/patients-shared";
import { clinicalFlags } from "../lib/patient-list";
import type { PatientsViewProps } from "../hooks/use-patients-page-model";
import type { Patient } from "@/types/db";

type PatientRecord = PatientsViewProps["visiblePatients"][number];

/**
 * The patients' list as TuffUI's Data Table: sortable columns, a filter field, pages, a selection, a CSV export, the status
 * as a pill. Each row opens the record; the eye opens the peek, and the list cursor (arrows, Space) still walks the rows.
 */

interface PatientRow extends DataRow {
  patient: string;
  owner: string;
  status: string;
  last: string;
  next: string;
  open: string;
}

const STATUS_TONE: Record<Patient["status"], StatusTone> = {
  sante: "positive",
  traitement: "brand",
  hospitalise: "warning",
  decede: "neutral",
};
/** The record's folder takes another hue on each row, in turn. */
const FOLDER_TONES = [
  "var(--tone-blue)",
  "var(--tone-green)",
  "var(--tone-violet)",
  "var(--tone-amber)",
  "var(--tone-rose)",
];
const SPECIES_TONE: Record<string, string> = {
  dog: "var(--tone-amber)",
  cat: "var(--tone-green)",
  nac: "var(--tone-blue)",
  wild: "var(--tone-rose)",
};

function SpeciesAvatar({ species }: { species?: string }) {
  const { icon: Icon, tone } = speciesIcon(species);
  const hue = SPECIES_TONE[tone] ?? "var(--muted-foreground)";
  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-full"
      style={{
        background: `color-mix(in oklab, ${hue} 16%, transparent)`,
        color: hue,
      }}
    >
      <Icon className="size-[18px]" strokeWidth={1.5} />
    </span>
  );
}

function Flags({ patient }: { patient: Patient }) {
  const flags = clinicalFlags(patient);
  if (!flags.length) return null;
  const [first, ...more] = flags;
  return (
    <>
      <StatusPill
        className="max-w-48 truncate"
        size="sm"
        tone={first.kind === "allergy" ? "negative" : "warning"}
      >
        {first.kind === "allergy" ? `Allergie : ${first.label}` : first.label}
      </StatusPill>
      {more.length > 0 && (
        <StatusPill size="sm" tone="neutral">
          +{more.length}
        </StatusPill>
      )}
    </>
  );
}

export function PatientsTable({
  entries,
  filters,
  filtersActive,
  onResetFilters,
  onOpen,
  listRef,
}: {
  entries: PatientRecord[];
  filters: ReactNode;
  filtersActive: boolean;
  onResetFilters: () => void;
  onOpen: (patient: Patient) => void;
  listRef: Ref<HTMLDivElement>;
}) {
  const byId = new Map(entries.map((entry) => [entry.patient.id, entry]));
  const rows: PatientRow[] = entries.map(
    ({ patient, owner, lastVisit, upcomingAppointment }) => ({
      id: patient.id,
      patient: patient.name,
      owner: formatOwnerName(owner),
      status: PATIENT_STATUS_META[patient.status]?.label ?? patient.status,
      last: lastVisit ?? "",
      next: upcomingAppointment?.startTime ?? "",
      open: "",
    }),
  );

  const columns: DataColumn<PatientRow>[] = [
    {
      key: "patient",
      label: "Patient",
      sortable: true,
      format: (_, row) => {
        const { patient } = byId.get(row.id)!;
        const details = [
          patient.species,
          patient.breed,
          patient.sex === "F" ? "Femelle" : "Mâle",
          patient.dateOfBirth ? getAgeLabel(patient.dateOfBirth) : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <div className="flex min-w-0 items-center gap-3">
            <SpeciesAvatar species={patient.species} />
            <span className="min-w-0">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium capitalize text-foreground">
                  {patient.name}
                </span>
                <Flags patient={patient} />
              </span>
              <span className="block max-w-56 truncate text-[0.8125rem] text-muted-foreground">
                {details}
              </span>
            </span>
          </div>
        );
      },
    },
    {
      key: "owner",
      label: "Propriétaire",
      sortable: true,
      format: (_, row) => {
        const { owner } = byId.get(row.id)!;
        return (
          <span className="block min-w-0">
            <span className="block truncate text-sm capitalize text-foreground">
              {formatOwnerName(owner)}
            </span>
            {owner?.phone ? (
              <span className="block truncate text-[0.8125rem] text-muted-foreground tabular-nums">
                {owner.phone}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Statut",
      sortable: true,
      format: (_, row) => {
        const { patient } = byId.get(row.id)!;
        return (
          <StatusPill tone={STATUS_TONE[patient.status] ?? "neutral"}>
            {PATIENT_STATUS_META[patient.status]?.label ?? patient.status}
          </StatusPill>
        );
      },
    },
    {
      key: "last",
      label: "Dernière visite",
      sortable: true,
      format: (value) =>
        value ? (
          <span className="tabular-nums text-foreground">
            {formatPatientDate(String(value))}
          </span>
        ) : (
          <span className="text-muted-foreground">Aucune</span>
        ),
    },
    {
      key: "next",
      label: "Prochain rendez-vous",
      sortable: true,
      priority: 3,
      format: (value) =>
        value ? (
          <span className="block tabular-nums">
            <span className="block text-foreground">
              {formatPatientDate(String(value))}
            </span>
            <span className="block text-muted-foreground">
              {formatVisitTimeRange(String(value))}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Aucun</span>
        ),
    },
    {
      key: "open",
      label: "Ouvrir",
      hideLabel: true,
      noExport: true,
      priority: 1,
      align: "left",
      format: (_, row) => {
        const { patient } = byId.get(row.id)!;
        return (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(event) => event.stopPropagation()}
          >
            <IconButton
              icon={FolderOpen}
              label={`Ouvrir le dossier de ${patient.name}`}
              onClick={() => onOpen(patient)}
              style={{
                color:
                  FOLDER_TONES[
                    entries.findIndex(
                      (entry) => entry.patient.id === patient.id,
                    ) % FOLDER_TONES.length
                  ],
              }}
            />
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      containerRef={listRef}
      data={rows}
      emptyAction={
        filtersActive ? (
          <QuietButton onClick={onResetFilters}>
            Réinitialiser les filtres
          </QuietButton>
        ) : undefined
      }
      emptyDescription="Créez un patient pour enrichir la base."
      emptyTitle="Aucun dossier dans cette vue"
      exportName="patients"
      filters={
        <>
          {filters}
          {filtersActive && (
            <QuietButton onClick={onResetFilters}>Réinitialiser</QuietButton>
          )}
        </>
      }
      icon={Users}
      noun={["dossier", "dossiers"]}
      onRowClick={(row) => onOpen(byId.get(row.id)!.patient)}
      pageSize={10}
      rowProps={(row) => ({
        "aria-label": `Ouvrir le dossier de ${row.patient}`,
        tabIndex: 0,
        onKeyDown: (event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(byId.get(row.id)!.patient);
          }
        },
        ...({ "data-list-row": "", "data-row-id": row.id } as object),
      })}
      searchPlaceholder="Nom ou propriétaire"
      selectable
      title="Patients"
    />
  );
}
