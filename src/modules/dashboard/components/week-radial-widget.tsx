import { useMemo, useState } from "react";
import { RadialDots } from "@/components/ui/radial-dots";
import { formatNumber } from "@/utils/display-format";
import {
  buildWeekRadial,
  RADIAL_VIEWS,
  WEEK_STATES,
  type RadialView,
  type buildWeekFacts,
} from "../model/week-radial";
import { ViewSwitch } from "./view-switch";

const COLORS = {
  done: "var(--tone-blue)",
  underway: "var(--foreground)",
  upcoming: "color-mix(in oklab, var(--foreground) 45%, transparent)",
} as const;
const LONG_DAYS = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
];

/**
 * « Cette semaine »: the week's consultations on a ring of dots, by hour of the day or by day of the week, stacked by what
 * became of them (terminés, en cours, à venir). The week's figure is at the centre; its receipts and the settled share of the
 * invoices sit under the ring. The window is Monday to the end of today.
 */
export function WeekRadialWidget({
  appointments,
  facts,
  now,
}: {
  appointments: { startTime?: string | null; status: string }[];
  facts: ReturnType<typeof buildWeekFacts>;
  now: Date;
}) {
  const [view, setView] = useState<RadialView>("weekday");
  const radial = useMemo(
    () => buildWeekRadial(appointments, now),
    [appointments, now],
  );
  const sectors = radial[view === "hour" ? "hour" : "weekday"];
  const hourly = view === "hour";

  return (
    <RadialDots
      axis={hourly ? [0, 6, 12, 18] : [0, 1, 2, 3, 4, 5, 6]}
      center={{
        value: formatNumber(radial.total),
        caption: radial.total > 1 ? "consultations" : "consultation",
      }}
      className="weekRadial"
      format={(value) =>
        `${formatNumber(value)} ${value > 1 ? "rendez-vous" : "rendez-vous"}`
      }
      labels={sectors.labels}
      sectorTitle={(index) =>
        hourly
          ? `${sectors.labels[index].replace("h", "")} h`
          : LONG_DAYS[index]
      }
      series={WEEK_STATES.map((state) => ({
        id: state.id,
        label: state.label,
        values: sectors.values[state.id],
        color: COLORS[state.id],
      }))}
      subtitle={`Depuis ${facts.since.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}`}
      title="Cette semaine"
      toolbar={
        <ViewSwitch<RadialView>
          label="Vue de la semaine"
          onChange={setView}
          options={RADIAL_VIEWS}
          value={view}
        />
      }
    ></RadialDots>
  );
}
