import { CheckCircle, Plus, Syringe } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { COMMON_VACCINES, VACCINATION_STATUS_META } from "@/config/status-meta";
import { useAuth } from "@/contexts/AuthContext";
import { useVaccinationsRepository } from "@/data/repositories";
import type { Vaccination, VaccinationStatus } from "@/types/db";
import { getVaccinationStatus } from "../lib";

interface VaccinationDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  patientId: string;
  vaccination?: Vaccination | null;
}

function toDateInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function plusDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
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
      setNextDueAt("");
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
    const preset = COMMON_VACCINES.find((p) => p.id === value);
    if (!preset) {
      return;
    }
    setVaccineName(preset.name);
    if (preset.type) {
      setVaccineType(preset.type);
    }
    if (preset.intervalDays && administeredAt) {
      const next = plusDays(new Date(administeredAt), preset.intervalDays);
      setNextDueAt(toDateInputValue(next.toISOString()));
    }
  };

  const handleAdministeredChange = (value: string) => {
    setAdministeredAt(value);
    const preset = COMMON_VACCINES.find((p) => p.id === presetId);
    if (preset?.intervalDays && value) {
      const next = plusDays(new Date(value), preset.intervalDays);
      setNextDueAt(toDateInputValue(next.toISOString()));
    }
  };

  const handleSave = async () => {
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
      if (vaccination?.id) {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t("patientDetail.vaccinations.editTitle")
              : t("patientDetail.vaccinations.dialogTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("patientDetail.vaccinations.dialogTitle")}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          {isEditing ? null : (
            <Field>
              <label className="font-medium text-sm" htmlFor="vaccine-preset">
                {t("patientDetail.vaccinations.presetLabel")}
              </label>
              <NativeSelect
                id="vaccine-preset"
                onChange={(event) => handlePresetChange(event.target.value)}
                value={presetId}
              >
                <NativeSelectOption value="">
                  {t("patientDetail.vaccinations.presetCustom")}
                </NativeSelectOption>
                {COMMON_VACCINES.map((preset) => (
                  <NativeSelectOption key={preset.id} value={preset.id}>
                    {preset.name}
                    {preset.species?.length
                      ? ` — ${preset.species.join("/")}`
                      : ""}
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
                onChange={(event) => setNextDueAt(event.target.value)}
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

        <DialogFooter className="flex w-full items-center justify-between gap-2 sm:justify-between">
          <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
            <Syringe className="size-3.5" weight="duotone" />
            {t("patientDetail.vaccinations.subtitle")}
          </span>
          <div className="flex items-center gap-2">
            <Button
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              {t("patientDetail.vaccinations.cancel")}
            </Button>
            <Button
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
