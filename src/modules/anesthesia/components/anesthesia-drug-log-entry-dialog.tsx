import { useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";

import { Pill } from "@phosphor-icons/react";

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
import { useAnesthesiaDrugLogRepository } from "@/data/repositories";
import type { AnesthesiaPhase, AnesthesiaRoute, AnesthesiaSheet } from "@/types/db";

import { ANESTHESIA_PHASE_LABELS, ANESTHESIA_ROUTE_LABELS } from "../lib/format";

const PHASES: AnesthesiaPhase[] = ["premed", "induction", "maintenance", "recovery"];
const ROUTES: AnesthesiaRoute[] = ["IM", "SC", "IV", "IO", "IR", "PO", "IN"];

function defaultState() {
  return {
    drugName: "",
    dose: "",
    route: "IV" as AnesthesiaRoute,
    phase: "induction" as AnesthesiaPhase,
    notes: "",
  };
}

export function AnesthesiaDrugLogEntryDialog({
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
  const repo = useAnesthesiaDrugLogRepository();
  const initial = defaultState();
  const [drugName, setDrugName] = useState(initial.drugName);
  const [dose, setDose] = useState(initial.dose);
  const [route, setRoute] = useState<AnesthesiaRoute>(initial.route);
  const [phase, setPhase] = useState<AnesthesiaPhase>(initial.phase);
  const [notes, setNotes] = useState(initial.notes);

  const resetForm = () => {
    const fresh = defaultState();
    flushSync(() => {
      setDrugName(fresh.drugName);
      setDose(fresh.dose);
      setRoute(fresh.route);
      setPhase(fresh.phase);
      setNotes(fresh.notes);
    });
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!drugName.trim()) return;
    await repo.add({
      anesthesiaSheetId: sheet.id,
      administeredAt: new Date().toISOString(),
      phase,
      drugName: drugName.trim(),
      dose: dose.trim() || null,
      route,
      administeredBy: null,
      notes: notes.trim() || null,
    });
    onCreated?.();
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10">
              <Pill className="size-5 text-violet-600" weight="duotone" />
            </div>
            <div>
              <DialogTitle>
                {t("modules.anesthesia.drugLog.addEntry", "Ajouter un médicament")}
              </DialogTitle>
              <DialogDescription>{sheet.procedureName}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="drug-name">
              {t("modules.anesthesia.drugLog.drug", "Médicament")} *
            </Label>
            <Input
              id="drug-name"
              onChange={(e) => setDrugName(e.target.value)}
              placeholder="Ex. Morphine, Propofol, Cefazoline…"
              value={drugName}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="drug-dose">
                {t("modules.anesthesia.drugLog.dose", "Dose")}
              </Label>
              <Input
                id="drug-dose"
                onChange={(e) => setDose(e.target.value)}
                placeholder="0,2 mg/kg"
                value={dose}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="drug-route">
                {t("modules.anesthesia.drugLog.route", "Voie")}
              </Label>
              <NativeSelect
                id="drug-route"
                onChange={(e) => setRoute(e.target.value as AnesthesiaRoute)}
                value={route}
              >
                {ROUTES.map((r) => (
                  <NativeSelectOption key={r} value={r}>
                    {ANESTHESIA_ROUTE_LABELS[r]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="drug-phase">
                {t("modules.anesthesia.phases.premed", "Phase")}
              </Label>
              <NativeSelect
                id="drug-phase"
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
          </div>
          <div className="grid gap-2">
            <Label htmlFor="drug-notes">
              {t("modules.anesthesia.drugLog.notes", "Notes")}
            </Label>
            <Textarea
              id="drug-notes"
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Réaction, bolus complémentaire, surveillance accrue…"
              rows={2}
              value={notes}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCancel} variant="outline">
            Annuler
          </Button>
          <Button
            disabled={!drugName.trim()}
            onClick={() => void handleSubmit()}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
