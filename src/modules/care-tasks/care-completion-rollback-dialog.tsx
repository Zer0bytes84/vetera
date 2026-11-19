import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CareTask } from "./domain";

export function CareCompletionRollbackDialog({
  task,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  task: CareTask;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const reasonId = useId();
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!(open || busy)) {
          onClose();
        }
      }}
      open
    >
      <DialogContent className="care-page sm:max-w-[480px] sm:p-6">
        <DialogHeader>
          <DialogTitle>Annuler la validation ?</DialogTitle>
          <DialogDescription>
            Le soin « {task.label} » repassera à faire. Le stock consommé sera
            restitué et la facture associée sera annulée. L’historique sera
            conservé.
          </DialogDescription>
        </DialogHeader>
        <form
          aria-busy={busy}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && reason.trim()) {
              onConfirm(reason.trim());
            }
          }}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={reasonId}>
              Motif de la correction
            </label>
            <textarea
              className="min-h-24 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={busy}
              id={reasonId}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Expliquez pourquoi cette validation doit être annulée…"
              required
              value={reason}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Si la facture comporte un règlement ou un avoir, régularisez-la
            d’abord dans Finances.
          </p>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="min-h-11 whitespace-normal"
              disabled={busy}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Conserver la validation
            </Button>
            <Button
              className="min-h-11 whitespace-normal"
              disabled={busy || !reason.trim()}
              type="submit"
              variant="destructive"
            >
              {busy ? "Annulation…" : "Annuler la validation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
