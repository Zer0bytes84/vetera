import { Heartbeat } from "@phosphor-icons/react";
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
import { useAnesthesiaMonitoringRepository } from "@/data/repositories";
import type { AnesthesiaPhase, AnesthesiaSheet } from "@/types/db";

import { ANESTHESIA_PHASE_LABELS } from "../lib/format";

const PHASES: AnesthesiaPhase[] = [
  "premed",
  "induction",
  "maintenance",
  "recovery",
];

function defaultState() {
  return {
    heartRateBpm: "",
    respiratoryRateBpm: "",
    spo2Percent: "",
    etco2Mmhg: "",
    mapMmhg: "",
    temperatureC: "",
    isofluranePct: "",
    oxygenFlowLMin: "",
    phase: "maintenance" as AnesthesiaPhase,
    notes: "",
  };
}

export function AnesthesiaMonitoringEntryDialog({
  open,
  onOpenChange,
  sheet,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: AnesthesiaSheet;
  onCreated?: () => void;
}) {
  const { t } = useTranslation();
  const repo = useAnesthesiaMonitoringRepository();
  const initial = defaultState();
  const [heartRateBpm, setHeartRateBpm] = useState(initial.heartRateBpm);
  const [respiratoryRateBpm, setRespiratoryRateBpm] = useState(
    initial.respiratoryRateBpm
  );
  const [spo2Percent, setSpo2Percent] = useState(initial.spo2Percent);
  const [etco2Mmhg, setEtco2Mmhg] = useState(initial.etco2Mmhg);
  const [mapMmhg, setMapMmhg] = useState(initial.mapMmhg);
  const [temperatureC, setTemperatureC] = useState(initial.temperatureC);
  const [isofluranePct, setIsofluranePct] = useState(initial.isofluranePct);
  const [oxygenFlowLMin, setOxygenFlowLMin] = useState(initial.oxygenFlowLMin);
  const [phase, setPhase] = useState<AnesthesiaPhase>(initial.phase);
  const [notes, setNotes] = useState(initial.notes);

  const resetForm = () => {
    const fresh = defaultState();
    flushSync(() => {
      setHeartRateBpm(fresh.heartRateBpm);
      setRespiratoryRateBpm(fresh.respiratoryRateBpm);
      setSpo2Percent(fresh.spo2Percent);
      setEtco2Mmhg(fresh.etco2Mmhg);
      setMapMmhg(fresh.mapMmhg);
      setTemperatureC(fresh.temperatureC);
      setIsofluranePct(fresh.isofluranePct);
      setOxygenFlowLMin(fresh.oxygenFlowLMin);
      setPhase(fresh.phase);
      setNotes(fresh.notes);
    });
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    await repo.add({
      anesthesiaSheetId: sheet.id,
      recordedAt: new Date().toISOString(),
      phase,
      heartRateBpm: heartRateBpm ? Number(heartRateBpm) : null,
      respiratoryRateBpm: respiratoryRateBpm
        ? Number(respiratoryRateBpm)
        : null,
      spo2Percent: spo2Percent ? Number(spo2Percent) : null,
      etco2Mmhg: etco2Mmhg ? Number(etco2Mmhg) : null,
      mapMmhg: mapMmhg ? Number(mapMmhg) : null,
      temperatureC: temperatureC ? Number(temperatureC) : null,
      isofluranePct: isofluranePct ? Number(isofluranePct) : null,
      oxygenFlowLMin: oxygenFlowLMin ? Number(oxygenFlowLMin) : null,
      notes: notes.trim() || null,
    });
    onCreated?.();
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
                {t(
                  "modules.anesthesia.monitoring.addEntry",
                  "Ajouter un point monitoring"
                )}
              </DialogTitle>
              <DialogDescription>{sheet.procedureName}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field
              id="mon-fc"
              label={t("modules.anesthesia.monitoring.heartRate", "FC (bpm)")}
              onChange={setHeartRateBpm}
              placeholder="120"
              value={heartRateBpm}
            />
            <Field
              id="mon-fr"
              label={t(
                "modules.anesthesia.monitoring.respiratoryRate",
                "FR (/min)"
              )}
              onChange={setRespiratoryRateBpm}
              placeholder="12"
              value={respiratoryRateBpm}
            />
            <Field
              id="mon-spo2"
              label={t("modules.anesthesia.monitoring.spo2", "SpO2 (%)")}
              onChange={setSpo2Percent}
              placeholder="98"
              value={spo2Percent}
            />
            <Field
              id="mon-etco2"
              label={t("modules.anesthesia.monitoring.etco2", "ETCO2 (mmHg)")}
              onChange={setEtco2Mmhg}
              placeholder="38"
              value={etco2Mmhg}
            />
            <Field
              id="mon-pam"
              label={t("modules.anesthesia.monitoring.map", "PAM (mmHg)")}
              onChange={setMapMmhg}
              placeholder="80"
              value={mapMmhg}
            />
            <Field
              id="mon-temp"
              label={t("modules.anesthesia.monitoring.temperature", "T° (°C)")}
              onChange={setTemperatureC}
              placeholder="37.5"
              value={temperatureC}
            />
            <Field
              id="mon-iso"
              label={t("modules.anesthesia.monitoring.isoflurane", "Iso (%)")}
              onChange={setIsofluranePct}
              placeholder="1.5"
              value={isofluranePct}
            />
            <Field
              id="mon-o2"
              label={t("modules.anesthesia.monitoring.oxygen", "O2 (L/min)")}
              onChange={setOxygenFlowLMin}
              placeholder="1"
              value={oxygenFlowLMin}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="mon-phase">Phase</Label>
              <NativeSelect
                id="mon-phase"
                onChange={(e) => setPhase(e.target.value as AnesthesiaPhase)}
                value={phase}
              >
                {PHASES.map((p) => (
                  <NativeSelectOption key={p} value={p}>
                    {ANESTHESIA_PHASE_LABELS[p]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mon-notes">Notes</Label>
              <Textarea
                id="mon-notes"
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observations ponctuelles…"
                rows={2}
                value={notes}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCancel} variant="outline">
            Annuler
          </Button>
          <Button onClick={() => void handleSubmit()}>Enregistrer</Button>
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
