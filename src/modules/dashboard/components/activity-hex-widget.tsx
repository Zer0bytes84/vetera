import { useMemo } from "react";
import { HexDensity } from "@/components/ui/hex-density";
import { formatNumber } from "@/utils/display-format";
import { buildHexActivity } from "../model/hex-activity";

/**
 * « Activité de la clinique »: the month's appointments, one hexagon per day (TuffUI's Hex Density). Cancellations and no-shows
 * are not visits; days after today are booked, not happened.
 */
export function ActivityHexWidget({ appointments, now }: { appointments: { startTime?: string | null; status: string }[]; now: Date }) {
  const model = useMemo(() => buildHexActivity("month", appointments, now), [appointments, now]);
  const month = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <HexDensity
      binUnit="jours"
      cells={model.cells}
      className="activityHex"
      cols={model.cols}
      columnCaptions={model.columnCaptions}
      rows={model.rows}
      subtitle={`Rendez-vous par jour · ${month}`}
      summary={
        model.total
          ? `${formatNumber(model.total)} rendez-vous en ${month}, ${model.stats.map((s) => `${s.name} : ${s.value}`).join(". ")}.`
          : `Aucun rendez-vous en ${month}.`
      }
      title="Activité de la clinique"
      unit="rendez-vous"
    />
  );
}
