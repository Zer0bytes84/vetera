import { Hospital } from "@phosphor-icons/react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useHospitalizationsRepository } from "@/data/repositories";
import type {
  Hospitalization,
  HospitalizationStatus,
  Patient,
} from "@/types/db";

const STATUSES: { value: HospitalizationStatus; label: string }[] = [
  { value: "admitted", label: "Admis" },
  { value: "monitoring", label: "Surveillance" },
  { value: "critical", label: "Critique" },
];

function defaultState() {
  return {
    reason: "",
    diagnosis: "",
    status: "admitted" as HospitalizationStatus,
    cage: "",
    weight: "",
    temp: "",
    ivFluids: "",
    feeding: "",
    specialCare: "",
  };
}

export function HospitalizationDialog({
  open,
  onOpenChange,
  patient,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  onCreated?: (h: Hospitalization) => void;
}) {
  const { t } = useTranslation();
  const repo = useHospitalizationsRepository();
  const initial = defaultState();
  const [reason, setReason] = useState(initial.reason);
  const [diagnosis, setDiagnosis] = useState(initial.diagnosis);
  const [status, setStatus] = useState<HospitalizationStatus>(initial.status);
  const [cage, setCage] = useState(initial.cage);
  const [weight, setWeight] = useState(initial.weight);
  const [temp, setTemp] = useState(initial.temp);
  const [ivFluids, setIvFluids] = useState(initial.ivFluids);
  const [feeding, setFeeding] = useState(initial.feeding);
  const [specialCare, setSpecialCare] = useState(initial.specialCare);

  const resetForm = () => {
    const fresh = defaultState();
    flushSync(() => {
      setReason(fresh.reason);
      setDiagnosis(fresh.diagnosis);
      setStatus(fresh.status);
      setCage(fresh.cage);
      setWeight(fresh.weight);
      setTemp(fresh.temp);
      setIvFluids(fresh.ivFluids);
      setFeeding(fresh.feeding);
      setSpecialCare(fresh.specialCare);
    });
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      return;
    }
    const now = new Date().toISOString();
    const row: Omit<Hospitalization, "id" | "createdAt" | "updatedAt"> = {
      patientId: patient.id,
      appointmentId: null,
      reason: reason.trim(),
      diagnosis: diagnosis.trim() || null,
      status,
      admissionDate: now,
      dischargeDate: null,
      cage: cage.trim() || null,
      weightKg: weight ? Number(weight) : null,
      temperatureC: temp ? Number(temp) : null,
      ivFluids: ivFluids.trim() || null,
      feedingPlan: feeding.trim() || null,
      specialCare: specialCare.trim() || null,
      dischargeSummary: null,
      vetId: null,
      templateVersion: "1.0",
    };
    const created = await repo.add(row);
    if (created) {
      onCreated?.(created);
    }
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10">
              <Hospital className="size-5 text-sky-600" weight="duotone" />
            </div>
            <div>
              <DialogTitle>
                {t(
                  "modules.hospitalizations.newHospitalization",
                  "Nouvelle hospitalisation"
                )}
              </DialogTitle>
              <DialogDescription>
                {patient.name} · {patient.species}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="hosp-reason">
              {t("modules.hospitalizations.fields.reason", "Motif")} *
            </Label>
            <Input
              id="hosp-reason"
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex. Pancréatite aiguë, surveillance post-op…"
              value={reason}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="hosp-status">Statut</Label>
              <NativeSelect
                id="hosp-status"
                onChange={(e) =>
                  setStatus(e.target.value as HospitalizationStatus)
                }
                value={status}
              >
                {STATUSES.map((s) => (
                  <NativeSelectOption key={s.value} value={s.value}>
                    {s.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hosp-cage">
                {t("modules.hospitalizations.fields.cage", "Box")}
              </Label>
              <Input
                id="hosp-cage"
                onChange={(e) => setCage(e.target.value)}
                placeholder="A-12"
                value={cage}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hosp-weight">
                {t("modules.hospitalizations.fields.weightKg", "Poids (kg)")}
              </Label>
              <Input
                id="hosp-weight"
                inputMode="decimal"
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.0"
                value={weight}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="hosp-temp">
                {t(
                  "modules.hospitalizations.fields.temperatureC",
                  "T° initiale (°C)"
                )}
              </Label>
              <Input
                id="hosp-temp"
                inputMode="decimal"
                onChange={(e) => setTemp(e.target.value)}
                placeholder="38.5"
                value={temp}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hosp-iv">
                {t("modules.hospitalizations.fields.ivFluids", "Fluides IV")}
              </Label>
              <Input
                id="hosp-iv"
                onChange={(e) => setIvFluids(e.target.value)}
                placeholder="NaCl 0,9% — 50 mL/h"
                value={ivFluids}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hosp-feeding">
              {t("modules.hospitalizations.fields.feedingPlan", "Alimentation")}
            </Label>
            <Input
              id="hosp-feeding"
              onChange={(e) => setFeeding(e.target.value)}
              placeholder="RC gastro 3×/j + eau ad lib"
              value={feeding}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hosp-special">
              {t(
                "modules.hospitalizations.fields.specialCare",
                "Soins particuliers"
              )}
            </Label>
            <Textarea
              id="hosp-special"
              onChange={(e) => setSpecialCare(e.target.value)}
              placeholder="Cage calme, monitoring cardio continu, sortir 4×/j…"
              rows={2}
              value={specialCare}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hosp-diagnosis">
              {t("modules.hospitalizations.fields.diagnosis", "Diagnostic")}
            </Label>
            <Textarea
              id="hosp-diagnosis"
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Diagnostic principal ou provisoire"
              rows={2}
              value={diagnosis}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCancel} variant="outline">
            Annuler
          </Button>
          <Button disabled={!reason.trim()} onClick={() => void handleSubmit()}>
            {t("modules.hospitalizations.admit", "Admettre")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
