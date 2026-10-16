import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { suggestCareTasksFromPlan } from "./domain";
import { CareTaskForm } from "./care-task-form";
export function PlanCareTasks({
  plan,
  patientId,
}: {
  plan: string;
  patientId: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [saved, setSaved] = useState<number[]>([]);
  const suggestions = suggestCareTasksFromPlan(plan);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
          setSelected(null);
          setSaved([]);
        }}
      >
        Générer les tâches de suivi
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-medium text-[18px]">
              Tâches de suivi
            </DialogTitle>
            <DialogDescription>
              Propositions issues du Plan validé. Ajustez chaque soin et
              choisissez son horaire avant de confirmer.
            </DialogDescription>
          </DialogHeader>
          {selected === null ? (
            <div className="space-y-3">
              {suggestions.length ? (
                suggestions.map((s, i) => (
                  <div
                    className="flex items-center gap-3 rounded-xl border border-border p-3"
                    key={`${i}:${s.label}`}
                  >
                    <p className="min-w-0 flex-1 break-words text-[13px]">
                      {s.label}
                    </p>
                    <Button
                      variant="outline"
                      disabled={saved.includes(i)}
                      onClick={() => setSelected(i)}
                    >
                      {saved.includes(i) ? "Créé" : "Ajuster"}
                    </Button>
                  </div>
                ))
              ) : (
                <p>Aucun soin proposé dans ce Plan.</p>
              )}
            </div>
          ) : (
            <CareTaskForm
              key={selected}
              patientId={patientId}
              suggestion={suggestions[selected]}
              onCancel={() => setSelected(null)}
              onSaved={() => {
                setSaved((prev) => [...prev, selected]);
                setSelected(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
