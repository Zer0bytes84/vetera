import { UsersIcon } from "@heroicons/react/20/solid";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import MotivationalHeader from "@/components/MotivationalHeader";
import { SectionCards } from "@/components/section-cards";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { FormDialogHeader } from "@/components/ui/form-dialog";
import { ListFilter } from "@/components/ui/list-controls";
import { PATIENT_STATUS_META } from "@/config/status-meta";
import { useDelayedSkeleton } from "@/hooks/useDelayedSkeleton";
import { useListCursor } from "@/hooks/useListCursor";
import {
  Add01Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  StethoscopeIcon,
} from "@/lib/hugeicons";
import {
  PatientCreateDialog,
  PatientDetailsDialog,
} from "@/modules/patients/components/patients-shared";
import type { PatientsViewProps } from "../hooks/use-patients-page-model";
import { OwnerContactDialog } from "./owner-contact-dialog";
import { PatientsTable } from "./patients-table";
import "../patients-list.css";

export function PatientsView(props: PatientsViewProps) {
  const {
    appointments,
    audit,
    createAppointmentForPatient,
    createdPatientPrompt,
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
    patientsError,
    refreshPatients,
    resetFilters,
    sectionCards,
    sectionCardsLoading,
    selectedPatient,
    setCreatedPatientPrompt,
    setDetailsInitialTab,
    setIsCreateOpen,
    setSelectedPatientId,
    setSpeciesFilter,
    setStatusFilter,
    setArchiveFilter,
    archiveFilter,
    speciesFilter,
    speciesOptions,
    statusFilter,
    transactions,
    updateOwner,
    updatePatient,
    users,
    visiblePatients,
  } = props;
  // The owner whose details are being corrected from the list's pencil, read fresh from the owners on every render.
  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);
  const editingOwner = editingOwnerId
    ? ownersMap.get(editingOwnerId)
    : undefined;
  const listRef = useListCursor({ storageKey: "patients" });
  // Reserved at once, revealed after 150 ms and kept 300 ms, as the band above: no flash on a fast read.
  const listSkeleton = useDelayedSkeleton(loadingPatients);
  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-6 px-4 pb-8 lg:px-6">
      <MotivationalHeader section="patients" />

      <SectionCards
        actions={
          <Button
            className="h-9 rounded-full px-4"
            onClick={() => setIsCreateOpen(true)}
          >
            <HugeiconsIcon
              data-icon="inline-start"
              icon={Add01Icon}
              strokeWidth={1.5}
            />
            Nouveau patient
          </Button>
        }
        icon={UsersIcon}
        items={sectionCards}
        loading={sectionCardsLoading}
        subtitle="Dossiers et suivi clinique"
      />

      {patientsError ? (
        <div className="flex flex-1">
          <Empty className="border border-border/80 border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyTitle>Les dossiers sont indisponibles</EmptyTitle>
              <EmptyDescription>
                La base de données n'a pas pu être lue. Vérifiez l'application
                puis réessayez.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="sm:flex-row">
              <Button onClick={() => void refreshPatients()} variant="outline">
                Réessayer
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <PatientsTable
          entries={visiblePatients}
          filters={
            <>
              <ListFilter
                label="Espèce"
                onValueChange={setSpeciesFilter}
                options={[
                  { value: "all", label: "Toutes" },
                  ...speciesOptions.map((value) => ({ value, label: value })),
                ]}
                value={speciesFilter}
              />
              <ListFilter
                label="Statut"
                onValueChange={setStatusFilter}
                options={[
                  { value: "all", label: "Tous" },
                  ...Object.entries(PATIENT_STATUS_META).map(
                    ([value, option]) => ({ value, label: option.label })
                  ),
                ]}
                value={statusFilter}
              />
              <ListFilter
                label="Dossiers"
                onValueChange={setArchiveFilter}
                options={[
                  { value: "active", label: "Actifs" },
                  { value: "archived", label: "Archivés" },
                  { value: "all", label: "Tous" },
                ]}
                value={archiveFilter}
              />
            </>
          }
          filtersActive={filtersActive}
          listRef={listRef}
          loading={loadingPatients || listSkeleton}
          loadingRevealed={listSkeleton}
          onEditOwner={(owner) => setEditingOwnerId(owner.id)}
          onOpen={(patient) =>
            onNavigateToPatient
              ? onNavigateToPatient(patient.id)
              : openPatientDetails(patient, "info")
          }
          onResetFilters={resetFilters}
        />
      )}

      {selectedPatient ? (
        <PatientDetailsDialog
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
          transactions={transactions}
          users={users}
        />
      ) : null}

      {editingOwner ? (
        <OwnerContactDialog
          key={editingOwner.id}
          onClose={() => setEditingOwnerId(null)}
          onUpdate={updateOwner}
          owner={editingOwner}
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
        <DialogContent className="max-w-[min(560px,calc(100%-2rem))] sm:max-w-[560px]">
          <FormDialogHeader
            description="Dossier créé"
            icon={
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={1.5} />
            }
            title={createdPatientPrompt?.patient.name}
          />
          <DialogFooter>
            <Button
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
