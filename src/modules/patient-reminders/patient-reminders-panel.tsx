import "./patient-reminders.css";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
  useOwnersRepository,
  usePatientsRepository,
  useUsersRepository,
} from "@/data/repositories";
import {
  CalendarDays,
  ArrowDown,
  CheckCircle2,
  Clock3,
  History,
  Phone,
  Printer,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { formatPhone } from "@/utils/display-format";
import { isMedicalReminderType, isReminderOverdue, localToday } from "./domain";
import { callsCsv, callsPrintHtml, type CallRow } from "./export";
import { patientRemindersService } from "./service";
import { announceMedicalReminderProposal } from "./medical-act-events";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogBody, FormDialogContent, FormDialogFooter, FormDialogHeader } from "@/components/ui/form-dialog";
import type {
  PatientReminder,
} from "./store";
import {
  announcePatientRemindersChanged,
  usePatientReminders,
} from "./use-patient-reminders";
import { DatePicker } from "@/components/ui/date-picker";

const field = "min-h-11 rounded-xl border border-border bg-background px-3 text-[13px]";

type PanelView = "active" | "completed" | "calls" | "types";
type ActionKind = "Annuler" | "Reporter" | "Traiter";

export function PatientRemindersPanel() {
  const model = usePatientReminders();
  return <PatientRemindersContent model={model} />;
}

export function PatientRemindersContent({
  embedded = false,
  includeManualTypes = false,
  model,
  view,
}: {
  embedded?: boolean;
  includeManualTypes?: boolean;
  model: ReturnType<typeof usePatientReminders>;
  view?: PanelView;
}) {
  const { error, loading, refresh, reminders } = model;
  const types = includeManualTypes ? model.types : model.types.filter(isMedicalReminderType);
  const patients = usePatientsRepository();
  const owners = useOwnersRepository();
  const users = useUsersRepository();
  const { currentUser } = useAuth();
  const [internalTab, setTab] = useState<PanelView>("active");
  const [type, setType] = useState("");
  const [action, setAction] = useState<{
    kind: ActionKind;
    reminder: PatientReminder;
  } | null>(null);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<{
    id: string;
    rows: Record<string, unknown>[];
  } | null>(null);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [months, setMonths] = useState("12");
  const [active, setActive] = useState(true);
  const tab = view ?? internalTab;
  const today = localToday();

  const rows = reminders.filter((reminder) => {
    if (type && reminder.type !== type) {
      return false;
    }
    if (tab === "completed") {
      return reminder.statut !== "en_cours";
    }
    if (tab === "calls") {
      return reminder.statut === "en_cours" && reminder.echeance <= today;
    }
    return reminder.statut === "en_cours";
  });

  const callRows = useMemo<CallRow[]>(
    () =>
      rows.map((reminder) => {
        const patient = patients.data.find(
          (entry) => entry.id === reminder.patient_id
        );
        const owner = owners.data.find(
          (entry) => entry.id === (reminder.client_id ?? patient?.ownerId)
        );
        return {
          dueDate: reminder.echeance,
          owner: owner
            ? `${owner.firstName} ${owner.lastName}`
            : "Propriétaire indisponible",
          patient: patient?.name || "Patient indisponible",
          phone: formatPhone(owner?.phone) || "Non renseigné",
          type:
            types.find((entry) => entry.id === reminder.type)?.name ||
            "Rappel médical",
        };
      }),
    [owners.data, patients.data, rows, types]
  );

  async function perform(operation: () => Promise<unknown>) {
    if (busy) {
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await operation();
      announcePatientRemindersChanged();
      await refresh();
      setAction(null);
      setEditingType(null);
    } catch (caught) {
      setNotice(
        caught instanceof Error
          ? caught.message
          : "L’action n’a pas pu être enregistrée."
      );
    } finally {
      setBusy(false);
    }
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([callsCsv(callRows)], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `appels-${today}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function print() {
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;width:0;height:0;border:0";
    frame.title = "Liste d’appels à imprimer";
    frame.srcdoc = callsPrintHtml(callRows);
    frame.onload = () => {
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 60_000);
    };
    document.body.appendChild(frame);
  }

  const overdueCount = reminders.filter((reminder) =>
    isReminderOverdue(reminder.statut, reminder.echeance, today)
  ).length;
  const todayCount = reminders.filter(
    (reminder) =>
      reminder.statut === "en_cours" && reminder.echeance === today
  ).length;

  return (
    <section
      aria-label="Rappels médicaux"
      className={
        embedded
          ? "patient-reminders-panel flex flex-col gap-3"
          : "patient-reminders-panel clinical-feature-surface space-y-4 p-4 sm:p-5"
      }
    >
      {!embedded && (
        <>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading text-[18px] font-medium">
                Rappels médicaux
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Échéances préventives liées aux actes des patients.
              </p>
            </div>
            <div className="flex gap-6 text-[12px]">
              <span>
                <strong className="block text-xl text-destructive tabular-nums">
                  {overdueCount}
                </strong>
                en retard
              </span>
              <span>
                <strong className="block text-xl text-primary tabular-nums">
                  {todayCount}
                </strong>
                dus aujourd’hui
              </span>
            </div>
          </div>
          <div
            aria-label="Vues des rappels médicaux"
            className="reminder-segments"
            role="tablist"
          >
            {[
              ["active", "En cours"],
              ["completed", "Terminés"],
              ["calls", "Rappels du jour"],
              ["types", "Types"],
            ].map(([value, label]) => (
              <button
                aria-selected={tab === value}
                className="reminder-segment"
                key={value}
                onClick={() => {
                  setTab(value as PanelView);
                  setAction(null);
                  setHistory(null);
                }}
                role="tab"
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {error && (
        <div className="flex items-center gap-3 text-[13px]" role="alert">
          {error}
          <Button className="min-h-11" onClick={() => void refresh()} variant="outline">
            Réessayer
          </Button>
        </div>
      )}
      {notice && !action && (
        <p className="text-[13px] text-destructive" role="alert">
          {notice}
        </p>
      )}

      {tab !== "types" && (
        <>
          {(!embedded || tab === "calls") && (
            <div className="flex flex-wrap items-center gap-3 border-border/70 border-b pb-3">
              <select
                aria-label="Type de rappel médical"
                className={field}
                onChange={(event) => setType(event.target.value)}
                value={type}
              >
                <option value="">Tous les types</option>
                {types.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
              {tab === "calls" && (
                <div className="ml-auto flex gap-2">
                  <Button className="min-h-11" disabled={!rows.length} onClick={print} variant="outline">
                    <Printer className="size-4" /> Imprimer
                  </Button>
                  <Button className="min-h-11" disabled={!rows.length} onClick={download} variant="outline">
                    <ArrowDown className="size-4" /> Exporter CSV
                  </Button>
                </div>
              )}
            </div>
          )}

          {!rows.length && (
            <p className="py-8 text-center text-[13px] text-muted-foreground">
              {loading ? "Chargement des rappels…" : "Aucun rappel médical dans cette vue."}
            </p>
          )}

          <div className="divide-y divide-border/70">
            {rows.map((reminder, index) => {
              const overdue = isReminderOverdue(
                reminder.statut,
                reminder.echeance,
                today
              );
              const dueToday =
                reminder.statut === "en_cours" && reminder.echeance === today;
              const contact = callRows[index];
              return (
                <article className="medical-reminder-row" data-medical-reminder-id={reminder.id} key={reminder.id}>
                  <div
                    className={`medical-reminder-date ${overdue ? "is-overdue" : dueToday ? "is-due" : ""}`}
                  >
                    {overdue ? <ShieldAlert /> : dueToday ? <Clock3 /> : <CalendarDays />}
                    <time dateTime={reminder.echeance}>{new Date(`${reminder.echeance}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</time>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-[14px]">{contact.patient}</h3>
                      <Badge variant="outline">Médical</Badge>
                      <Badge variant={overdue ? "destructive" : "secondary"}>
                        {contact.type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      {overdue
                        ? "En retard"
                        : dueToday
                          ? "Dû aujourd’hui"
                          : reminder.statut === "termine"
                            ? "Terminé"
                            : reminder.statut === "annule"
                              ? "Annulé"
                              : `Échéance le ${new Date(`${reminder.echeance}T12:00:00`).toLocaleDateString("fr-FR")}`}
                    </p>
                    {(
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
                        <span>{contact.owner}</span>
                        {contact.phone !== "Non renseigné" ? (
                          <a className="medical-phone-link" href={`tel:${contact.phone.replace(/\s/g, "")}`}>
                            <Phone className="size-4" /> {contact.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Téléphone non renseigné</span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="medical-reminder-row-actions">
                    {reminder.statut === "en_cours" && (
                      <>
                        <Button className="min-h-11" disabled={busy} onClick={() => {
                          setAction({ kind: "Traiter", reminder });
                          setDate(reminder.echeance);
                          setReason("");
                        }}>
                          <CheckCircle2 className="size-4" /> Traiter
                        </Button>
                        <Button className="min-h-11" disabled={busy} onClick={() => {
                          setAction({ kind: "Reporter", reminder });
                          setDate(reminder.echeance);
                          setReason("");
                        }} variant="outline">
                          <RotateCcw className="size-4" /> Reporter
                        </Button>
                        <Button className="min-h-11" disabled={busy} onClick={() => {
                          setAction({ kind: "Annuler", reminder });
                          setDate(reminder.echeance);
                          setReason("");
                        }} variant="ghost">
                          <XCircle className="size-4" /> Annuler
                        </Button>
                      </>
                    )}
                    <Button className="min-h-11" onClick={() => {
                      void patientRemindersService.history(reminder.id)
                        .then((records) => setHistory({ id: reminder.id, rows: records }))
                        .catch(() => setNotice("L’historique n’a pas pu être chargé."));
                    }} variant="ghost">
                      <History className="size-4" /> Historique
                    </Button>
                  </div>
                  {history?.id === reminder.id && (
                    <ol className="col-span-full mt-1 space-y-2 border-border/70 border-t pt-3 text-[12px] text-muted-foreground">
                      {history.rows.map((entry) => (
                        <li key={String(entry.id)}>
                          {new Date(String(entry.created_at)).toLocaleString("fr-FR")} · {users.data.find((user) => user.id === entry.author_id)?.displayName || "Auteur enregistré"} · {({ creation: "Création", migration: "Import du carnet vaccinal", traitement_acte: "Acte enregistré", traitement_manuel: "Rappel traité", annulation: "Annulation", report: "Report" } as Record<string, string>)[String(entry.action)] ?? "Mise à jour"}{entry.reason ? ` · ${String(entry.reason)}` : ""}
                        </li>
                      ))}
                    </ol>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      {action && (
        <Dialog open onOpenChange={(open) => { if (!open && !busy) setAction(null); }}>
          <FormDialogContent size="sm">
            <FormDialogHeader title={`${action.kind} ce rappel`} description="Mettez à jour le suivi de ce patient." icon={<CalendarDays strokeWidth={1} />} tone="sky" />
        <form
          aria-label={`${action.kind} le rappel`}
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            if (action.kind === "Reporter") {
              void perform(() => patientRemindersService.postpone(action.reminder.id, date, currentUser?.id || "", reason));
              return;
            }
            if (action.kind === "Annuler") {
              void perform(() => patientRemindersService.transition(action.reminder.id, "annule", currentUser?.id || "", reason));
              return;
            }
            void perform(async () => {
              await patientRemindersService.transition(action.reminder.id, "termine", currentUser?.id || "");
              announceMedicalReminderProposal(await patientRemindersService.nextProposal(action.reminder.id));
            });
          }}
        >
          <FormDialogBody className="space-y-4">
          {notice && <p className="text-[13px] text-destructive" role="alert">{notice}</p>}
          {action.kind === "Traiter" && (
            <p className="text-[13px] text-muted-foreground">
              Le rappel sera terminé. Vous pourrez ensuite planifier le suivant.
            </p>
          )}
          {action.kind === "Reporter" && (
            <label className="block text-[13px]">
              Nouvelle échéance
              <DatePicker className="mt-1 min-h-11" onChange={(value) => setDate(value)} required value={date} />
            </label>
          )}
          {action.kind !== "Traiter" && (
            <label className="block text-[13px]">
              Motif
              <Input className="mt-1 min-h-11" onChange={(event) => setReason(event.target.value)} required value={reason} />
            </label>
          )}
          </FormDialogBody>
          <FormDialogFooter>
            <Button className="min-h-11" disabled={busy} onClick={() => setAction(null)} type="button" variant="outline">Fermer</Button>
            <Button className="min-h-11" disabled={busy || !currentUser || (action.kind !== "Traiter" && !reason.trim())} type="submit">Confirmer</Button>
          </FormDialogFooter>
        </form>
          </FormDialogContent>
        </Dialog>
      )}

      {tab === "types" && (
        <>
          <div className="divide-y divide-border/70">
            {types.map((entry) => (
              <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3" key={entry.id}>
                <div>
                  <p className="font-medium text-[14px]">{entry.name}</p>
                  <p className="text-[13px] text-muted-foreground">{entry.interval_months} mois · {entry.active ? "Actif" : "Inactif"}</p>
                </div>
                <Button className="min-h-11" onClick={() => {
                  setEditingType(entry.id);
                  setName(entry.name);
                  setMonths(String(entry.interval_months));
                  setActive(Boolean(entry.active));
                }} variant="outline">Modifier</Button>
              </div>
            ))}
          </div>
          <Button className="min-h-11" onClick={() => {
            setEditingType("");
            setName("");
            setMonths("12");
            setActive(true);
          }} variant="outline">Ajouter un type</Button>
          {editingType !== null && (
            <form className="medical-reminder-action" onSubmit={(event) => {
              event.preventDefault();
              void perform(() => patientRemindersService.saveType({ active, id: editingType || undefined, intervalMonths: Number(months), name }, currentUser?.id || ""));
            }}>
              <label className="block text-[13px]">Nom<Input className="mt-1 min-h-11" onChange={(event) => setName(event.target.value)} required value={name} /></label>
              <label className="block text-[13px]">Intervalle en mois<Input className="mt-1 min-h-11" max="120" min="1" onChange={(event) => setMonths(event.target.value)} required step="1" type="number" value={months} /></label>
              <label className="flex min-h-11 items-center gap-2 text-[13px]"><input checked={active} onChange={(event) => setActive(event.target.checked)} type="checkbox" />Actif</label>
              <Button className="min-h-11" disabled={busy || !currentUser} type="submit">Enregistrer le type</Button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
