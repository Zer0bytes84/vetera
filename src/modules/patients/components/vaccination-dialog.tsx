import { isTauriRuntime } from "@/services/browser-store";
import { generateId } from "@/services/sqlite/database";
import { emitSQLiteDataChanged } from "@/hooks/useSQLite";
import { MedicalReminderDialog } from "@/modules/patient-reminders/medical-reminder-dialog";
import { onMedicalActRecorded } from "@/modules/patient-reminders/on-medical-act-recorded";
import { patientRemindersService } from "@/modules/patient-reminders/service";
import type { MedicalReminderProposal } from "@/modules/patient-reminders/store";
import { announcePatientRemindersChanged } from "@/modules/patient-reminders/use-patient-reminders";
import { Plus, Syringe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
} from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { COMMON_VACCINES } from "@/config/status-meta";
import { useAuth } from "@/contexts/AuthContext";
import { useVaccinationsRepository } from "@/data/repositories";
import type { Vaccination } from "@/types/db";
import { toDateInputValue } from "./patients-shared";
import { DatePicker } from "@/components/ui/date-picker";

interface VaccinationDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  patientId: string;
  vaccination?: Vaccination | null;
}

export function VaccinationDialog({
  onOpenChange,
  open,
  patientId,
  vaccination,
}: VaccinationDialogProps) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const repo = useVaccinationsRepository();
  const isEditing = Boolean(vaccination?.id);

  const [vaccineName, setVaccineName] = useState("");
  const [vaccineType, setVaccineType] = useState("");
  const [administeredAt, setAdministeredAt] = useState(() =>
    toDateInputValue(new Date().toISOString()),
  );
  const [batchNumber, setBatchNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [notes, setNotes] = useState("");
  const [presetId, setPresetId] = useState("");
  const vaccinationDraftId = useRef("");
  const [proposal, setProposal] = useState<MedicalReminderProposal | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    vaccinationDraftId.current = vaccination?.id ?? generateId();
    setProposal(null);
    if (vaccination) {
      setVaccineName(vaccination.vaccineName ?? "");
      setVaccineType(vaccination.vaccineType ?? "");
      setAdministeredAt(toDateInputValue(vaccination.administeredAt));
      setBatchNumber(vaccination.batchNumber ?? "");
      setManufacturer(vaccination.manufacturer ?? "");
      setNotes(vaccination.notes ?? "");
      setPresetId("");
    } else {
      setVaccineName("");
      setVaccineType("");
      setAdministeredAt(toDateInputValue(new Date().toISOString()));
      setBatchNumber("");
      setManufacturer("");
      setNotes("");
      setPresetId("");
    }
  }, [open, vaccination]);

  const handlePresetChange = (value: string) => {
    setPresetId(value);
    if (value === "") {
      return;
    }
    const preset = COMMON_VACCINES.find((entry) => entry.type === value);
    if (!preset) {
      return;
    }
    setVaccineName(preset.label);
    setVaccineType(preset.type);
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    if (!vaccineName.trim()) {
      setError(t("patientDetail.vaccinations.invalidName"));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    let vaccinationSaved = false;
    try {
      const payload = {
        patientId,
        vaccineName: vaccineName.trim(),
        vaccineType: vaccineType.trim() || undefined,
        administeredAt: new Date(`${administeredAt}T12:00:00`).toISOString(),
        nextDueAt: vaccination?.nextDueAt,
        batchNumber: batchNumber.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        notes: notes.trim() || undefined,
        vetId: currentUser?.id,
      };
      if (isTauriRuntime()) {
        await patientRemindersService.saveVaccination(
          {
            id: vaccinationDraftId.current,
            patientId,
            vaccineName: vaccineName.trim(),
            vaccineType: vaccineType.trim() || undefined,
            administeredDate: administeredAt,
            dueDate: vaccination?.nextDueAt
              ? toDateInputValue(vaccination.nextDueAt)
              : undefined,
            batchNumber: batchNumber.trim() || undefined,
            manufacturer: manufacturer.trim() || undefined,
            notes: notes.trim() || undefined,
          },
          currentUser?.id ?? "",
        );
        vaccinationSaved = true;
        emitSQLiteDataChanged("vaccinations");
        announcePatientRemindersChanged();
        void repo.refresh().catch(() => {
          toast.warning(
            "La vaccination est enregistrée. Actualisez le carnet si nécessaire.",
          );
        });
        if (!isEditing) {
          const nextProposal = await onMedicalActRecorded(
            {
              date: administeredAt,
              id: vaccinationDraftId.current,
              note: notes.trim() || vaccineName.trim(),
              patientId,
              type: "vaccin",
            },
            patientRemindersService,
          );
          if (nextProposal) {
            setProposal(nextProposal);
            toast.success("Vaccination enregistrée");
            return;
          }
        }
      } else if (vaccination?.id) {
        const ok = await repo.update(vaccination.id, payload);
        if (!ok) {
          throw new Error("La vaccination n’a pas pu être modifiée.");
        }
      } else {
        const created = await repo.add(
          payload as unknown as Omit<
            Vaccination,
            "id" | "createdAt" | "updatedAt"
          >,
        );
        if (!created) {
          throw new Error("La vaccination n’a pas pu être enregistrée.");
        }
      }
      toast.success(t("patientDetail.vaccinations.save"));
      onOpenChange(false);
    } catch (err) {
      console.error("[VaccinationDialog] save failed", err);
      setError(
        vaccinationSaved
          ? "La vaccination est enregistrée. Le prochain rappel n’a pas pu être préparé. Réessayez ou fermez ce dialogue."
          : err instanceof Error
            ? err.message
            : "L’enregistrement a échoué.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (open && proposal) {
    return (
      <MedicalReminderDialog
        key={proposal.acteSourceId}
        onClose={() => onOpenChange(false)}
        onConfirm={async (draft) => {
          await patientRemindersService.createFromProposal(
            draft,
            currentUser?.id ?? "",
          );
          announcePatientRemindersChanged();
          emitSQLiteDataChanged("vaccinations");
          void repo.refresh();
          toast.success("Rappel médical créé");
        }}
        proposal={proposal}
      />
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <FormDialogContent size="sm">
        <FormDialogHeader
          artwork="vaccination"
          description="Vaccin, lot et date d’administration."
          icon={<Syringe strokeWidth={1} />}
          title={
            isEditing
              ? t("patientDetail.vaccinations.editTitle")
              : t("patientDetail.vaccinations.dialogTitle")
          }
          tone="sky"
        />

        <FormDialogBody>
          <FieldGroup>
            {isEditing ? null : (
              <Field>
                <label className="font-medium text-sm" htmlFor="vaccine-preset">
                  {t("patientDetail.vaccinations.presetLabel")}
                </label>
                <NativeSelect
                  className="w-full cursor-pointer"
                  id="vaccine-preset"
                  onChange={(event) => handlePresetChange(event.target.value)}
                  value={presetId}
                >
                  <NativeSelectOption value="">
                    {t("patientDetail.vaccinations.presetCustom")}
                  </NativeSelectOption>
                  {COMMON_VACCINES.map((preset) => (
                    <NativeSelectOption key={preset.type} value={preset.type}>
                      {preset.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            )}

            <Field>
              <label
                className="flex items-center justify-between font-medium text-sm"
                htmlFor="vaccine-name"
              >
                {t("patientDetail.vaccinations.nameLabel")}{" "}
                <span className="modal-required">requis</span>
              </label>
              <Input
                autoFocus={!isEditing}
                id="vaccine-name"
                onChange={(event) => setVaccineName(event.target.value)}
                placeholder={t("patientDetail.vaccinations.namePlaceholder")}
                value={vaccineName}
              />
            </Field>

            <Field>
              <label className="font-medium text-sm" htmlFor="vaccine-type">
                {t("patientDetail.vaccinations.typeLabel")}
              </label>
              <Input
                id="vaccine-type"
                onChange={(event) => setVaccineType(event.target.value)}
                placeholder={t("patientDetail.vaccinations.typePlaceholder")}
                value={vaccineType}
              />
            </Field>

            <div className="grid grid-cols-1 gap-3">
              <Field>
                <label
                  className="flex items-center justify-between font-medium text-sm"
                  htmlFor="vaccine-administered"
                >
                  {t("patientDetail.vaccinations.administeredLabel")}{" "}
                  <span className="modal-required">requis</span>
                </label>
                <DatePicker
                  id="vaccine-administered"
                  onChange={(value) => setAdministeredAt(value)}
                  value={administeredAt}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <label className="font-medium text-sm" htmlFor="vaccine-batch">
                  {t("patientDetail.vaccinations.batchLabel")}
                </label>
                <Input
                  id="vaccine-batch"
                  onChange={(event) => setBatchNumber(event.target.value)}
                  placeholder="Ex. A1234"
                  value={batchNumber}
                />
              </Field>
              <Field>
                <label
                  className="font-medium text-sm"
                  htmlFor="vaccine-manufacturer"
                >
                  {t("patientDetail.vaccinations.manufacturerLabel")}
                </label>
                <Input
                  id="vaccine-manufacturer"
                  onChange={(event) => setManufacturer(event.target.value)}
                  placeholder="Ex. MSD, Zoetis"
                  value={manufacturer}
                />
              </Field>
            </div>

            <Field>
              <label className="font-medium text-sm" htmlFor="vaccine-notes">
                {t("patientDetail.vaccinations.notesLabel")}
              </label>
              <Textarea
                id="vaccine-notes"
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t("patientDetail.vaccinations.notesPlaceholder")}
                rows={2}
                value={notes}
              />
            </Field>

            {error ? (
              <p
                className="text-rose-600 text-sm dark:text-rose-400"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </FieldGroup>
        </FormDialogBody>

        <FormDialogFooter className="flex w-full items-center justify-between gap-2 sm:justify-between">
          <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
            <Syringe className="size-3.5" strokeWidth={1} />
            {t("patientDetail.vaccinations.subtitle")}
          </span>
          <div className="flex items-center gap-2">
            <Button
              className="cursor-pointer"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              {t("patientDetail.vaccinations.cancel")}
            </Button>
            <Button
              className="cursor-pointer"
              disabled={isSubmitting || !vaccineName.trim() || !administeredAt}
              onClick={handleSave}
              type="button"
              variant="default"
            >
              {isSubmitting ? (
                <Spinner className="size-4" />
              ) : (
                <Plus className="size-4" strokeWidth={1} />
              )}
              {t("patientDetail.vaccinations.save")}
            </Button>
          </div>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
