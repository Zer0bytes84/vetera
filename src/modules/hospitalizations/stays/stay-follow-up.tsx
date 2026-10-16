import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { emitSQLiteDataChanged } from "@/hooks/useSQLite";
import { staysService } from "./service";

export function StayFollowUp({ stayId }: { stayId: string }) {
  const { currentUser } = useAuth();
  const [date, setDate] = useState("");
  const [task, setTask] = useState<{ id: string; due_date: string; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { setTask(await staysService.followUp(stayId)); }
    catch { setError("Le contrôle de sortie n’a pas pu être chargé."); }
    finally { setLoading(false); }
  }, [stayId]);
  useEffect(() => { void refresh(); }, [refresh]);
  return <section className="space-y-3 rounded-2xl border border-[#F2F2F2] bg-card p-5 dark:border-border">
    <h3 className="text-[16px] font-medium">Contrôle à la sortie</h3>
    {loading ? <p role="status" className="text-[13px] text-muted-foreground">Chargement du contrôle…</p> : task ?
      <p className="text-[13px]">Contrôle prévu le {new Date(`${task.due_date}T12:00:00`).toLocaleDateString("fr-FR")}. Retrouvez-le dans Rappels.</p> :
      <form className="flex flex-wrap items-end gap-3" onSubmit={async event => {
        event.preventDefault();
        if (!currentUser || busy || !date) return;
        setBusy(true); setError(null);
        try {
          await staysService.scheduleFollowUp(stayId, date, currentUser.id);
          emitSQLiteDataChanged("tasks");
          await refresh();
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Le contrôle n’a pas pu être planifié."); }
        finally { setBusy(false); }
      }}>
        <label className="space-y-2 text-[13px]">Date du contrôle<Input type="date" className="h-11" value={date} onChange={event => setDate(event.target.value)} required/></label>
        <Button type="submit" className="h-11" disabled={busy || !date || !currentUser}>{busy ? "Enregistrement…" : "Ajouter dans Rappels"}</Button>
      </form>}
    {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
  </section>;
}
