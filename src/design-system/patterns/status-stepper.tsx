import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@/lib/hugeicons";
import { ActionButton, SignalBadge } from "../primitives";
import type { AppointmentStatus } from "@/types/db";
const labels: Record<AppointmentStatus, string> = {
  scheduled: "Planifié",
  confirmed: "Confirmé",
  arrived: "Arrivé",
  waiting: "En attente",
  in_progress: "En consultation",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
};
export function StatusStepper({
  status,
  busy,
  onAdvance,
  onBill,
}: {
  status: AppointmentStatus;
  busy?: boolean;
  onAdvance: (status: AppointmentStatus) => void;
  onBill?: () => void;
}) {
  const next: AppointmentStatus | undefined =
    status === "scheduled" || status === "confirmed"
      ? "arrived"
      : status === "arrived" || status === "waiting"
        ? "in_progress"
        : status === "in_progress"
          ? "completed"
          : undefined;
  const nextLabel =
    next === "arrived"
      ? "Arrivé"
      : next === "in_progress"
        ? "Démarrer"
        : "Terminer";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SignalBadge
        tone={
          status === "completed"
            ? "positive"
            : status === "in_progress"
              ? "info"
              : "quiet"
        }
      >
        {labels[status]}
      </SignalBadge>
      {next ? (
        <ActionButton
          quiet
          disabled={busy}
          onClick={() => onAdvance(next)}
          className="h-7 px-2 text-[11px] transition-[background-color,scale]"
        >
          {busy ? "Enregistrement…" : nextLabel}
          <HugeiconsIcon icon={ArrowRight01Icon} size={12} strokeWidth={1.5} />
        </ActionButton>
      ) : status === "completed" && onBill ? (
        <ActionButton quiet disabled={busy} onClick={onBill} className="h-7 px-2 text-[11px]">
          Facturer
        </ActionButton>
      ) : null}
    </div>
  );
}
