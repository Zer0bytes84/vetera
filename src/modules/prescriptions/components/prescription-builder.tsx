import {
  ArrowDown,
  ArrowsDownUp,
  ArrowUp,
  ChevronDown,
  Copy,
  FloppyDisk,
  Pill,
  Trash,
  X,
} from "@/lib/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePrescriptionItemsRepository,
  usePrescriptionsRepository,
  useWeightEntriesRepository,
} from "@/data/repositories";
import { cn } from "@/lib/utils";
import { useAudit } from "@/services/use-audit";
import { toast } from "sonner";
import type { Patient, PrescriptionItem } from "@/types/db";
import type { PrescriptionVet } from "../types";

import {
  computeDose,
  type DoseComputation,
  parsePosology,
} from "../lib/dose-calculator";
import {
  getMedicationById,
  type MedicationSearchResult,
  patientSpeciesToCatalogKey,
  type SpeciesKey,
} from "../lib/medication-catalog";
import {
  checkPrescriptionSafety,
  collectActiveTreatments,
  type SafetyAlert,
} from "../lib/prescription-safety";
import {
  checkTemplateSafety,
  instantiateTemplateItems,
  type PrescriptionTemplate,
} from "../lib/prescription-templates";
import { DoseCalculatorCard } from "./dose-calculator-card";
import { MedicationPicker } from "./medication-picker";
import { PrescriptionPreview } from "./prescription-preview";
import {
  PrescriptionSafetyBadges,
  PrescriptionSafetyBanner,
} from "./prescription-safety-alerts";
import {
  PrescriptionTemplateQuickList,
  PrescriptionTemplatesDialog,
  usePrescriptionTemplates,
} from "./prescription-templates";

export interface PrescriptionBuilderProps {
  appointmentId: string;
  className?: string;
  onPreviewChange?: (open: boolean) => void;
  /** Patient sélectionné (pour species + weight). */
  patient: Patient;
  /** Vétérinaire prescripteur (par défaut: user courant). */
  vet?: PrescriptionVet | null;
}

interface DraftItem {
  computedDoseMg?: number;
  computedVolumeMl?: number;
  concentrationMgPerMl?: number;
  dosageMax?: number;
  dosageMin?: number;
  dosagePerKg: number;
  dosageUnit: PrescriptionItem["dosageUnit"];
  duration: string;
  form?: string;
  frequency: string;
  id: string;
  instructions?: string;
  medicationClass?: string;
  medicationId?: string;
  medicationName: string;
  quantity?: string;
  route?: string;
  sortOrder: number;
  warnings?: string;
}

const FORM_OPTIONS = [
  { value: "comprime", key: "comprime" },
  { value: "injectable", key: "injectable" },
  { value: "solution_buvable", key: "solution_buvable" },
  { value: "suspension", key: "suspension" },
  { value: "gel", key: "gel" },
  { value: "pommade", key: "pommade" },
  { value: "collyre", key: "collyre" },
  { value: "spray", key: "spray" },
  { value: "autre", key: "autre" },
] as const;

const ROUTE_OPTIONS = [
  { value: "PO", key: "PO" },
  { value: "IM", key: "IM" },
  { value: "SC", key: "SC" },
  { value: "IV", key: "IV" },
  { value: "topique", key: "topique" },
  { value: "auriculaire", key: "auriculaire" },
  { value: "oculaire", key: "oculaire" },
] as const;

/** Libellé traduit d'une option, ou la valeur brute si elle vient du catalogue (« PO/SC »). */
function optionLabel(
  t: (key: string) => string,
  group: "form" | "route",
  options: readonly { key: string; value: string }[],
  value: string
): string {
  const option = options.find((o) => o.value === value);
  return option ? t(`prescriptions.${group}.${option.key}`) : value;
}

function makeId(): string {
  return `tmp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function medToDraft(
  med: MedicationSearchResult,
  sortOrder: number,
  speciesKey: SpeciesKey | null
): DraftItem {
  const poso = speciesKey ? med.posologies?.[speciesKey] : undefined;
  const parsed = poso ? parsePosology(poso.dose) : null;

  return {
    id: makeId(),
    medicationId: med.id,
    medicationName: med.nomCommercial?.[0] ?? med.nom,
    medicationClass: med.classe,
    form: "comprime",
    dosagePerKg: parsed?.min ?? 0,
    dosageUnit: "mg/kg",
    dosageMin: parsed?.min,
    dosageMax: parsed?.max,
    frequency: poso?.frequence ?? "",
    duration: poso?.duree ?? "",
    route: poso?.voie,
    warnings: med.effetsSecondaires?.join(" · "),
    sortOrder,
  };
}

/** DCI et noms commerciaux du catalogue, pour la correspondance des règles. */
function catalogAliases(medicationId: string | undefined): string[] {
  const med = medicationId ? getMedicationById(medicationId) : null;
  return med ? [med.nom, ...(med.nomCommercial ?? [])] : [];
}

function computeItemDose(
  item: DraftItem,
  weightKg: number | undefined
): DoseComputation | null {
  const fake = {
    unit: item.dosageUnit,
    min: item.dosagePerKg,
    max: item.dosageMax ?? item.dosagePerKg,
    range: item.dosageMax != null && item.dosageMax !== item.dosagePerKg,
  };
  return computeDose(fake, weightKg, item.concentrationMgPerMl);
}

export function PrescriptionBuilder({
  appointmentId,
  className,
  patient,
  vet,
  onPreviewChange,
}: PrescriptionBuilderProps) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  const speciesKey = useMemo(
    () => patientSpeciesToCatalogKey(patient.species),
    [patient.species]
  );

  // Draft local
  const [items, setItems] = useState<DraftItem[]>([]);
  const [weightKg, setWeightKg] = useState<number | undefined>(undefined);
  const [diagnosis, setDiagnosis] = useState("");
  const [generalInstructions, setGeneralInstructions] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [status, setStatus] = useState<"draft" | "signed">("draft");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [signConfirmOpen, setSignConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const prescriptionsRepo = usePrescriptionsRepository();
  const itemsRepo = usePrescriptionItemsRepository();
  const weightEntriesRepo = useWeightEntriesRepository();
  const audit = useAudit();
  const templates = usePrescriptionTemplates();
  const [templatesDialog, setTemplatesDialog] = useState<
    "manage" | "save" | null
  >(null);

  // Init : si une prescription existe pour cette consultation, on hydrate
  useEffect(() => {
    const existing = prescriptionsRepo.forAppointment(appointmentId).find(row => row.status === "draft" || row.status === "signed");
    if (existing) {
      setWeightKg(existing.weightKg);
      setDiagnosis(existing.diagnosis ?? "");
      setGeneralInstructions(existing.generalInstructions ?? "");
      setStatus(
        (existing.status === "signed" ? "signed" : "draft") as
          | "draft"
          | "signed"
      );
      setSavedAt(existing.updatedAt);
      const existingItems = itemsRepo.forPrescription(existing.id);
      setItems(
        existingItems.map((it) => ({
          id: it.id,
          medicationId: it.medicationId,
          medicationName: it.medicationName,
          medicationClass: it.medicationClass,
          form: it.form,
          dosagePerKg: it.dosagePerKg,
          dosageUnit: it.dosageUnit,
          dosageMin: it.dosageMin,
          dosageMax: it.dosageMax,
          concentrationMgPerMl: it.concentrationMgPerMl,
          computedDoseMg: it.computedDoseMg,
          computedVolumeMl: it.computedVolumeMl,
          frequency: it.frequency,
          duration: it.duration,
          route: it.route,
          quantity: it.quantity,
          instructions: it.instructions,
          warnings: it.warnings,
          sortOrder: it.sortOrder,
        }))
      );
    } else {
      // Reset pour nouvelle consultation
      setItems([]);
      setWeightKg(undefined);
      setDiagnosis("");
      setGeneralInstructions("");
      setStatus("draft");
      setSavedAt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, prescriptionsRepo.data.length, itemsRepo.data.length]);

  const handleAddMedication = useCallback(
    (med: MedicationSearchResult) => {
      setItems((prev) => {
        const next = [...prev, medToDraft(med, prev.length, speciesKey)];
        return next;
      });
    },
    [speciesKey]
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<DraftItem>) => {
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) {
            return it;
          }
          const merged = { ...it, ...patch };
          // Recompute the dose
          const computation = computeItemDose(merged, weightKg);
          return {
            ...merged,
            computedDoseMg: computation?.computedMg,
            computedVolumeMl: computation?.computedMl,
          };
        })
      );
    },
    [weightKg]
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) =>
      prev
        .filter((it) => it.id !== id)
        .map((it, idx) => ({
          ...it,
          sortOrder: idx,
        }))
    );
  }, []);

  const moveItem = useCallback((id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === id);
      if (idx < 0) {
        return prev;
      }
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) {
        return prev;
      }
      const next = prev.slice();
      [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
      return next.map((it, i) => ({ ...it, sortOrder: i }));
    });
  }, []);

  // Recompute doses whenever weight changes
  useEffect(() => {
    setItems((prev) =>
      prev.map((it) => {
        const computation = computeItemDose(it, weightKg);
        return {
          ...it,
          computedDoseMg: computation?.computedMg,
          computedVolumeMl: computation?.computedMl,
        };
      })
    );
  }, [weightKg]);

  // Contrôle de sécurité : recalculé à chaque ajout ou modification de ligne.
  const activeTreatments = useMemo(
    () =>
      collectActiveTreatments({
        excludeAppointmentId: appointmentId,
        items: itemsRepo.data,
        now: new Date(),
        patientId: patient.id,
        prescriptions: prescriptionsRepo.data,
        resolveAliases: (medicationId) => catalogAliases(medicationId),
      }),
    [appointmentId, itemsRepo.data, patient.id, prescriptionsRepo.data]
  );

  const safetyAlerts = useMemo(
    () =>
      checkPrescriptionSafety({
        active: activeTreatments,
        draft: items.map((it) => ({
          key: it.id,
          name: it.medicationName,
          className: it.medicationClass,
          aliases: catalogAliases(it.medicationId),
        })),
        patient,
      }),
    [activeTreatments, items, patient]
  );

  // Modèles d'ordonnance : même contrôle de sécurité, pour le patient courant.
  const templateAlerts = useCallback(
    (template: PrescriptionTemplate) =>
      checkTemplateSafety({
        active: activeTreatments,
        draft: items.map((it) => ({
          key: it.id,
          name: it.medicationName,
          className: it.medicationClass,
          aliases: catalogAliases(it.medicationId),
        })),
        patient,
        resolveAliases: catalogAliases,
        template,
      }),
    [activeTreatments, items, patient]
  );

  const templateAlertCount = useCallback(
    (template: PrescriptionTemplate) => templateAlerts(template).length,
    [templateAlerts]
  );

  const applyTemplate = useCallback(
    (template: PrescriptionTemplate) => {
      // Poids de l'ordonnance, sinon dernière pesée du dossier.
      const latestWeight = weightEntriesRepo.latestFor(patient.id);
      const usedLatestWeight =
        weightKg == null && latestWeight != null && latestWeight.weightKg > 0;
      const effectiveWeight = usedLatestWeight
        ? latestWeight.weightKg
        : weightKg;
      const alerts = templateAlerts(template);

      setItems((prev) => [
        ...prev,
        ...instantiateTemplateItems(template, prev.length, (item, sortOrder) => {
          const line: DraftItem = { ...item, id: makeId(), sortOrder };
          const computation = computeItemDose(line, effectiveWeight);
          return {
            ...line,
            computedDoseMg: computation?.computedMg,
            computedVolumeMl: computation?.computedMl,
          };
        }),
      ]);
      if (usedLatestWeight) {
        setWeightKg(latestWeight.weightKg);
      }
      // Les champs déjà saisis par le vétérinaire ne sont jamais écrasés.
      if (template.diagnosis) {
        setDiagnosis((current) => current.trim() ? current : template.diagnosis ?? "");
      }
      if (template.generalInstructions) {
        setGeneralInstructions((current) =>
          current.trim() ? current : template.generalInstructions ?? ""
        );
      }

      const count = template.items.length;
      const added = count > 1 ? `${count} médicaments ajoutés` : "1 médicament ajouté";
      const weightNote = effectiveWeight
        ? `Doses calculées pour ${effectiveWeight} kg${usedLatestWeight ? " (dernière pesée)" : ""}.`
        : "Renseignez le poids pour calculer les doses.";
      if (alerts.length > 0) {
        toast.warning(
          `Modèle « ${template.name} » appliqué : ${
            alerts.length > 1
              ? `${alerts.length} alertes de sécurité`
              : "1 alerte de sécurité"
          } à vérifier.`,
          { description: `${added}. ${weightNote}` }
        );
      } else {
        toast.success(`Modèle « ${template.name} » appliqué.`, {
          description: `${added}. ${weightNote}`,
        });
      }
    },
    [patient.id, templateAlerts, weightEntriesRepo, weightKg]
  );

  const currentAsTemplate = useCallback(
    () => ({ diagnosis, generalInstructions, items }),
    [diagnosis, generalInstructions, items]
  );

  const handleSave = useCallback(
    async (newStatus: "draft" | "signed") => {
      const now = new Date().toISOString();
      const prescription = {
        appointmentId,
        patientId: patient.id,
        vetId: vet?.id ?? currentUser?.id,
        prescriptionDate: now,
        weightKg,
        diagnosis: diagnosis.trim() || undefined,
        generalInstructions: generalInstructions.trim() || undefined,
        status: newStatus,
        signedAt: newStatus === "signed" ? now : undefined,
        templateVersion: "1.0",
      };

      // Upsert : une seule ordonnance par consultation. On met à jour la
      // ligne existante au lieu d'en empiler une nouvelle à chaque
      // sauvegarde (les anciennes lignes vides polluaient la liste).
      const existing = prescriptionsRepo.forAppointment(appointmentId).find(row => row.status === "draft" || row.status === "signed");
      let prescriptionId: string;
      let finalStatus = newStatus;
      if (existing) {
        // Une ordonnance signée reste signée : on ne la fait jamais
        // repasser en brouillon.
        finalStatus = existing.status === "signed" ? "signed" : newStatus;
        const updated = await prescriptionsRepo.update(existing.id, {
          ...prescription,
          status: finalStatus,
          signedAt:
            finalStatus === "signed" ? (existing.signedAt ?? now) : undefined,
        });
        if (!updated) {
          throw new Error("Impossible d'enregistrer l'ordonnance.");
        }
        prescriptionId = existing.id;
        // Purger les anciens items de cette ordonnance avant réinsertion.
        const oldItems = itemsRepo.forPrescription(existing.id);
        for (const it of oldItems) {
          await itemsRepo.remove(it.id);
        }
      } else {
        const createdPrescription = await prescriptionsRepo.add(prescription);
        if (!createdPrescription) {
          throw new Error("Impossible d'enregistrer l'ordonnance.");
        }
        prescriptionId = createdPrescription.id;
      }

      // Insérer les nouveaux items
      for (const it of items) {
        await itemsRepo.add({
          prescriptionId,
          medicationId: it.medicationId,
          medicationName: it.medicationName,
          medicationClass: it.medicationClass,
          form: it.form,
          dosagePerKg: it.dosagePerKg,
          dosageUnit: it.dosageUnit,
          dosageMin: it.dosageMin,
          dosageMax: it.dosageMax,
          concentrationMgPerMl: it.concentrationMgPerMl,
          computedDoseMg: it.computedDoseMg,
          computedVolumeMl: it.computedVolumeMl,
          frequency: it.frequency,
          duration: it.duration,
          route: it.route,
          quantity: it.quantity,
          instructions: it.instructions,
          warnings: it.warnings,
          sortOrder: it.sortOrder,
        });
      }

      setStatus(finalStatus);
      setSavedAt(now);

      await audit.log({
        action: existing ? "update" : "create",
        entity: "prescription",
        entityId: prescriptionId,
        payload: {
          patientId: patient.id,
          appointmentId,
          status: finalStatus,
          itemCount: items.length,
        },
      });
    },
    [
      appointmentId,
      patient.id,
      vet?.id,
      currentUser?.id,
      weightKg,
      diagnosis,
      generalInstructions,
      items,
      prescriptionsRepo,
      itemsRepo,
      audit,
    ]
  );

  const saveWithFeedback = useCallback(
    async (newStatus: "draft" | "signed") => {
      setIsSaving(true);
      try {
        await handleSave(newStatus);
        toast.success(
          newStatus === "signed"
            ? "Ordonnance signée."
            : "Brouillon d'ordonnance enregistré."
        );
        setSignConfirmOpen(false);
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer l'ordonnance."
        );
      } finally {
        setIsSaving(false);
      }
    },
    [handleSave]
  );

  return (
    <div className={cn("space-y-4", className)}>
      <BuilderHeader
        onPreview={() => {
          setShowPreview(true);
          onPreviewChange?.(true);
        }}
        onSaveDraft={() => void saveWithFeedback("draft")}
        onOpenTemplates={() => setTemplatesDialog("manage")}
        onSign={() => setSignConfirmOpen(true)}
        savedAt={savedAt}
        status={status}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Colonne principale */}
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="space-y-2 px-3 py-3">
                <Label className="font-semibold t-12 text-muted-foreground uppercase tracking-wider">
                  {t("prescriptions.builder.diagnosis")}
                </Label>
                <Textarea
                  className="min-h-[60px] resize-none border-0 bg-muted/30 text-sm shadow-none focus-visible:ring-1"
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder={t("prescriptions.builder.diagnosisPlaceholder")}
                  value={diagnosis}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2 px-3 py-3">
                <Label className="font-semibold t-12 text-muted-foreground uppercase tracking-wider">
                  {t("prescriptions.builder.generalInstructions")}
                </Label>
                <Textarea
                  className="min-h-[60px] resize-none border-0 bg-muted/30 text-sm shadow-none focus-visible:ring-1"
                  onChange={(e) => setGeneralInstructions(e.target.value)}
                  placeholder={t(
                    "prescriptions.builder.generalInstructionsPlaceholder"
                  )}
                  value={generalInstructions}
                />
              </CardContent>
            </Card>
          </div>

          <PrescriptionSafetyBanner alerts={safetyAlerts} />

          {items.length === 0 ? (
            <EmptyState
              action={
                <MedicationPicker
                  onSelect={handleAddMedication}
                  speciesKey={speciesKey}
                />
              }
              footer={
                <PrescriptionTemplateQuickList
                  alertCountFor={templateAlertCount}
                  onApply={applyTemplate}
                  onManage={() => setTemplatesDialog("manage")}
                  state={templates}
                />
              }
            />
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {items.map((it, idx) => (
                  <ItemRow
                    canDown={idx < items.length - 1}
                    canUp={idx > 0}
                    item={it}
                    key={it.id}
                    onChange={(patch) => updateItem(it.id, patch)}
                    onMoveDown={() => moveItem(it.id, 1)}
                    onMoveUp={() => moveItem(it.id, -1)}
                    onRemove={() => removeItem(it.id)}
                    safetyAlerts={safetyAlerts.filter(
                      (alert) =>
                        alert.medicationKey === it.id ||
                        (alert.other?.origin === "ordonnance" &&
                          alert.other.key === it.id)
                    )}
                    weightKg={weightKg}
                  />
                ))}
              </div>
              <MedicationPicker
                onSelect={handleAddMedication}
                speciesKey={speciesKey}
              />
              <div className="flex justify-end">
                <Button
                  className="h-8 gap-1.5 text-muted-foreground"
                  data-testid="prescription-save-as-template"
                  onClick={() => setTemplatesDialog("save")}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <FloppyDisk className="size-3.5" weight="duotone" />
                  Enregistrer comme modèle
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Colonne droite : contexte patient + dose preview */}
        <aside className="space-y-3">
          <WeightCard
            onChange={setWeightKg}
            patientSpecies={patient.species}
            weightKg={weightKg}
          />
          <PatientInfoCard patient={patient} />
        </aside>
      </div>

      {showPreview ? (
        <PrescriptionPreview
          diagnosis={diagnosis}
          generalInstructions={generalInstructions}
          items={items.map((it) => ({
            ...it,
            weightKgSnapshot: weightKg,
          }))}
          onClose={() => {
            setShowPreview(false);
            onPreviewChange?.(false);
          }}
          patient={patient}
          vet={vet ?? currentUser ?? null}
        />
      ) : null}

      <PrescriptionTemplatesDialog
        alertCountFor={templateAlertCount}
        canSaveCurrent={items.some((it) => it.medicationName.trim() !== "")}
        currentItemCount={items.length}
        getCurrent={currentAsTemplate}
        initialMode={templatesDialog ?? "manage"}
        onApply={applyTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setTemplatesDialog(null);
          }
        }}
        open={templatesDialog !== null}
        state={templates}
      />

      <AlertDialog onOpenChange={setSignConfirmOpen} open={signConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Signer l'ordonnance ?</AlertDialogTitle>
            <AlertDialogDescription>
              La signature fige l'ordonnance pour {patient.name} : elle ne
              pourra plus repasser en brouillon. Vérifiez les médicaments,
              les doses et les instructions avant de confirmer.
            </AlertDialogDescription>
            {safetyAlerts.length > 0 ? (
              <p
                className="font-medium text-destructive text-sm"
                data-testid="prescription-safety-sign-note"
              >
                {safetyAlerts.length > 1
                  ? `${safetyAlerts.length} alertes de sécurité restent signalées`
                  : "1 alerte de sécurité reste signalée"}{" "}
                (interaction ou contre-indication). Vous pouvez signer après
                vérification.
              </p>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={() => void saveWithFeedback("signed")}
            >
              Signer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =====================================================================================
// Sous-composants
// =====================================================================================

function BuilderHeader({
  onOpenTemplates,
  onSaveDraft,
  onSign,
  onPreview,
  savedAt,
  status,
}: {
  onOpenTemplates: () => void;
  onPreview: () => void;
  onSaveDraft: () => void;
  onSign: () => void;
  savedAt: string | null;
  status: "draft" | "signed";
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-border/60 border-b pb-3">
      <div>
        <h2 className="flex items-center gap-2 font-semibold text-base tracking-tight">
          <Pill className="size-4 text-primary" weight="duotone" />
          {t("prescriptions.title")}
        </h2>
        <p className="text-muted-foreground text-xs">
          {t("prescriptions.subtitle")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {savedAt ? (
          <Badge className="t-12" variant="outline">
            ✓ {new Date(savedAt).toLocaleString()}
          </Badge>
        ) : null}
        {status === "signed" ? (
          <Badge
            className="bg-emerald-500/10 t-12 text-emerald-700 dark:text-emerald-300"
            variant="secondary"
          >
            {t("prescriptions.builder.signed")}
          </Badge>
        ) : (
          <Badge className="t-12" variant="secondary">
            {t("prescriptions.status.draft")}
          </Badge>
        )}
        <Button
          className="h-8 gap-1.5"
          data-testid="prescription-templates-open"
          onClick={onOpenTemplates}
          size="sm"
          type="button"
          variant="outline"
        >
          <Copy className="size-3.5" weight="duotone" />
          Modèles
        </Button>
        <Button
          className="h-8 gap-1.5"
          onClick={onPreview}
          size="sm"
          type="button"
          variant="outline"
        >
          {t("prescriptions.builder.preview")}
        </Button>
        <Button
          className="h-8 gap-1.5"
          onClick={onSaveDraft}
          size="sm"
          type="button"
          variant="ghost"
        >
          {t("prescriptions.builder.saveDraft")}
        </Button>
        <Button
          className="h-8 gap-1.5"
          onClick={onSign}
          size="sm"
          type="button"
        >
          {t("prescriptions.builder.sign")}
        </Button>
      </div>
    </div>
  );
}

function WeightCard({
  weightKg,
  onChange,
  patientSpecies,
}: {
  onChange: (weight: number | undefined) => void;
  patientSpecies: string;
  weightKg: number | undefined;
}) {
  const { t } = useTranslation();
  return (
    <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardContent className="space-y-2 px-3 py-3">
        <Label
          className="font-semibold t-12 text-muted-foreground uppercase tracking-wider"
          htmlFor="weight-input"
        >
          {t("prescriptions.builder.weightLabel")}
          <span className="ml-1 text-muted-foreground/60">
            · {patientSpecies}
          </span>
        </Label>
        <div className="flex items-baseline gap-2">
          <Input
            className="h-10 border-0 bg-background/60 font-semibold text-2xl tabular-nums shadow-none focus-visible:ring-1"
            id="weight-input"
            inputMode="decimal"
            min={0}
            onChange={(e) => {
              const v = e.target.value.replace(",", ".");
              onChange(v ? Number.parseFloat(v) : undefined);
            }}
            placeholder="—"
            step="0.1"
            type="number"
            value={weightKg ?? ""}
          />
          <span className="font-medium text-muted-foreground text-sm">kg</span>
        </div>
        <p className="t-12 text-muted-foreground">
          {t("prescriptions.builder.weightHelper")}
        </p>
      </CardContent>
    </Card>
  );
}

function PatientInfoCard({ patient }: { patient: Patient }) {
  return (
    <Card>
      <CardContent className="space-y-1 px-3 py-3 text-xs">
        <p className="font-semibold t-12 text-muted-foreground uppercase tracking-wider">
          {patient.name}
        </p>
        <p className="text-muted-foreground">
          {patient.species}
          {patient.breed ? ` · ${patient.breed}` : ""}
        </p>
        <p className="text-muted-foreground/70">
          {patient.sex === "F" ? "♀" : "♂"}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  action,
  footer,
}: {
  action: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border/60 border-dashed bg-muted/20 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Pill className="size-6" weight="duotone" />
      </div>
      <h3 className="mt-3 font-semibold text-sm tracking-tight">
        {t("prescriptions.empty.title")}
      </h3>
      <p className="mt-1 max-w-xs text-muted-foreground text-xs">
        {t("prescriptions.empty.description")}
      </p>
      <div className="mt-4 w-full max-w-sm">{action}</div>
      {footer}
    </div>
  );
}

function ItemRow({
  canDown,
  canUp,
  item,
  onChange,
  onMoveDown,
  onMoveUp,
  onRemove,
  safetyAlerts,
  weightKg,
}: {
  canDown: boolean;
  canUp: boolean;
  item: DraftItem;
  onChange: (patch: Partial<DraftItem>) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  safetyAlerts: SafetyAlert[];
  weightKg: number | undefined;
}) {
  const { t } = useTranslation();
  const computation = useMemo(
    () => computeItemDose(item, weightKg),
    [item, weightKg]
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = `rx-item-details-${item.id}`;

  // Résumé du détail replié : rien n'est masqué sans être signalé.
  const detailsSummary = [
    optionLabel(t, "form", FORM_OPTIONS, item.form ?? "comprime"),
    optionLabel(t, "route", ROUTE_OPTIONS, item.route ?? "PO"),
    item.quantity?.trim() ? item.quantity.trim() : null,
    item.concentrationMgPerMl != null
      ? `${item.concentrationMgPerMl} mg/mL`
      : null,
    item.instructions?.trim() ? t("prescriptions.item.instructionsFilled") : null,
    item.warnings?.trim() ? t("prescriptions.item.warningsFilled") : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <Card className="@container overflow-hidden">
      <div className="grid gap-0 @3xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-3 px-3 py-3">
          {/* Ligne 1 : nom + actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-xs">
                {item.sortOrder + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-sm">
                  {item.medicationName}
                </p>
                {item.medicationClass ? (
                  <p className="truncate t-12 text-muted-foreground">
                    {item.medicationClass}
                  </p>
                ) : null}
                <PrescriptionSafetyBadges alerts={safetyAlerts} />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                aria-label={t("prescriptions.builder.moveUp")}
                className="size-7"
                disabled={!canUp}
                onClick={onMoveUp}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ArrowUp className="size-3.5" weight="duotone" />
              </Button>
              <Button
                aria-label={t("prescriptions.builder.moveDown")}
                className="size-7"
                disabled={!canDown}
                onClick={onMoveDown}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ArrowDown className="size-3.5" weight="duotone" />
              </Button>
              <Button
                aria-label={t("prescriptions.builder.remove")}
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash className="size-3.5" weight="duotone" />
              </Button>
            </div>
          </div>

          {/* L'essentiel : dose, fréquence, durée */}
          <div className="grid grid-cols-1 gap-2 @sm:grid-cols-2 @lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <DoseField item={item} onChange={onChange} />
            <FieldShell label={t("prescriptions.item.frequency")}>
              <Input
                className="h-8 text-xs"
                onChange={(e) => onChange({ frequency: e.target.value })}
                placeholder={t("prescriptions.item.frequencyPlaceholder")}
                title={item.frequency || undefined}
                value={item.frequency}
              />
            </FieldShell>
            <FieldShell label={t("prescriptions.item.duration")}>
              <Input
                className="h-8 text-xs"
                onChange={(e) => onChange({ duration: e.target.value })}
                placeholder={t("prescriptions.item.durationPlaceholder")}
                title={item.duration || undefined}
                value={item.duration}
              />
            </FieldShell>
          </div>

          {/* Le détail, replié par défaut avec un résumé */}
          <div className="rounded-md border border-border/60">
            <button
              aria-controls={detailsId}
              aria-expanded={detailsOpen}
              className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
              onClick={() => setDetailsOpen((open) => !open)}
              type="button"
            >
              <span className="shrink-0 font-medium t-12 text-muted-foreground uppercase tracking-wider">
                {t("prescriptions.item.details")}
              </span>
              <span className="min-w-0 flex-1 t-12 text-muted-foreground">
                {detailsOpen ? null : detailsSummary.join(" · ")}
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground transition-transform",
                  detailsOpen && "rotate-180"
                )}
              />
            </button>
            {detailsOpen ? (
              <div
                className="space-y-2 border-border/60 border-t px-2.5 py-2.5"
                id={detailsId}
              >
                <div className="grid grid-cols-1 gap-2 @sm:grid-cols-2">
                  <FieldShell label={t("prescriptions.item.form")}>
                    <NativeSelect
                      className="h-8 text-xs"
                      onChange={(e) => onChange({ form: e.target.value })}
                      value={item.form ?? "comprime"}
                    >
                      {FORM_OPTIONS.map((o) => (
                        <NativeSelectOption key={o.value} value={o.value}>
                          {t(`prescriptions.form.${o.key}`)}
                        </NativeSelectOption>
                      ))}
                      {item.form &&
                      !FORM_OPTIONS.some((o) => o.value === item.form) ? (
                        <NativeSelectOption value={item.form}>
                          {item.form}
                        </NativeSelectOption>
                      ) : null}
                    </NativeSelect>
                  </FieldShell>
                  <FieldShell label={t("prescriptions.item.route")}>
                    <NativeSelect
                      className="h-8 text-xs"
                      onChange={(e) => onChange({ route: e.target.value })}
                      value={item.route ?? "PO"}
                    >
                      {ROUTE_OPTIONS.map((o) => (
                        <NativeSelectOption key={o.value} value={o.value}>
                          {t(`prescriptions.route.${o.key}`)}
                        </NativeSelectOption>
                      ))}
                      {item.route &&
                      !ROUTE_OPTIONS.some((o) => o.value === item.route) ? (
                        <NativeSelectOption value={item.route}>
                          {item.route}
                        </NativeSelectOption>
                      ) : null}
                    </NativeSelect>
                  </FieldShell>
                  <FieldShell label={t("prescriptions.item.quantity")}>
                    <Input
                      className="h-8 text-xs"
                      onChange={(e) => onChange({ quantity: e.target.value })}
                      placeholder={t("prescriptions.item.quantityPlaceholder")}
                      title={item.quantity || undefined}
                      value={item.quantity ?? ""}
                    />
                  </FieldShell>
                  <FieldShell label={t("prescriptions.item.concentration")}>
                    <Input
                      className="h-8 text-xs"
                      inputMode="decimal"
                      onChange={(e) => {
                        const v = e.target.value.replace(",", ".");
                        onChange({
                          concentrationMgPerMl: v
                            ? Number.parseFloat(v)
                            : undefined,
                        });
                      }}
                      placeholder="—"
                      step="0.1"
                      type="number"
                      value={item.concentrationMgPerMl ?? ""}
                    />
                  </FieldShell>
                </div>
                <div className="grid grid-cols-1 gap-2 @sm:grid-cols-2">
                  <FieldShell label={t("prescriptions.item.instructions")}>
                    <Textarea
                      className="min-h-[60px] resize-none border-0 bg-muted/30 text-xs shadow-none focus-visible:ring-1"
                      onChange={(e) =>
                        onChange({ instructions: e.target.value })
                      }
                      placeholder={t(
                        "prescriptions.item.instructionsPlaceholder"
                      )}
                      value={item.instructions ?? ""}
                    />
                  </FieldShell>
                  <FieldShell label={t("prescriptions.item.warnings")}>
                    <Textarea
                      className="min-h-[60px] resize-none border-0 bg-muted/30 text-xs shadow-none focus-visible:ring-1"
                      onChange={(e) => onChange({ warnings: e.target.value })}
                      placeholder={t("prescriptions.item.warningsPlaceholder")}
                      value={item.warnings ?? ""}
                    />
                  </FieldShell>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Colonne droite : dose calculator + état */}
        <div className="space-y-2 border-border/40 border-t bg-muted/20 px-3 py-3 @3xl:border-t-0 @3xl:border-l">
          <DoseCalculatorCard
            className="bg-background"
            computation={computation}
            concentrationMgPerMl={item.concentrationMgPerMl}
            weightKg={weightKg}
          />
          <p className="text-center t-12 text-muted-foreground">
            <ArrowsDownUp className="mr-1 inline size-3" weight="duotone" />
            {t("prescriptions.calculator.perKg")}
          </p>
        </div>
      </div>
    </Card>
  );
}

function FieldShell({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="font-medium t-12 text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  );
}

function DoseField({
  item,
  onChange,
}: {
  item: DraftItem;
  onChange: (patch: Partial<DraftItem>) => void;
}) {
  const { t } = useTranslation();
  return (
    <FieldShell label={t("prescriptions.item.dose")}>
      <div className="flex items-center gap-1">
        <Input
          className="h-8 min-w-[64px] flex-1 text-xs"
          inputMode="decimal"
          onChange={(e) => {
            const v = e.target.value.replace(",", ".");
            onChange({ dosagePerKg: v ? Number.parseFloat(v) : 0 });
          }}
          placeholder="—"
          step="0.1"
          type="number"
          value={item.dosagePerKg || ""}
        />
        <NativeSelect
          className="h-8 w-[88px] shrink-0 text-xs"
          onChange={(e) =>
            onChange({
              dosageUnit: e.target.value as DraftItem["dosageUnit"],
            })
          }
          value={item.dosageUnit}
        >
          <NativeSelectOption value="mg/kg">mg/kg</NativeSelectOption>
          <NativeSelectOption value="mg/tot">mg/tot</NativeSelectOption>
          <NativeSelectOption value="mL/kg">mL/kg</NativeSelectOption>
          <NativeSelectOption value="UI/kg">UI/kg</NativeSelectOption>
        </NativeSelect>
      </div>
    </FieldShell>
  );
}

// Ré-export du close handler (utilisé par PrescriptionPreview)
export { X };
