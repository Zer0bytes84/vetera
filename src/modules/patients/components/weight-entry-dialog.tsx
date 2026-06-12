import { Plus, Trash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useWeightEntriesRepository } from "@/data/repositories";
import type { WeightEntry } from "@/types/db";

interface WeightEntryDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  patientId: string;
  /** Si défini, on est en mode édition */
  weightEntry?: WeightEntry | null;
}

const BCS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Non évalué" },
  { value: "1", label: "1 — Très maigre" },
  { value: "2", label: "2 — Maigre" },
  { value: "3", label: "3 — Idéal bas" },
  { value: "4", label: "4 — Idéal" },
  { value: "5", label: "5 — Idéal haut" },
  { value: "6", label: "6 — Surpoids" },
  { value: "7", label: "7 — Obèse" },
  { value: "8", label: "8 — Obèse sévère" },
  { value: "9", label: "9 — Obésité morbide" },
];

function toDateInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

export function WeightEntryDialog({
  onOpenChange,
  open,
  patientId,
  weightEntry,
}: WeightEntryDialogProps) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const repo = useWeightEntriesRepository();
  const isEditing = Boolean(weightEntry?.id);

  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(() =>
    toDateInputValue(new Date().toISOString())
  );
  const [bcs, setBcs] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    if (weightEntry) {
      setWeight(String(weightEntry.weightKg ?? ""));
      setDate(toDateInputValue(weightEntry.measuredAt));
      setBcs(weightEntry.bcs == null ? "" : String(weightEntry.bcs));
      setNotes(weightEntry.notes ?? "");
    } else {
      setWeight("");
      setDate(toDateInputValue(new Date().toISOString()));
      setBcs("");
      setNotes("");
    }
  }, [open, weightEntry]);

  const handleSave = async () => {
    const weightNumber = Number(weight.replace(",", "."));
    if (!Number.isFinite(weightNumber) || weightNumber <= 0) {
      setError(t("patientDetail.weight.invalidWeight"));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        patientId,
        weightKg: weightNumber,
        measuredAt: new Date(date).toISOString(),
        bcs: bcs ? Number(bcs) : undefined,
        notes: notes.trim() || undefined,
        vetId: currentUser?.id,
      };
      if (weightEntry?.id) {
        const ok = await repo.update(weightEntry.id, payload);
        if (!ok) {
          throw new Error("Update failed");
        }
        toast.success(t("patientDetail.weight.dialogTitle"));
      } else {
        const created = await repo.add(
          payload as unknown as Omit<
            WeightEntry,
            "id" | "createdAt" | "updatedAt"
          >
        );
        if (!created) {
          throw new Error("Insert failed");
        }
        toast.success(t("patientDetail.weight.dialogTitle"));
      }
      onOpenChange(false);
    } catch (err) {
      console.error("[WeightEntryDialog] save failed", err);
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!weightEntry?.id) {
      return;
    }
    if (!window.confirm(t("patientDetail.weight.confirmDelete"))) {
      return;
    }
    setIsDeleting(true);
    try {
      const ok = await repo.remove(weightEntry.id);
      if (ok) {
        toast.success(t("patientDetail.weight.delete"));
        onOpenChange(false);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t("patientDetail.weight.editTitle")
              : t("patientDetail.weight.dialogTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("patientDetail.weight.dialogTitle")}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="weight-kg">
              {t("patientDetail.weight.weightLabel")}
            </FieldLabel>
            <Input
              autoFocus
              id="weight-kg"
              inputMode="decimal"
              onChange={(event) => setWeight(event.target.value)}
              placeholder={t("patientDetail.weight.weightPlaceholder")}
              step="0.01"
              type="number"
              value={weight}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="weight-date">
              {t("patientDetail.weight.dateLabel")}
            </FieldLabel>
            <Input
              id="weight-date"
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="weight-bcs">
              {t("patientDetail.weight.bcsLabel")}
            </FieldLabel>
            <NativeSelect
              id="weight-bcs"
              onChange={(event) => setBcs(event.target.value)}
              value={bcs}
            >
              {BCS_OPTIONS.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.value === ""
                    ? t("patientDetail.weight.bcsNone")
                    : option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>
              {t("patientDetail.weight.bcsNone")}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="weight-notes">
              {t("patientDetail.weight.notesLabel")}
            </FieldLabel>
            <Textarea
              id="weight-notes"
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("patientDetail.weight.notesPlaceholder")}
              rows={3}
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

        <DialogFooter className="flex w-full items-center justify-between gap-2 sm:justify-between">
          {isEditing ? (
            <Button
              className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400"
              disabled={isDeleting || isSubmitting}
              onClick={handleDelete}
              type="button"
              variant="ghost"
            >
              {isDeleting ? (
                <Spinner className="size-4" />
              ) : (
                <Trash className="size-4" weight="duotone" />
              )}
              {t("patientDetail.weight.delete")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button
              disabled={isSubmitting || isDeleting}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              {t("patientDetail.weight.cancel")}
            </Button>
            <Button
              disabled={isSubmitting || isDeleting}
              onClick={handleSave}
              type="button"
              variant="default"
            >
              {isSubmitting ? (
                <Spinner className="size-4" />
              ) : (
                <Plus className="size-4" weight="duotone" />
              )}
              {t("patientDetail.weight.save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
