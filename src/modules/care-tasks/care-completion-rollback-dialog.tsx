import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CareTask } from "./domain";

export function CareCompletionRollbackDialog({task, busy, error, onClose, onConfirm}: {
  task: CareTask;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const reasonId = useId();
  return <Dialog open onOpenChange={open => {if (!open && !busy) onClose();}}>
    <DialogContent className="care-page sm:max-w-[480px] sm:p-6">
      <DialogHeader>
        <DialogTitle>Annuler la validation ?</DialogTitle>
        <DialogDescription>
          Le soin « {task.label} » repassera à faire. Le stock consommé sera restitué et la facture associée sera annulée. L’historique sera conservé.
        </DialogDescription>
      </DialogHeader>
      <form className="space-y-4" aria-busy={busy} onSubmit={event => {
        event.preventDefault();
        if (!busy && reason.trim()) onConfirm(reason.trim());
      }}>
        <div className="space-y-2">
          <label htmlFor={reasonId} className="text-sm font-medium">Motif de la correction</label>
          <textarea id={reasonId} required disabled={busy} value={reason} onChange={event => setReason(event.target.value)}
            placeholder="Expliquez pourquoi cette validation doit être annulée…"
            className="min-h-24 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"/>
        </div>
        <p className="text-xs text-muted-foreground">Si la facture comporte un règlement ou un avoir, régularisez-la d’abord dans Finances.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" className="min-h-11 whitespace-normal" disabled={busy} onClick={onClose}>Conserver la validation</Button>
          <Button type="submit" variant="destructive" className="min-h-11 whitespace-normal" disabled={busy || !reason.trim()}>{busy ? "Annulation…" : "Annuler la validation"}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
