import { openPatientPeek } from "../pages/patient-peek";
import {
  Add01Icon,
  BirdIcon,
  Calendar01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  StethoscopeIcon,
  ViewIcon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { speciesIcon } from "@/lib/species-icon";

import React from "react";

import MotivationalHeader from "@/components/MotivationalHeader";
import { FormDialogHeader } from "@/components/ui/form-dialog";

import { SectionCards } from "@/components/section-cards";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

import { ListFilter, ListSearch } from "@/components/ui/list-controls";
import { Spinner } from "@/components/ui/spinner";

import { PATIENT_STATUS_META } from "@/config/status-meta";

import { cn } from "@/lib/utils";

import {
  formatOwnerName,
  formatPatientDate,
  formatVisitTimeRange,
  getAgeLabel,
  PatientStatusBadge,
  PatientDetailsDialog,
  PatientCreateDialog,
} from "@/modules/patients/components/patients-shared";
import { useListCursor } from "@/hooks/useListCursor";
import { ShortcutTooltip } from "@/design-system/patterns/shortcut-tooltip";
import { EmptyMascot } from "@/components/mascot/empty-mascot";
import { Kbd } from "@/components/ui/kbd";
import type { PatientsViewProps } from "../hooks/use-patients-page-model";
import "../patients-list.css";
import {
  clinicalFlags,
  PATIENT_SORT_OPTIONS,
  type PatientSort,
} from "../lib/patient-list";
import type { Patient } from "@/types/db";

/** Allergies and chronic conditions already entered, beside the name. */
function ClinicalFlagPills({ patient }: { patient: Patient }) {
  const flags = clinicalFlags(patient);
  if (flags.length === 0) {
    return null;
  }
  const [first, ...hidden] = flags;
  return (
    <span className="patients-flags">
      <span
        className="patients-flag truncate"
        data-kind={first.kind}
        title={first.label}
      >
        {first.kind === "allergy" ? `Allergie : ${first.label}` : first.label}
      </span>
      {hidden.length > 0 ? (
        <span className="patients-flag" data-kind="more" title={hidden.map((flag) => flag.label).join(", ")}>
          +{hidden.length}
        </span>
      ) : null}
    </span>
  );
}

/** The species as a round, tinted avatar, one hue per family. */
function SpeciesAvatar({ species }: { species?: string }) {
  const { icon: Icon, tone } = speciesIcon(species);
  return (
    <span aria-hidden="true" className="patients-species" data-tone={tone}>
      <Icon strokeWidth={1.5} />
    </span>
  );
}

/** Space toggles the peek; the arrows make it follow the cursor. */
function peekFromList(id: string, reason: "key" | "follow") {
  openPatientPeek(id, { follow: true, toggle: reason === "key" });
}

export function PatientsView(props: PatientsViewProps) {
  const {
    appointments,
    audit,
    createAppointmentForPatient,
    createdPatientPrompt,
    currentPage,
    detailsInitialTab,
    filtersActive,
    handleCreatePatient,
    handlePatientSaved,
    hydratedOwners,
    isCreateOpen,
    loadingPatients,
    onNavigateToPatient,
    openPatientDetails,
    owners,
    ownersMap,
    pageEnd,
    pageStart,
    paginatedPatients,
    paginationRange,
    patientsError,
    refreshPatients,
    resetFilters,
    searchTerm,
    sectionCards,
    selectedPatient,
    setCreatedPatientPrompt,
    setCurrentPage,
    setDetailsInitialTab,
    setIsCreateOpen,
    setSearchTerm,
    setSelectedPatientId,
    setSortKey,
    setSpeciesFilter,
    setStatusFilter,
    speciesFilter,
    sortKey,
    speciesOptions,
    statusFilter,
    totalPages,
    transactions,
    updateOwner,
    updatePatient,
    users,
    visiblePatients,
  } = props;
  const listRef = useListCursor({ storageKey: "patients", onPeek: peekFromList });
  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-6 px-4 pt-8 pb-8 lg:px-6">
      <MotivationalHeader section="patients"
        actions={<>
          <Button
            className="h-9 px-4"
            onClick={() => setIsCreateOpen(true)}
          >
            <HugeiconsIcon
              data-icon="inline-start"
              icon={Add01Icon}
              strokeWidth={1.5}
            />
            Nouveau patient
          </Button>
        </>}
      />

      <SectionCards items={sectionCards} />

      <div className="min-h-0 flex-1">
        <Card className="surface-card min-h-[480px] border-0">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-0 pb-0">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-4">
              <ListSearch className="w-full sm:w-72" label="Rechercher les patients" placeholder="Nom ou propriétaire…" value={searchTerm} onValueChange={setSearchTerm} />
              <ListFilter label="Espèce" value={speciesFilter} onValueChange={setSpeciesFilter} options={[{ value: "all", label: "Toutes" }, ...speciesOptions.map(value => ({ value, label: value }))]} />
              <ListFilter label="Statut" value={statusFilter} onValueChange={setStatusFilter} options={[{ value: "all", label: "Tous" }, ...Object.entries(PATIENT_STATUS_META).map(([value, option]) => ({ value, label: option.label }))]} />
              <ListFilter label="Trier par" value={sortKey} onValueChange={value => setSortKey(value as PatientSort)} options={PATIENT_SORT_OPTIONS} />
              <Button variant="outline" className="ml-auto h-[30px] t-12" disabled={!filtersActive} onClick={resetFilters}>Réinitialiser les filtres</Button>
            </div>

            {loadingPatients ? (
              <div className="flex flex-1 items-center justify-center py-16">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            ) : patientsError ? (
              <div className="flex flex-1 px-6 pb-6">
                <Empty className="border border-border/80 border-dashed bg-muted/20">
                  <EmptyHeader>
                    <EmptyTitle>Les dossiers sont indisponibles</EmptyTitle>
                    <EmptyDescription>
                      La base de données n'a pas pu être lue. Vérifiez
                      l'application puis réessayez.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent className="sm:flex-row">
                    <Button
                      onClick={() => void refreshPatients()}
                      variant="outline"
                    >
                      Réessayer
                    </Button>
                  </EmptyContent>
                </Empty>
              </div>
            ) : visiblePatients.length === 0 ? (
              <div className="flex flex-1 px-6 pb-6">
                <Empty className="border border-border/80 border-dashed bg-muted/20">
                  <EmptyHeader>
                    <EmptyMascot
                      icon={<HugeiconsIcon icon={BirdIcon} strokeWidth={1.5} />}
                    />
                    <EmptyTitle>Aucun dossier dans cette vue</EmptyTitle>
                    <EmptyDescription>
                      Ajustez la recherche ou les filtres, ou créez un nouveau
                      patient pour enrichir la base.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent className="sm:flex-row">
                    <Button onClick={resetFilters} variant="outline">
                      Réinitialiser les filtres
                    </Button>
                    <Button onClick={() => setIsCreateOpen(true)}>
                      <HugeiconsIcon
                        data-icon="inline-start"
                        icon={Add01Icon}
                        strokeWidth={1.5}
                      />
                      {searchTerm.trim() ? (
                        "Créer avec cette recherche"
                      ) : (
                        <>
                          Nouveau patient
                          <Kbd className="ml-1 bg-white/15 text-current">⌘ N</Kbd>
                        </>
                      )}
                    </Button>
                  </EmptyContent>
                </Empty>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col px-6 pt-2 pb-6">
                <div className="patients-table-wrap flex-1 overflow-auto bg-surface" ref={listRef}>
                  <table className="medical-data-table patients-table min-w-full border-separate border-spacing-0 text-left">
                    <colgroup>
                      <col className="patients-col-patient" />
                      <col className="patients-col-owner" />
                      <col className="patients-col-status" />
                      <col className="patients-col-last" />
                      <col className="patients-col-next" />
                      <col className="patients-col-open" />
                    </colgroup>
                    <thead>
                      <tr>
                        {[
                          ["Patient", "patients-col-patient"],
                          ["Propriétaire", "patients-col-owner"],
                          ["Statut", "patients-col-status"],
                          ["Dernière visite", "patients-col-last"],
                          ["Prochain rendez-vous", "patients-col-next"],
                        ].map(([label, column]) => (
                          <th className={cn("sticky top-0 z-10 whitespace-nowrap px-3 py-3", column)} key={label} scope="col">
                            {label}
                          </th>
                        ))}
                        <th className="patients-col-open sticky top-0 z-10 py-3 pr-6 pl-3" scope="col">
                          <span className="sr-only">Ouvrir</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPatients.map((entry) => {
                        const { patient } = entry;
                        const details = [
                          patient.species,
                          patient.breed,
                          patient.sex === "F" ? "Femelle" : "Mâle",
                          patient.dateOfBirth ? getAgeLabel(patient.dateOfBirth) : null,
                        ].filter(Boolean).join(" · ");
                        const openRecord = () => {
                          if (onNavigateToPatient) {
                            onNavigateToPatient(patient.id);
                          } else {
                            openPatientDetails(patient, "info");
                          }
                        };

                        return (
                          <tr
                            aria-label={`Ouvrir le dossier de ${patient.name}`}
                            className="group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                            data-list-row=""
                            data-row-id={patient.id}
                            key={patient.id}
                            onClick={openRecord}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) {
                                return;
                              }
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openRecord();
                              }
                            }}
                            tabIndex={0}
                          >
                            {/* Patient : espèce, nom et alertes, puis race, sexe et âge */}
                            <td className="patients-col-patient py-4 pr-3 pl-6">
                              <div className="flex min-w-0 items-center gap-3">
                                <SpeciesAvatar species={patient.species} />
                                <span className="patients-cell-stack min-w-0">
                                  <span className="patients-name-line">
                                    <span className="patients-name truncate capitalize">{patient.name}</span>
                                    <ClinicalFlagPills patient={patient} />
                                  </span>
                                  <span className="patients-cell-sub truncate">{details}</span>
                                </span>
                              </div>
                            </td>

                            {/* Propriétaire et téléphone */}
                            <td className="patients-col-owner px-3 py-4">
                              <span className="patients-cell-stack">
                                <span className="patients-cell-main truncate capitalize">
                                  {formatOwnerName(entry.owner)}
                                </span>
                                {entry.owner?.phone ? (
                                  <span className="patients-cell-sub truncate tabular-nums">{entry.owner.phone}</span>
                                ) : null}
                              </span>
                            </td>

                            {/* Statut */}
                            <td className="patients-col-status whitespace-nowrap px-3 py-4">
                              <PatientStatusBadge status={patient.status} />
                            </td>

                            {/* Dernière visite */}
                            <td className="patients-col-last whitespace-nowrap px-3 py-4 tabular-nums">
                              {entry.lastVisit ? (
                                <span className="patients-cell-main">{formatPatientDate(entry.lastVisit)}</span>
                              ) : (
                                <span className="patients-cell-sub">Aucune</span>
                              )}
                            </td>

                            {/* Prochain rendez-vous : la date, l'heure dessous */}
                            <td className="patients-col-next whitespace-nowrap px-3 py-4 tabular-nums">
                              {entry.upcomingAppointment ? (
                                <span className="patients-cell-stack">
                                  <span className="patients-cell-main">
                                    {formatPatientDate(entry.upcomingAppointment.startTime)}
                                  </span>
                                  <span className="patients-cell-sub">
                                    {formatVisitTimeRange(entry.upcomingAppointment.startTime)}
                                  </span>
                                </span>
                              ) : (
                                <span className="patients-cell-sub">Aucun</span>
                              )}
                            </td>

                            {/* Ouvrir : l'aperçu au survol, et le dossier lui-même */}
                            <td className="patients-col-open whitespace-nowrap py-4 pr-6 pl-3">
                              <div className="flex items-center justify-end gap-1">
                                <span data-row-reveal="">
                                  <ShortcutTooltip label="Aperçu du dossier" shortcut="Espace ou A">
                                    <Button
                                      className="size-8 rounded-full bg-transparent text-muted-foreground"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openPatientPeek(patient.id, { follow: true });
                                      }}
                                      size="icon"
                                      variant="ghost"
                                    >
                                      <HugeiconsIcon className="size-4" icon={ViewIcon} strokeWidth={1.5} />
                                      <span className="sr-only">Aperçu du dossier médical</span>
                                    </Button>
                                  </ShortcutTooltip>
                                </span>
                                {onNavigateToPatient && (
                                  <ShortcutTooltip label="Ouvrir le dossier" shortcut="Entrée">
                                    <button
                                      className="patients-open-link"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        onNavigateToPatient(patient.id);
                                      }}
                                      type="button"
                                    >
                                      Ouvrir
                                      <HugeiconsIcon
                                        aria-hidden="true"
                                        className="patients-open-arrow size-4"
                                        icon={ArrowRight01Icon}
                                        strokeWidth={1.5}
                                      />
                                      <span className="sr-only"> le dossier de {patient.name}</span>
                                    </button>
                                  </ShortcutTooltip>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 px-5 pt-4 pb-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-muted-foreground text-sm">
                    Affichage de{" "}
                    <span className="font-medium text-foreground">
                      {pageStart}
                    </span>{" "}
                    à{" "}
                    <span className="font-medium text-foreground">
                      {pageEnd}
                    </span>{" "}
                    sur{" "}
                    <span className="font-medium text-foreground">
                      {visiblePatients.length}
                    </span>{" "}
                    dossier
                    {visiblePatients.length > 1 ? "s" : ""}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      className="h-9 rounded-full px-4"
                      disabled={currentPage === 1}
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      size="sm"
                      variant="outline"
                    >
                      Précédent
                    </Button>

                    {paginationRange.map((page, index) => {
                      const previousPage = paginationRange[index - 1];
                      const shouldRenderGap =
                        previousPage !== undefined && page - previousPage > 1;

                      return (
                        <React.Fragment key={page}>
                          {shouldRenderGap ? (
                            <span className="px-1 text-muted-foreground text-sm">
                              …
                            </span>
                          ) : null}
                          <Button
                            className="h-9 min-w-9 rounded-full px-3"
                            onClick={() => setCurrentPage(page)}
                            size="sm"
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      );
                    })}

                    <Button
                      className="h-9 rounded-full px-4"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                      size="sm"
                      variant="outline"
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedPatient ? (
        <PatientDetailsDialog
          users={users}
          transactions={transactions}
          allOwners={hydratedOwners}
          appointments={appointments}
          initialTab={detailsInitialTab}
          onClose={() => setSelectedPatientId(null)}
          onSaved={handlePatientSaved}
          onUpdateOwner={updateOwner}
          onUpdatePatient={async (patientId, updates) => {
            const result = await updatePatient(patientId, updates);
            await audit.log({
              action: "update",
              entity: "patient",
              entityId: patientId,
              payload: { fields: Object.keys(updates) },
            });
            return result;
          }}
          owner={ownersMap.get(selectedPatient.ownerId)}
          patient={selectedPatient}
        />
      ) : null}

      <PatientCreateDialog
        onCreate={handleCreatePatient}
        onOpenChange={setIsCreateOpen}
        open={isCreateOpen}
        owners={owners}
      />

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setCreatedPatientPrompt(null);
          }
        }}
        open={!!createdPatientPrompt}
      >
        <DialogContent className="modal-medical-shell gap-0 w-full max-w-[min(560px,calc(100%-2rem))] overflow-hidden p-0 sm:max-w-[560px]">
          <FormDialogHeader
            compact
            artwork="patient-created"
            title={createdPatientPrompt?.patient.name}
            description="Dossier créé"
            icon={
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={1.5} />
            }
          />
          <div className="modal-medical-footer flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
            <Button
              className="sm:mr-auto"
              onClick={() => setCreatedPatientPrompt(null)}
              type="button"
              variant="ghost"
            >
              Fermer
            </Button>
            <Button
              onClick={() => {
                if (createdPatientPrompt) {
                  setDetailsInitialTab("info");
                  setSelectedPatientId(createdPatientPrompt.patient.id);
                }
                setCreatedPatientPrompt(null);
              }}
              type="button"
              variant="outline"
            >
              <HugeiconsIcon
                data-icon="inline-start"
                icon={StethoscopeIcon}
                strokeWidth={1.5}
              />
              Voir le dossier
            </Button>
            <Button
              onClick={() => {
                if (createdPatientPrompt) {
                  createAppointmentForPatient(createdPatientPrompt.patient);
                }
              }}
              type="button"
            >
              <HugeiconsIcon
                data-icon="inline-start"
                icon={Calendar01Icon}
                strokeWidth={1.5}
              />
              Créer un RDV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
