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
/** A visit's status, and the way to Flux, where it moves on. */
export function StatusStepper({
  status,
  onFlux,
}: {
  status: AppointmentStatus;
  onFlux?: () => void;
}) {
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
      {onFlux && status !== "cancelled" && status !== "no_show" ? (
        <ActionButton
          quiet
          onClick={onFlux}
          className="h-7 px-2 t-12 transition-[background-color,scale]"
          title="Suivre cette visite dans Flux"
        >
          Dans Flux
          <HugeiconsIcon icon={ArrowRight01Icon} size={12} strokeWidth={1.5} />
        </ActionButton>
      ) : null}
    </div>
  );
}
