import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CarePlanForm } from "./care-plan-form";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useFocus } from "@/contexts/focus-provider";
import { useUsersRepository } from "@/data/repositories";
import type { CareTask } from "@/modules/care-tasks/domain";
import { CARE_TASKS_CHANGED } from "@/modules/care-tasks/use-care-tasks";
import { staysService } from "./service";
import type { StayHistory, CarePlan } from "./store";
import { STAYS_CHANGED } from "./use-stays";
const eventLabels: Record<string, string> = { admission: "Admission", statut: "Changement de statut", emplacement: "Changement d’emplacement", constantes: "Relevé des constantes", plan: "Plan de soins", plan_modifie: "Plan de soins modifié", controle: "Contrôle à la sortie" };
const taskLabels = { a_faire: "À faire", en_cours: "En cours", fait: "Fait", annule: "Annulé" };
export function StayRecords({ stayId }: { stayId: string }) {
  const [tasks, setTasks] = useState<CareTask[]>([]), [history, setHistory] = useState<StayHistory[]>([]);
  const [plans, setPlans] = useState<CarePlan[]>([]), [editing, setEditing] = useState<CarePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { requestFocus } = useFocus();
  const users = useUsersRepository();
  const refresh = useCallback(async () => {
    try {
      const [records, events, schedules] = await Promise.all([staysService.tasks(stayId), staysService.history(stayId), staysService.plans(stayId)]);
      setTasks(records); setHistory(events); setPlans(schedules); setError(null);
    } catch { setError("Le suivi du séjour n’a pas pu être chargé."); }
  }, [stayId]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void refresh(); });
    const listener = () => { void refresh(); };
    window.addEventListener(STAYS_CHANGED, listener); window.addEventListener(CARE_TASKS_CHANGED, listener);
    return () => { active = false; window.removeEventListener(STAYS_CHANGED, listener); window.removeEventListener(CARE_TASKS_CHANGED, listener); };
  }, [refresh]);
  return <div className="space-y-5">
    {plans.length > 0 && <section className="space-y-3 rounded-2xl border border-[#F2F2F2] bg-card p-5 dark:border-border"><h3 className="text-[16px] font-medium">Plans de soins</h3>{plans.map(plan => <div key={plan.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3 text-[13px]"><div><p className="font-medium">{plan.label}</p><p className="mt-1 text-muted-foreground">Du {new Date(plan.starts_at).toLocaleDateString("fr-FR")} au {new Date(plan.ends_at).toLocaleDateString("fr-FR")} · {plan.active ? "Actif" : "Clos"}</p></div>{Boolean(plan.active) && <Button variant="outline" className="h-11" onClick={() => setEditing(plan)}>Modifier les soins futurs</Button>}</div>)}</section>}
    <Dialog open={editing !== null} onOpenChange={open => { if (!open) setEditing(null); }}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Modifier le plan de soins</DialogTitle><DialogDescription>Les soins déjà réalisés ou en cours et leur historique seront conservés.</DialogDescription></DialogHeader>{editing && <CarePlanForm key={editing.id} stayId={stayId} plan={editing} onSaved={() => setEditing(null)}/>}</DialogContent></Dialog>
    {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    <section className="space-y-3 rounded-2xl border border-[#F2F2F2] bg-card p-5 dark:border-border">
      <h3 className="text-[16px] font-medium">Soins du séjour</h3>
      {!tasks.length ? <p className="text-[13px] text-muted-foreground">Aucun soin planifié pour ce séjour.</p> : <ul className="max-h-80 overflow-y-auto">{tasks.map(task => <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3 text-[13px]">
        <div><p className="font-medium">{task.label}</p><p className="mt-1 text-muted-foreground">{new Date(task.heure_prevue).toLocaleString("fr-FR")} · {taskLabels[task.statut]}</p></div>
        <Button className="h-11" variant="outline" onClick={() => { requestFocus("care_task", task.id); window.location.hash = "#/clinique"; }}>Ouvrir le soin</Button>
      </li>)}</ul>}
    </section>
    <section className="space-y-3 rounded-2xl border border-[#F2F2F2] bg-card p-5 dark:border-border">
      <h3 className="text-[16px] font-medium">Historique du séjour</h3>
      <ol className="max-h-64 overflow-y-auto">{history.map(event => <li key={event.id} className="border-t py-3 text-[13px]"><p className="font-medium">{eventLabels[event.event] || "Mise à jour du séjour"}</p><p className="mt-1 text-muted-foreground">{new Date(event.changed_at).toLocaleString("fr-FR")} · {users.data.find(user => user.id === event.author_id)?.displayName || "Auteur enregistré"}</p>{event.reason && <p className="mt-1">{event.reason}</p>}</li>)}</ol>
    </section>
  </div>;
}
