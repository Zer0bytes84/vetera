import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@/lib/hugeicons";
import type { AppointmentStatus } from "@/types/db";
import { ActionButton, SignalBadge } from "../primitives";

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
function stepperTone(status: AppointmentStatus): "positive" | "info" | "quiet" {
  switch (status) {
    case "completed":
      return "positive";
    case "in_progress":
      return "info";
    default:
      return "quiet";
  }
}

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
      <SignalBadge tone={stepperTone(status)}>{labels[status]}</SignalBadge>
      {onFlux && status !== "cancelled" && status !== "no_show" ? (
        <ActionButton
          className="t-12 h-7 px-2 transition-[background-color,scale]"
          onClick={onFlux}
          quiet
          title="Suivre cette visite dans Flux"
        >
          Dans Flux
          <HugeiconsIcon icon={ArrowRight01Icon} size={12} strokeWidth={1.5} />
        </ActionButton>
      ) : null}
    </div>
  );
}
