import "./patient-reminders.css";
import { useState } from "react";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormDialogBody, FormDialogContent, FormDialogFooter, FormDialogHeader } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { usePatientsRepository } from "@/data/repositories";
import { addCalendarMonths, assertDateOnly, isMedicalReminderType, localToday } from "./domain";
import type { MedicalReminderProposal, ReminderType } from "./store";

export function MedicalReminderDialog({
  editable = false,
  onClose,
  onConfirm,
  proposal,
  types = [],
}: {
  editable?: boolean;
  onClose: () => void;
  onConfirm: (draft: MedicalReminderProposal) => Promise<unknown>;
  proposal: MedicalReminderProposal;
  types?: ReminderType[];
}) {
  const patients = usePatientsRepository();
  const [draft, setDraft] = useState(proposal);
  const [months, setMonths] = useState(String(proposal.intervalleMois));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const patient = patients.data.find((entry) => entry.id === draft.patientId);
  const dueDate = new Date(`${draft.echeance}T12:00:00`);
  let valid = Boolean(draft.patientId && draft.type && Number.isInteger(Number(months)) && Number(months) >= 1 && Number(months) <= 120);
  try {
    assertDateOnly(draft.echeance);
    valid = valid && draft.echeance >= draft.dateActe;
  } catch {
    valid = false;
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <FormDialogContent size="sm" className="medical-reminder-dialog">
        <FormDialogHeader
          description={editable ? "Préparez une échéance préventive pour un patient." : "L’acte est enregistré. Confirmez ou ajustez la prochaine échéance."}
          icon={<CalendarDays strokeWidth={1} />}
          title={editable ? "Nouveau rappel médical" : "Proposer le prochain rappel"}
          tone="sky"
        />
        <form className="contents" onSubmit={async (event) => {
          event.preventDefault();
          if (!valid || busy) return;
          setBusy(true);
          setError(null);
          try {
            await onConfirm({ ...draft, intervalleMois: Number(months) });
            onClose();
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Le rappel n’a pas pu être créé.");
          } finally {
            setBusy(false);
          }
        }}>
          <FormDialogBody>
            <FieldGroup>
              {editable ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="medical-reminder-patient">Patient</FieldLabel>
                    <SearchableSelect
                      id="medical-reminder-patient"
                      label="Patient du rappel médical"
                      onValueChange={(patientId) => setDraft((current) => ({ ...current, patientId }))}
                      options={patients.data.map((entry) => ({ value: entry.id, label: `${entry.name} · ${entry.species}` }))}
                      placeholder="Rechercher un patient…"
                      value={draft.patientId}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="medical-reminder-type">Type de rappel</FieldLabel>
                    <SearchableSelect
                      id="medical-reminder-type"
                      label="Type du rappel médical"
                      onValueChange={(type) => {
                        const selected = types.find((entry) => entry.id === type);
                        if (!selected) return;
                        setMonths(String(selected.interval_months));
                        setDraft((current) => ({ ...current, type, typeLabel: selected.name, intervalleMois: selected.interval_months, echeance: addCalendarMonths(current.dateActe, selected.interval_months) }));
                      }}
                      options={types.filter((entry) => entry.active && isMedicalReminderType(entry)).map((entry) => ({ value: entry.id, label: entry.name }))}
                      placeholder="Choisir un type…"
                      value={draft.type}
                    />
                  </Field>
                </>
              ) : (
                <div className="medical-reminder-proposal-summary">
                  <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-primary" strokeWidth={1} />
                  <div className="min-w-0">
                    <p className="font-heading t-16 font-medium">{patient?.name ?? "Patient"} · {draft.typeLabel}</p>
                    <p className="mt-1 t-13 text-muted-foreground">Le rappel sera créé uniquement après votre confirmation.</p>
                  </div>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="medical-reminder-months">Intervalle</FieldLabel>
                  <Input
                    id="medical-reminder-months"
                    min={1} max={120} step={1} required
                    onChange={(event) => {
                      const value = event.target.value;
                      setMonths(value);
                      const interval = Number(value);
                      if (Number.isInteger(interval) && interval >= 1 && interval <= 120) {
                        setDraft((current) => ({ ...current, intervalleMois: interval, echeance: addCalendarMonths(current.dateActe, interval) }));
                      }
                    }}
                    type="number" value={months}
                  />
                  <FieldDescription>En mois, modifiable pour ce rappel</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="medical-reminder-due">Échéance</FieldLabel>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger
                      id="medical-reminder-due"
                      aria-label="Choisir l’échéance du rappel"
                      render={<Button className="medical-reminder-date-trigger w-full justify-start" type="button" variant="outline" />}
                    >
                      <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" strokeWidth={1} />
                      {Number.isFinite(dueDate.getTime()) ? dueDate.toLocaleDateString("fr-FR") : "Choisir une date"}
                    </PopoverTrigger>
                    <PopoverContent align="end" aria-label="Calendrier de l’échéance" className="medical-reminder-calendar w-auto p-2">
                      <Calendar
                        className="text-sm"
                        defaultMonth={Number.isFinite(dueDate.getTime()) ? dueDate : undefined}
                        disabled={{ before: new Date(`${draft.dateActe}T00:00:00`) }}
                        locale={fr}
                        mode="single"
                        onSelect={(date) => {
                          if (!date) return;
                          setDraft((current) => ({ ...current, echeance: localToday(date) }));
                          setCalendarOpen(false);
                        }}
                        required
                        selected={Number.isFinite(dueDate.getTime()) ? dueDate : undefined}
                      />
                    </PopoverContent>
                  </Popover>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="medical-reminder-note">Note utile <span className="text-muted-foreground font-normal">(facultatif)</span></FieldLabel>
                <Textarea id="medical-reminder-note" onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} rows={2} value={draft.note ?? ""} />
              </Field>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            </FieldGroup>
          </FormDialogBody>
          <FormDialogFooter>
            <Button disabled={busy} onClick={onClose} type="button" variant="outline">{editable ? "Annuler" : "Pas maintenant"}</Button>
            <Button disabled={busy || !valid} type="submit">{busy && <Spinner className="size-4" />}Créer le rappel</Button>
          </FormDialogFooter>
        </form>
      </FormDialogContent>
    </Dialog>
  );
}
