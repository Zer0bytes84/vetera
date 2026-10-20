import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { FormDialogBody, FormDialogContent, FormDialogFooter, FormDialogHeader } from "@/components/ui/form-dialog";
import { Spinner } from "@/components/ui/spinner";
import { CheckmarkCircle02Icon, UserAdd01Icon } from "@/lib/hugeicons";
import { findDossiers } from "@/modules/agenda/quick-search";
import { PatientDossierSearch } from "@/modules/agenda/components/patient-dossier-search";
import type { Owner, Patient } from "@/types/db";

/**
 * A patient at the desk without a booking. Same dialog and same dossier
 * search as Nouveau RDV, so choosing a patient works the same everywhere.
 */
export function WalkInDialog({
  onConfirm,
  onOpenChange,
  open,
  owners,
  patients,
}: {
  onConfirm: (patient: Patient) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  owners: readonly Owner[];
  patients: readonly Patient[];
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const ownersById = useMemo(() => new Map(owners.map((owner) => [owner.id, owner])), [owners]);
  const matches = useMemo(() => findDossiers(patients, ownersById, query), [ownersById, patients, query]);
  const selected = patients.find((patient) => patient.id === selectedId);

  const close = (next: boolean) => {
    if (!next) {
      setQuery("");
      setSelectedId(undefined);
    }
    onOpenChange(next);
  };

  const confirm = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await onConfirm(selected);
      close(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog onOpenChange={close} open={open}>
      <FormDialogContent
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void confirm();
          }
        }}
        size="md"
      >
        <FormDialogHeader
          artwork="patient"
          description="Le patient passe directement en Attente."
          icon={<HugeiconsIcon icon={UserAdd01Icon} strokeWidth={1.5} />}
          title="Arrivée sans rendez-vous"
        />
        <FormDialogBody>
          <FieldGroup>
            <PatientDossierSearch
              autoFocus
              description="Choisissez le bon dossier : le propriétaire est affiché pour ne pas confondre deux animaux du même nom."
              matches={matches}
              onChange={(value) => {
                setQuery(value);
                setSelectedId(undefined);
              }}
              onSelect={setSelectedId}
              selectedPatientId={selectedId}
              value={query}
            />
          </FieldGroup>
        </FormDialogBody>
        <FormDialogFooter>
          <div className="modal-medical-actions w-full flex-col-reverse sm:w-auto sm:flex-row">
            <Button className="h-11 min-w-[132px] justify-center" onClick={() => close(false)} variant="outline">
              Annuler
            </Button>
            <Button className="h-11 min-w-[200px] justify-center shadow-sm" disabled={busy || !selected} onClick={() => void confirm()}>
              {busy ? <Spinner className="size-4" /> : <HugeiconsIcon data-icon="inline-start" icon={CheckmarkCircle02Icon} strokeWidth={1.5} />}
              <span>{selected ? `Mettre ${selected.name} en Attente` : "Mettre en Attente"}</span>
            </Button>
          </div>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
