import { openPatientPeek } from "../pages/patient-peek";
import {
  Add01Icon,
  BirdIcon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  Folder01Icon,
  StethoscopeIcon,
  ViewIcon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";

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
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { ListFilter, ListSearch } from "@/components/ui/list-controls";
import { Spinner } from "@/components/ui/spinner";

import { PATIENT_STATUS_META } from "@/config/status-meta";

import { cn } from "@/lib/utils";

import {
  formatOwnerName,
  formatPatientDate,
  getSpeciesIcon,
  PatientStatusBadge,
  PatientDetailsDialog,
  PatientCreateDialog,
} from "@/modules/patients/components/patients-shared";
import type { PatientsViewProps } from "../hooks/use-patients-page-model";

export function PatientsView(props: PatientsViewProps) {
  const {
    appointments,
    audit,
    createAppointmentForPatient,
    createdPatientPrompt,
    currentPage,
    detailsInitialTab,
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
    setSpeciesFilter,
    setStatusFilter,
    speciesFilter,
    speciesOptions,
    statusFilter,
    totalPages,
    transactions,
    updateOwner,
    updatePatient,
    users,
    visiblePatients,
  } = props;
  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-6 px-4 pt-8 pb-8 lg:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <MotivationalHeader section="patients" />
        <div data-slot="page-header-actions" className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            className="h-10 rounded-full px-5 text-sm"
            onClick={resetFilters}
            variant="outline"
          >
            Réinitialiser
          </Button>
          <Button
            className="h-10 rounded-full px-5 text-sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <HugeiconsIcon
              data-icon="inline-start"
              icon={Add01Icon}
              strokeWidth={1.5}
            />
            Nouveau patient
          </Button>
        </div>
      </div>

      <SectionCards items={sectionCards} />

      <div className="min-h-0 flex-1">
        <Card className="surface-card min-h-[480px] border-0">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-0 pb-0">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-4">
              <ListSearch className="w-full sm:w-72" label="Rechercher les patients" placeholder="Nom ou propriétaire…" value={searchTerm} onValueChange={setSearchTerm} />
              <ListFilter label="Espèce" value={speciesFilter} onValueChange={setSpeciesFilter} options={[{ value: "all", label: "Toutes" }, ...speciesOptions.map(value => ({ value, label: value }))]} />
              <ListFilter label="Statut" value={statusFilter} onValueChange={setStatusFilter} options={[{ value: "all", label: "Tous" }, ...Object.entries(PATIENT_STATUS_META).map(([value, option]) => ({ value, label: option.label }))]} />
              {(searchTerm || speciesFilter !== "all" || statusFilter !== "all") && <Button variant="ghost" className="h-[30px] text-xs text-muted-foreground" onClick={resetFilters}>Réinitialiser</Button>}
            </div>

            {loadingPatients ? (
              <div className="flex flex-1 items-center justify-center py-16">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            ) : visiblePatients.length === 0 ? (
              <div className="flex flex-1 px-6 pb-6">
                <Empty className="border border-border/80 border-dashed bg-muted/20">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={BirdIcon} strokeWidth={1.5} />
                    </EmptyMedia>
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
                      {searchTerm.trim()
                        ? "Créer avec cette recherche"
                        : "Nouveau patient"}
                    </Button>
                  </EmptyContent>
                </Empty>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col px-6 pt-2 pb-6">
                <div className="flex-1 overflow-auto rounded-2xl border border-zinc-200/60 bg-surface dark:border-white/[0.04]">
                  <table className="medical-data-table min-w-full border-separate border-spacing-0 text-left">
                    <thead className="bg-zinc-50/50 dark:bg-zinc-900/30">
                      <tr className="font-medium text-xs text-muted-foreground">
                        <th
                          className="sticky top-0 z-10 whitespace-nowrap border-zinc-200/50 border-b bg-zinc-50/95 py-3.5 pr-3 pl-6 backdrop-blur-sm dark:border-white/[0.04] dark:bg-zinc-900/90"
                          scope="col"
                        >
                          Patient
                        </th>
                        <th
                          className="sticky top-0 z-10 whitespace-nowrap border-zinc-200/50 border-b bg-zinc-50/95 px-3 py-3.5 backdrop-blur-sm dark:border-white/[0.04] dark:bg-zinc-900/90"
                          scope="col"
                        >
                          Propriétaire
                        </th>
                        <th
                          className="sticky top-0 z-10 whitespace-nowrap border-zinc-200/50 border-b bg-zinc-50/95 px-3 py-3.5 backdrop-blur-sm dark:border-white/[0.04] dark:bg-zinc-900/90"
                          scope="col"
                        >
                          Statut
                        </th>
                        <th
                          className="sticky top-0 z-10 whitespace-nowrap border-zinc-200/50 border-b bg-zinc-50/95 px-3 py-3.5 backdrop-blur-sm dark:border-white/[0.04] dark:bg-zinc-900/90"
                          scope="col"
                        >
                          Dernière visite
                        </th>
                        <th
                          className="relative sticky top-0 z-10 whitespace-nowrap border-zinc-200/50 border-b bg-zinc-50/95 py-3.5 pr-6 pl-3 text-right backdrop-blur-sm dark:border-white/[0.04] dark:bg-zinc-900/90"
                          scope="col"
                        >
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="">
                      {paginatedPatients.map((entry, index) => {
                        const isLast = index === paginatedPatients.length - 1;
                        const borderClass = isLast
                          ? ""
                          : "border-b border-zinc-200/50 dark:border-white/[0.04]";

                        return (
                          <tr
                            aria-label={`Ouvrir le dossier de ${entry.patient.name}`}
                            className="group cursor-pointer transition-colors duration-150 hover:bg-zinc-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring dark:hover:bg-white/[0.02]"
                            data-row-id={entry.patient.id}
                            key={entry.patient.id}
                            onClick={() => {
                              if (onNavigateToPatient) {
                                onNavigateToPatient(entry.patient.id);
                              } else {
                                openPatientDetails(entry.patient, "info");
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) {
                                return;
                              }
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                if (onNavigateToPatient) {
                                  onNavigateToPatient(entry.patient.id);
                                } else {
                                  openPatientDetails(entry.patient, "info");
                                }
                              }
                            }}
                            tabIndex={0}
                          >
                            {/* Col 1: Patient Details */}
                            <td
                              className={cn(
                                "whitespace-nowrap py-4 pr-3 pl-6",
                                borderClass
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "flex size-10 shrink-0 items-center justify-center rounded-body bg-frame text-ink-muted"
                                  )}
                                >
                                  <HugeiconsIcon
                                    icon={getSpeciesIcon(entry.patient.species)}
                                    size={22}
                                    strokeWidth={1.5}
                                  />
                                </div>
                                <span className="font-semibold text-sm text-zinc-950 capitalize tracking-tight dark:text-white">
                                  {entry.patient.name}{" "}
                                  <span className="mt-0.5 block font-normal text-xs text-zinc-500 normal-case dark:text-zinc-400">
                                    {entry.patient.species}
                                    {entry.patient.breed
                                      ? ` - ${entry.patient.breed}`
                                      : ""}
                                  </span>
                                </span>
                              </div>
                            </td>

                            {/* Col 2: Owner Contact */}
                            <td
                              className={cn(
                                "whitespace-nowrap px-3 py-4 font-medium text-sm text-zinc-800 capitalize dark:text-zinc-200",
                                borderClass
                              )}
                            >
                              {formatOwnerName(entry.owner)}
                            </td>

                            {/* Col 3: Statut */}
                            <td
                              className={cn(
                                "whitespace-nowrap px-3 py-4",
                                borderClass
                              )}
                            >
                              <PatientStatusBadge
                                status={entry.patient.status}
                              />
                            </td>

                            {/* Col 4: Last Visit */}
                            <td
                              className={cn(
                                "whitespace-nowrap px-3 py-4 font-medium text-sm text-zinc-800 dark:text-zinc-200",
                                borderClass
                              )}
                            >
                              {formatPatientDate(entry.lastVisit) ===
                              "Date indisponible"
                                ? "-"
                                : formatPatientDate(entry.lastVisit)}
                            </td>

                            {/* Col 5: Actions */}
                            <td
                              className={cn(
                                "relative whitespace-nowrap py-4 pr-6 pl-3 text-right font-medium text-sm",
                                borderClass
                              )}
                            >
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  className="size-8 rounded-full bg-transparent text-muted-foreground hover:bg-zinc-100 hover:text-foreground dark:hover:bg-white/[0.04]"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openPatientPeek(entry.patient.id);
                                  }}
                                  size="icon"
                                  title="Aperçu du dossier médical"
                                  variant="ghost"
                                >
                                  <HugeiconsIcon
                                    className="size-4"
                                    icon={ViewIcon}
                                    strokeWidth={1.5}
                                  />
                                  <span className="sr-only">Aperçu du dossier médical</span>
                                </Button>
                                {onNavigateToPatient && (
                                  <Button
                                    className="size-8 rounded-full bg-transparent text-muted-foreground hover:bg-zinc-100 hover:text-foreground dark:hover:bg-white/[0.04]"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onNavigateToPatient(entry.patient.id);
                                    }}
                                    size="icon"
                                    title="Dossier"
                                    variant="ghost"
                                  >
                                    <HugeiconsIcon
                                      className="size-4"
                                      icon={Folder01Icon}
                                      strokeWidth={1.5}
                                    />
                                    <span className="sr-only">Dossier</span>
                                  </Button>
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
