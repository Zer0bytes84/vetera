import { isTauriRuntime } from "@/services/browser-store";
import { generateId } from "@/services/sqlite/database";
import { emitSQLiteDataChanged } from "@/hooks/useSQLite";
import { addCalendarMonths } from "@/modules/patient-reminders/domain";
import { patientRemindersService } from "@/modules/patient-reminders/service";
import { announcePatientRemindersChanged } from "@/modules/patient-reminders/use-patient-reminders";
import { CheckCircle, Plus, Syringe } from "@/lib/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
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
import {
  COMMON_VACCINES,
  VACCINATION_STATUS_META,
  type VaccinationStatus,
} from "@/config/status-meta";
import { useAuth } from "@/contexts/AuthContext";
import { useVaccinationsRepository } from "@/data/repositories";
import type { Vaccination } from "@/types/db";
import { getVaccinationStatus } from "../lib";
import { toDateInputValue } from "./patients-shared";

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
    toDateInputValue(new Date().toISOString())
  );
  const [nextDueAt, setNextDueAt] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [notes, setNotes] = useState("");
  const [presetId, setPresetId] = useState("");
  const vaccinationDraftId = useRef("");
  const dueDateTouched = useRef(false);
  const administeredDateRef = useRef(administeredAt);
  const [reminderActive, setReminderActive] = useState(true);
  const [reminderMonths, setReminderMonths] = useState(12);
  const [dueOrigin, setDueOrigin] = useState<"auto" | "manuel">("auto");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    let cancelled = false;
    vaccinationDraftId.current = vaccination?.id ?? generateId();
    dueDateTouched.current = false;
    administeredDateRef.current = vaccination ? toDateInputValue(vaccination.administeredAt) : toDateInputValue(new Date().toISOString());
    if (isTauriRuntime()) {
      void patientRemindersService.types().then((types) => {
        if (cancelled) return;
        const type = types.find((entry) => entry.id === "vaccination" && entry.active);
        setReminderActive(!!type);
        if (type) {
          setReminderMonths(type.interval_months);
          if (!vaccination && !dueDateTouched.current) setNextDueAt(addCalendarMonths(administeredDateRef.current, type.interval_months));
        } else if (!vaccination && !dueDateTouched.current) setNextDueAt("");
      }).catch(() => {if (!cancelled) setError("Les réglages des rappels n’ont pas pu être chargés. Vérifiez l’échéance avant d’enregistrer.");});
    }
    setDueOrigin(vaccination ? "manuel" : "auto");
    if (vaccination) {
      setVaccineName(vaccination.vaccineName ?? "");
      setVaccineType(vaccination.vaccineType ?? "");
      setAdministeredAt(toDateInputValue(vaccination.administeredAt));
      setNextDueAt(
        vaccination.nextDueAt ? toDateInputValue(vaccination.nextDueAt) : ""
      );
      setBatchNumber(vaccination.batchNumber ?? "");
      setManufacturer(vaccination.manufacturer ?? "");
      setNotes(vaccination.notes ?? "");
      setPresetId("");
    } else {
      setVaccineName("");
      setVaccineType("");
      setAdministeredAt(toDateInputValue(new Date().toISOString()));
      setNextDueAt(addCalendarMonths(toDateInputValue(new Date().toISOString()), 12));
      setBatchNumber("");
      setManufacturer("");
      setNotes("");
      setPresetId("");
    }
    return () => { cancelled = true; };
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
    if (reminderActive && administeredAt && dueOrigin === "auto") setNextDueAt(addCalendarMonths(administeredAt, reminderMonths));
  };

  const handleAdministeredChange = (value: string) => {
    setAdministeredAt(value);
    administeredDateRef.current = value;
    if (reminderActive && value && dueOrigin === "auto") setNextDueAt(addCalendarMonths(value, reminderMonths));
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    if (!vaccineName.trim()) {
      setError(t("patientDetail.vaccinations.invalidName"));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        patientId,
        vaccineName: vaccineName.trim(),
        vaccineType: vaccineType.trim() || undefined,
        administeredAt: new Date(administeredAt).toISOString(),
        nextDueAt: nextDueAt ? new Date(nextDueAt).toISOString() : undefined,
        batchNumber: batchNumber.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        notes: notes.trim() || undefined,
        vetId: currentUser?.id,
      };
      if (isTauriRuntime()) {
        await patientRemindersService.saveVaccination({
          id: vaccinationDraftId.current, patientId, vaccineName: vaccineName.trim(),
          vaccineType: vaccineType.trim() || undefined, administeredDate: administeredAt,
          dueDate: nextDueAt || undefined, origin: dueOrigin,
          batchNumber: batchNumber.trim() || undefined, manufacturer: manufacturer.trim() || undefined,
          notes: notes.trim() || undefined,
        }, currentUser?.id ?? "");
        emitSQLiteDataChanged("vaccinations");
        announcePatientRemindersChanged();
        void repo.refresh().catch(() => { toast.warning("La vaccination est enregistrée. Actualisez le carnet si nécessaire."); });
      } else if (vaccination?.id) {
        const ok = await repo.update(vaccination.id, payload);
        if (!ok) {
          throw new Error("Update failed");
        }
      } else {
        const created = await repo.add(
          payload as unknown as Omit<
            Vaccination,
            "id" | "createdAt" | "updatedAt"
          >
        );
        if (!created) {
          throw new Error("Insert failed");
        }
      }
      toast.success(t("patientDetail.vaccinations.save"));
      onOpenChange(false);
    } catch (err) {
      console.error("[VaccinationDialog] save failed", err);
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prévisualisation du statut en temps réel sur le champ nextDueAt
  const previewMeta = useMemo(() => {
    if (!nextDueAt) {
      return null;
    }
    const fakeEntry: Pick<Vaccination, "nextDueAt"> = { nextDueAt };
    const status: VaccinationStatus = getVaccinationStatus(
      fakeEntry as Vaccination
    );
    return VACCINATION_STATUS_META[status];
  }, [nextDueAt]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <FormDialogContent size="sm">
        <FormDialogHeader
            artwork="vaccination"
          description="Vaccin, lot et prochaine échéance."
          icon={<Syringe weight="duotone" />}
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
            <label className="font-medium text-sm" htmlFor="vaccine-name">
              {t("patientDetail.vaccinations.nameLabel")}
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

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <label
                className="font-medium text-sm"
                htmlFor="vaccine-administered"
              >
                {t("patientDetail.vaccinations.administeredLabel")}
              </label>
              <Input
                id="vaccine-administered"
                onChange={(event) =>
                  handleAdministeredChange(event.target.value)
                }
                type="date"
                value={administeredAt}
              />
            </Field>
            <Field>
              <label className="font-medium text-sm" htmlFor="vaccine-next-due">
                {t("patientDetail.vaccinations.nextDueLabel")}
              </label>
              <Input
                id="vaccine-next-due"
                onChange={(event) => { dueDateTouched.current = true; setNextDueAt(event.target.value); setDueOrigin("manuel"); }}
                type="date"
                value={nextDueAt}
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
            {previewMeta ? (
              <FieldDescription>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle
                    className="size-3 text-emerald-600 dark:text-emerald-400"
                    weight="duotone"
                  />
                  {previewMeta.label}
                </span>
              </FieldDescription>
            ) : null}
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
            <Syringe className="size-3.5" weight="duotone" />
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
              disabled={isSubmitting}
              onClick={handleSave}
              type="button"
              variant="default"
            >
              {isSubmitting ? (
                <Spinner className="size-4" />
              ) : (
                <Plus className="size-4" weight="duotone" />
              )}
              {t("patientDetail.vaccinations.save")}
            </Button>
          </div>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
