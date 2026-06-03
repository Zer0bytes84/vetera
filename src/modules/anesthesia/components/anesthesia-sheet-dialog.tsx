import { useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";

import { Syringe } from "@phosphor-icons/react";

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
import { useAnesthesiaSheetsRepository } from "@/data/repositories";
import type { AnesthesiaSheet, Patient } from "@/types/db";

const ASA_LEVELS: number[] = [1, 2, 3, 4, 5];

function defaultState() {
  return {
    procedureName: "",
    asaStatus: 1,
    emergency: false,
    weightKg: "",
    premedication: "",
    induction: "",
    inductionAgent: "",
    maintenance: "",
    monitoringPlan: "",
    complications: "",
  };
}

export function AnesthesiaSheetDialog({
  open,
  onOpenChange,
  patient,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  onCreated?: (sheet: AnesthesiaSheet) => void;
}) {
  const { t } = useTranslation();
  const repo = useAnesthesiaSheetsRepository();
  const initial = defaultState();
  const [procedureName, setProcedureName] = useState(initial.procedureName);
  const [asaStatus, setAsaStatus] = useState<number>(initial.asaStatus);
  const [emergency, setEmergency] = useState<boolean>(initial.emergency);
  const [weightKg, setWeightKg] = useState(initial.weightKg);
  const [premedication, setPremedication] = useState(initial.premedication);
  const [induction, setInduction] = useState(initial.induction);
  const [inductionAgent, setInductionAgent] = useState(initial.inductionAgent);
  const [maintenance, setMaintenance] = useState(initial.maintenance);
  const [monitoringPlan, setMonitoringPlan] = useState(initial.monitoringPlan);
  const [complications, setComplications] = useState(initial.complications);

  const resetForm = () => {
    const fresh = defaultState();
    flushSync(() => {
      setProcedureName(fresh.procedureName);
      setAsaStatus(fresh.asaStatus);
      setEmergency(fresh.emergency);
      setWeightKg(fresh.weightKg);
      setPremedication(fresh.premedication);
      setInduction(fresh.induction);
      setInductionAgent(fresh.inductionAgent);
      setMaintenance(fresh.maintenance);
      setMonitoringPlan(fresh.monitoringPlan);
      setComplications(fresh.complications);
    });
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!procedureName.trim()) return;
    const row: Omit<AnesthesiaSheet, "id" | "createdAt" | "updatedAt"> = {
      patientId: patient.id,
      hospitalizationId: null,
      appointmentId: null,
      procedureName: procedureName.trim(),
      asaStatus,
      emergency,
      status: "planned",
      scheduledAt: new Date().toISOString(),
      startedAt: null,
      endedAt: null,
      weightKg: weightKg ? Number(weightKg) : null,
      fastingSince: null,
      premedication: premedication.trim() || null,
      induction: induction.trim() || null,
      inductionAgent: inductionAgent.trim() || null,
      maintenance: maintenance.trim() || null,
      monitoringPlan: monitoringPlan.trim() || null,
      recoveryNotes: null,
      recoveryScore: null,
      complications: complications.trim() || null,
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
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10">
              <Syringe className="size-5 text-violet-600" weight="duotone" />
            </div>
            <div>
              <DialogTitle>
                {t("modules.anesthesia.newSheet", "Nouvelle feuille d'anesthésie")}
              </DialogTitle>
              <DialogDescription>
                {patient.name} · {patient.species}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="anes-procedure">
              {t("modules.anesthesia.fields.procedureName", "Procédure")} *
            </Label>
            <Input
              id="anes-procedure"
              onChange={(e) => setProcedureName(e.target.value)}
              placeholder="Ex. Ovariohystérectomie, détartrage, exérèse masse…"
              value={procedureName}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="anes-asa">ASA (1-5)</Label>
              <NativeSelect
                id="anes-asa"
                onChange={(e) => setAsaStatus(Number(e.target.value))}
                value={String(asaStatus)}
              >
                {ASA_LEVELS.map((a) => (
                  <NativeSelectOption key={a} value={String(a)}>
                    ASA {a}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="anes-weight">
                {t("modules.anesthesia.fields.weightKg", "Poids (kg)")}
              </Label>
              <Input
                id="anes-weight"
                inputMode="decimal"
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="0.0"
                value={weightKg}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="anes-emergency">
                {t("modules.anesthesia.fields.emergency", "Urgence")}
              </Label>
              <button
                id="anes-emergency"
                onClick={() => setEmergency((v) => !v)}
                type="button"
                className={
                  "h-9 rounded-md border px-3 text-sm font-medium transition-colors " +
                  (emergency
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-700"
                    : "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground")
                }
              >
                {emergency ? "Oui" : "Non"}
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="anes-premed">
              {t("modules.anesthesia.fields.premedication", "Prémédication")}
            </Label>
            <Textarea
              id="anes-premed"
              onChange={(e) => setPremedication(e.target.value)}
              placeholder="Ex. Acepromazine 0,05 mg/kg IM + Morphine 0,5 mg/kg IM (T-20min)"
              rows={2}
              value={premedication}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="anes-induction">
                {t("modules.anesthesia.fields.induction", "Induction")}
              </Label>
              <Textarea
                id="anes-induction"
                onChange={(e) => setInduction(e.target.value)}
                placeholder="Détails induction, voies, bolus…"
                rows={2}
                value={induction}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="anes-induction-agent">
                {t("modules.anesthesia.fields.inductionAgent", "Agent d'induction")}
              </Label>
              <Textarea
                id="anes-induction-agent"
                onChange={(e) => setInductionAgent(e.target.value)}
                placeholder="Ex. Propofol IV effet-dose"
                rows={2}
                value={inductionAgent}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="anes-maintenance">
              {t("modules.anesthesia.fields.maintenance", "Maintenance")}
            </Label>
            <Textarea
              id="anes-maintenance"
              onChange={(e) => setMaintenance(e.target.value)}
              placeholder="Ex. Isoflurane 1-1,5% O2 1L/min, circuit coaxial…"
              rows={2}
              value={maintenance}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="anes-monitoring">
              {t("modules.anesthesia.fields.monitoringPlan", "Plan de monitoring")}
            </Label>
            <Textarea
              id="anes-monitoring"
              onChange={(e) => setMonitoringPlan(e.target.value)}
              placeholder="FC, FR, SpO2, ETCO2, PAM toutes les 5min ; T° rectale continue"
              rows={2}
              value={monitoringPlan}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="anes-complications">
              {t("modules.anesthesia.fields.complications", "Complications")}
            </Label>
            <Textarea
              id="anes-complications"
              onChange={(e) => setComplications(e.target.value)}
              placeholder="Si complications (apnée, bradycardie, hypoTA…), détailler"
              rows={2}
              value={complications}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCancel} variant="outline">
            Annuler
          </Button>
          <Button
            disabled={!procedureName.trim()}
            onClick={() => void handleSubmit()}
          >
            Créer la feuille
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
