import { useMemo } from "react";
import { SlotPicker, type Slot } from "@/components/ui/slot-picker";
import { formatNumber } from "@/utils/display-format";
import { buildFreeSlots, type FreeSlot } from "../model/free-slots";

const DAYS = 5;

/**
 * « Agenda rapide »: the next five days' really free half hours, from the agenda. Choosing one and confirming opens the new
 * appointment form on that day and time (and on the veterinarian who is free then).
 */
export function QuickAgendaWidget({
  appointments,
  vets,
  now,
  onCreate,
}: {
  appointments: { startTime: string; endTime: string; status: string; vetId: string }[];
  vets: { id: string }[];
  now: Date;
  onCreate: (slot: FreeSlot) => void;
}) {
  const model = useMemo(() => buildFreeSlots({ appointments: appointments as never, vets, now, days: DAYS }), [appointments, vets, now]);
  const byId = useMemo(() => new Map(model.slots.map((slot) => [slot.id, slot])), [model]);
  const totalFree = Object.values(model.free).reduce((n, v) => n + v, 0);
  const slots: Slot[] = model.slots.map(({ id, day, start, end }) => ({ id, day, start, end }));

  return (
    <SlotPicker
      className="quickAgenda"
      confirmLabel="Créer le rendez-vous"
      days={model.days}
      footer={
        <p className="text-xs text-muted-foreground">
          {totalFree
            ? `${formatNumber(totalFree)} créneau${totalFree > 1 ? "x" : ""} libre${totalFree > 1 ? "s" : ""} sur ${DAYS} jours`
            : `Aucun créneau libre sur ${DAYS} jours`}
          {` · de ${model.window.from} h à ${model.window.to} h`}
          {model.window.basis === "default" ? " (heures par défaut)" : " (d’après vos rendez-vous)"}
        </p>
      }
      onConfirm={(slot) => {
        const full = byId.get(slot.id);
        if (full) onCreate(full);
      }}
      slots={slots}
      subtitle="Créneaux libres des 5 prochains jours"
      title="Agenda rapide"
    />
  );
}
