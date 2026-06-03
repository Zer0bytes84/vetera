import { useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";

import { Heartbeat } from "@phosphor-icons/react";

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
import { useHospitalizationVitalsRepository } from "@/data/repositories";
import type { Hospitalization, MentalState, MucousMembrane } from "@/types/db";

const MUCOUS: { value: MucousMembrane; label: string }[] = [
  { value: "pink", label: "Rosées" },
  { value: "pale", label: "Pâles" },
  { value: "cyanotic", label: "Cyanosées" },
  { value: "icteric", label: "Ictériques" },
];

const MENTAL: { value: MentalState; label: string }[] = [
  { value: "alert", label: "Alerte" },
  { value: "lethargic", label: "Abattu" },
  { value: "comatose", label: "Comateux" },
  { value: "agitated", label: "Agité" },
];

function defaultVitalsState() {
  return {
    temperatureC: "",
    heartRateBpm: "",
    respiratoryRateBpm: "",
    spo2Percent: "",
    bloodPressureSys: "",
    bloodPressureDia: "",
    weightKg: "",
    bloodGlucoseMmolL: "",
    capillaryRefillTimeS: "",
    painScore: "",
    mucousMembranes: "pink" as MucousMembrane,
    mentalState: "alert" as MentalState,
    notes: "",
  };
}

export function VitalsEntryDialog({
  open,
  onOpenChange,
  hospitalization,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitalization: Hospitalization;
}) {
  const { t } = useTranslation();
  const repo = useHospitalizationVitalsRepository();
  const initial = defaultVitalsState();
  const [temperatureC, setTemperatureC] = useState(initial.temperatureC);
  const [heartRateBpm, setHeartRateBpm] = useState(initial.heartRateBpm);
  const [respiratoryRateBpm, setRespiratoryRateBpm] = useState(initial.respiratoryRateBpm);
  const [spo2Percent, setSpo2Percent] = useState(initial.spo2Percent);
  const [bloodPressureSys, setBloodPressureSys] = useState(initial.bloodPressureSys);
  const [bloodPressureDia, setBloodPressureDia] = useState(initial.bloodPressureDia);
  const [weightKg, setWeightKg] = useState(initial.weightKg);
  const [bloodGlucoseMmolL, setBloodGlucoseMmolL] = useState(initial.bloodGlucoseMmolL);
  const [capillaryRefillTimeS, setCapillaryRefillTimeS] = useState(initial.capillaryRefillTimeS);
  const [painScore, setPainScore] = useState(initial.painScore);
  const [mucousMembranes, setMucousMembranes] = useState<MucousMembrane>(initial.mucousMembranes);
  const [mentalState, setMentalState] = useState<MentalState>(initial.mentalState);
  const [notes, setNotes] = useState(initial.notes);

  const resetForm = () => {
    const fresh = defaultVitalsState();
    flushSync(() => {
      setTemperatureC(fresh.temperatureC);
      setHeartRateBpm(fresh.heartRateBpm);
      setRespiratoryRateBpm(fresh.respiratoryRateBpm);
      setSpo2Percent(fresh.spo2Percent);
      setBloodPressureSys(fresh.bloodPressureSys);
      setBloodPressureDia(fresh.bloodPressureDia);
      setWeightKg(fresh.weightKg);
      setBloodGlucoseMmolL(fresh.bloodGlucoseMmolL);
      setCapillaryRefillTimeS(fresh.capillaryRefillTimeS);
      setPainScore(fresh.painScore);
      setMucousMembranes(fresh.mucousMembranes);
      setMentalState(fresh.mentalState);
      setNotes(fresh.notes);
    });
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const now = new Date().toISOString();
    await repo.add({
      hospitalizationId: hospitalization.id,
      recordedAt: now,
      temperatureC: temperatureC ? Number(temperatureC) : null,
      heartRateBpm: heartRateBpm ? Number(heartRateBpm) : null,
      respiratoryRateBpm: respiratoryRateBpm ? Number(respiratoryRateBpm) : null,
      spo2Percent: spo2Percent ? Number(spo2Percent) : null,
      bloodPressureSys: bloodPressureSys ? Number(bloodPressureSys) : null,
      bloodPressureDia: bloodPressureDia ? Number(bloodPressureDia) : null,
      weightKg: weightKg ? Number(weightKg) : null,
      bloodGlucoseMmolL: bloodGlucoseMmolL ? Number(bloodGlucoseMmolL) : null,
      capillaryRefillTimeS: capillaryRefillTimeS ? Number(capillaryRefillTimeS) : null,
      painScore: painScore ? Number(painScore) : null,
      mucousMembranes,
      mentalState,
      notes: notes.trim() || null,
      recordedBy: null,
    });
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10">
              <Heartbeat className="size-5 text-rose-600" weight="duotone" />
            </div>
            <div>
              <DialogTitle>
                {t("modules.hospitalizations.vitals.addEntry", "Ajouter des constantes")}
              </DialogTitle>
              <DialogDescription>
                {hospitalization.reason}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field
              id="v-temp"
              label={t("modules.hospitalizations.vitals.temperature", "T° (°C)")}
              onChange={setTemperatureC}
              placeholder="38.5"
              value={temperatureC}
            />
            <Field
              id="v-fc"
              label={t("modules.hospitalizations.vitals.heartRate", "FC (bpm)")}
              onChange={setHeartRateBpm}
              placeholder="120"
              value={heartRateBpm}
            />
            <Field
              id="v-fr"
              label={t("modules.hospitalizations.vitals.respiratoryRate", "FR (/min)")}
              onChange={setRespiratoryRateBpm}
              placeholder="24"
              value={respiratoryRateBpm}
            />
            <Field
              id="v-spo2"
              label={t("modules.hospitalizations.vitals.spo2", "SpO2 (%)")}
              onChange={setSpo2Percent}
              placeholder="98"
              value={spo2Percent}
            />
            <Field
              id="v-pas"
              label={t("modules.hospitalizations.vitals.bp", "PAS (mmHg)")}
              onChange={setBloodPressureSys}
              placeholder="120"
              value={bloodPressureSys}
            />
            <Field
              id="v-pad"
              label={t("modules.hospitalizations.vitals.bp", "PAD (mmHg)")}
              onChange={setBloodPressureDia}
              placeholder="80"
              value={bloodPressureDia}
            />
            <Field
              id="v-wt"
              label={t("modules.hospitalizations.vitals.weight", "Poids (kg)")}
              onChange={setWeightKg}
              placeholder="0.0"
              value={weightKg}
            />
            <Field
              id="v-gly"
              label={t("modules.hospitalizations.vitals.glucose", "Glycémie (mmol/L)")}
              onChange={setBloodGlucoseMmolL}
              placeholder="6.5"
              value={bloodGlucoseMmolL}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field
              id="v-trc"
              label={t("modules.hospitalizations.vitals.capillaryRefill", "TRC (s)")}
              onChange={setCapillaryRefillTimeS}
              placeholder="< 2"
              value={capillaryRefillTimeS}
            />
            <div className="grid gap-2">
              <Label htmlFor="v-pain">
                {t("modules.hospitalizations.vitals.painScore", "Douleur (0-10)")}
              </Label>
              <Input
                id="v-pain"
                inputMode="numeric"
                max={10}
                min={0}
                onChange={(e) => setPainScore(e.target.value)}
                placeholder="0"
                value={painScore}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="v-mucous">
                {t("modules.hospitalizations.vitals.mucousMembranes", "Muqueuses")}
              </Label>
              <NativeSelect
                id="v-mucous"
                onChange={(e) => setMucousMembranes(e.target.value as MucousMembrane)}
                value={mucousMembranes}
              >
                {MUCOUS.map((m) => (
                  <NativeSelectOption key={m.value} value={m.value}>
                    {m.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="v-mental">
                {t("modules.hospitalizations.vitals.mentalState", "État mental")}
              </Label>
              <NativeSelect
                id="v-mental"
                onChange={(e) => setMentalState(e.target.value as MentalState)}
                value={mentalState}
              >
                {MENTAL.map((m) => (
                  <NativeSelectOption key={m.value} value={m.value}>
                    {m.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="v-notes">
              {t("modules.hospitalizations.vitals.notes", "Notes")}
            </Label>
            <Textarea
              id="v-notes"
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations cliniques, comportement, sortie…"
              rows={2}
              value={notes}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCancel} variant="outline">
            Annuler
          </Button>
          <Button onClick={() => void handleSubmit()}>
            {t("modules.hospitalizations.vitals.save", "Enregistrer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}
