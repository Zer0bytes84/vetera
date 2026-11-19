import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useFocus } from "@/contexts/focus-provider";
import { suggestCareTasksFromPlan } from "./domain";
import { CareTaskForm } from "./care-task-form";
import { CARE_LIST_DAY_KEY } from "./use-care-tasks";

interface CreatedCareTask {
  index: number;
  label: string;
  scheduledAt: string;
}

function scheduleLabel(scheduledAt: string): string {
  const [day, time] = scheduledAt.split("T");
  const [year, month, date] = day.split("-").map(Number);
  const when = new Date(year, month - 1, date, 12).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `${when} à ${time}`;
}

export function PlanCareTasks({
  plan,
  patientId,
}: {
  plan: string;
  patientId: string;
}) {
  const { requestFocus } = useFocus();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [created, setCreated] = useState<CreatedCareTask[]>([]);
  const [confirmation, setConfirmation] = useState<CreatedCareTask | null>(
    null
  );
  const suggestions = suggestCareTasksFromPlan(plan);
  const createdAt = (index: number) =>
    created.find((entry) => entry.index === index);
  const remaining = suggestions.filter((_, index) => !createdAt(index)).length;
  const openCareList = () => {
    setOpen(false);
    const lastDay = created.at(-1)?.scheduledAt.slice(0, 10);
    if (lastDay) {
      sessionStorage.setItem(CARE_LIST_DAY_KEY, lastDay);
    }
    // Same route as the patient file: the clinical workspace opens its Soins tab filtered on this patient.
    requestFocus("care_patient", patientId);
    window.location.hash = "#/clinique";
  };
  return (
    <>
      <Button
        className="rounded-full px-4"
        onClick={() => {
          setOpen(true);
          setSelected(null);
          setCreated([]);
          setConfirmation(null);
        }}
        size="sm"
        variant="outline"
      >
        Générer les tâches de suivi
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[640px] sm:p-7">
          <DialogHeader>
            <DialogTitle>Tâches de suivi</DialogTitle>
            <DialogDescription>
              Propositions issues du Plan validé. Ajustez chaque soin et
              choisissez son horaire avant de confirmer.
            </DialogDescription>
          </DialogHeader>
          {confirmation ? (
            <div className="space-y-5" role="status">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0"
                  strokeWidth={1.5}
                />
                <div className="min-w-0 space-y-1">
                  <p className="t-14 font-medium">Soin planifié</p>
                  <p className="t-13 break-words">
                    « {confirmation.label} » est prévu le{" "}
                    {scheduleLabel(confirmation.scheduledAt)}. Il figure
                    maintenant dans la liste des soins du patient.
                  </p>
                </div>
              </div>
              <p className="t-13 text-muted-foreground">
                {remaining
                  ? `${remaining} proposition${remaining > 1 ? "s restent" : " reste"} à planifier.`
                  : "Toutes les propositions de ce Plan sont planifiées."}
              </p>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {remaining ? (
                  <Button
                    className="t-13 h-11 rounded-xl"
                    onClick={() => setConfirmation(null)}
                    variant="outline"
                  >
                    Planifier un autre soin
                  </Button>
                ) : (
                  <Button
                    className="t-13 h-11 rounded-xl"
                    onClick={() => setOpen(false)}
                    variant="outline"
                  >
                    Fermer
                  </Button>
                )}
                <Button className="t-13 h-11 rounded-xl" onClick={openCareList}>
                  Voir les soins du patient
                </Button>
              </div>
            </div>
          ) : selected === null ? (
            <div className="space-y-3">
              {suggestions.length ? (
                suggestions.map((s, i) => {
                  const done = createdAt(i);
                  return (
                    <div
                      className="flex items-center gap-3 rounded-xl border border-border p-3"
                      key={`${i}:${s.label}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="t-13 break-words">{s.label}</p>
                        {done && (
                          <p className="t-12 mt-1 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2
                              aria-hidden="true"
                              className="size-3.5"
                              strokeWidth={1.5}
                            />
                            Planifié le {scheduleLabel(done.scheduledAt)}
                          </p>
                        )}
                      </div>
                      {!done && (
                        <Button
                          onClick={() => setSelected(i)}
                          variant="outline"
                        >
                          Ajuster
                        </Button>
                      )}
                    </div>
                  );
                })
              ) : (
                <p>Aucun soin proposé dans ce Plan.</p>
              )}
              {created.length > 0 && (
                <div className="flex justify-end pt-1">
                  <Button
                    className="t-13 h-11 rounded-xl"
                    onClick={openCareList}
                    variant="outline"
                  >
                    Voir les soins du patient
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <CareTaskForm
              key={selected}
              onCancel={() => setSelected(null)}
              onSaved={(scheduledAt) => {
                const entry = {
                  index: selected,
                  label: suggestions[selected]?.label ?? "Soin",
                  scheduledAt: scheduledAt ?? "",
                };
                setCreated((prev) => [...prev, entry]);
                setSelected(null);
                if (entry.scheduledAt) {
                  setConfirmation(entry);
                  toast.success("Soin planifié", {
                    description: `${entry.label}, ${scheduleLabel(entry.scheduledAt)}.`,
                  });
                }
              }}
              patientId={patientId}
              suggestion={suggestions[selected]}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
