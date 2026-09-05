import { ArrowUpRight, Grid2X2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DashboardMetrics } from "@/lib/metrics";
import { formatCurrency } from "./model";
import { WidgetShell } from "./widget-shell";

const intensity = (value: number) =>
  value === 0 ? 0 : value < 3 ? 1 : value < 5 ? 2 : value < 8 ? 3 : 4;

export function ActivityContributionsWidget({
  metrics,
  onOpenAnalytics,
}: {
  metrics: DashboardMetrics;
  onOpenAnalytics?: () => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const cells = useRef<Array<HTMLButtonElement | null>>([]);
  const days = metrics.activityYear;
  const match = days.findIndex(
    (day) => day.date.toDateString() === selectedKey
  );
  const selectedIndex = match >= 0 ? match : days.length - 1;
  const selected = days[selectedIndex];
  const offset = days[0] ? (days[0].date.getDay() + 6) % 7 : 0;
  const columns = Math.ceil((days.length + offset) / 7);
  const total = days.reduce((sum, day) => sum + day.value, 0);
  const revenue = days.reduce((sum, day) => sum + day.revenue, 0);
  const active = days.filter((day) => day.value > 0).length;
  const peak = Math.max(0, ...days.map((day) => day.value));
  let run = 0;
  let streak = 0;
  for (const day of days) {
    run = day.value > 0 ? run + 1 : 0;
    streak = Math.max(streak, run);
  }
  const months = days.flatMap((day, index) =>
    index === 0 || day.date.getDate() === 1
      ? [
          {
            label: day.date.toLocaleDateString("fr-FR", { month: "short" }),
            column: Math.floor((index + offset) / 7),
          },
        ]
      : []
  );
  return (
    <WidgetShell
      accent="violet"
      title="Activité cette année"
      description="Consultations quotidiennes"
      icon={Grid2X2}
      contentClassName="p-0"
    >
      <div className="annual-activity-surface mx-4 mb-4 rounded-xl p-4">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-medium tabular-nums">
              {total}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                consultations
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              12 derniers mois
            </p>
          </div>
          <span className="rounded-md bg-violet-200/70 px-2 py-1 font-medium text-[11px] text-violet-800 dark:bg-violet-400/15 dark:text-violet-200">
            Annuel
          </span>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { value: active, label: "Jours actifs" },
            { value: peak, label: "Pic journalier" },
            { value: `${streak} j`, label: "Plus longue série" },
            { value: formatCurrency(revenue), label: "Encaissements" },
          ].map((stat) => (
            <div key={stat.label} className="min-w-0 rounded-xl bg-card p-3">
              <p className="font-medium text-base tabular-nums">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="w-full pb-1">
          <div
            className="annual-contributions grid grid-flow-col grid-rows-7 gap-1"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
            aria-label="Utilisez les flèches pour parcourir les jours"
          >
            {Array.from({ length: offset }, (_, index) => (
              <span key={`pad-${index}`} aria-hidden="true" />
            ))}
            {days.map((day, index) => (
              <button
                key={day.date.toISOString()}
                type="button"
                className="annual-contribution-cell rounded-[3px] outline-none hover:brightness-90 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                data-level={intensity(day.value)}
                aria-pressed={selectedIndex === index}
                aria-label={`${day.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} : ${day.value} consultations`}
                title={`${day.date.toLocaleDateString("fr-FR")} · ${day.value} consultations · ${formatCurrency(day.revenue)} encaissés`}
                tabIndex={selectedIndex === index ? 0 : -1}
                ref={(element) => {
                  cells.current[index] = element;
                }}
                onClick={() => setSelectedKey(day.date.toDateString())}
                onFocus={() => setSelectedKey(day.date.toDateString())}
                onMouseEnter={() => setSelectedKey(day.date.toDateString())}
                onKeyDown={(event) => {
                  const delta = (
                    {
                      ArrowLeft: -7,
                      ArrowRight: 7,
                      ArrowUp: -1,
                      ArrowDown: 1,
                    } as Record<string, number>
                  )[event.key];
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? days.length - 1
                        : delta !== undefined
                          ? Math.max(
                              0,
                              Math.min(days.length - 1, index + delta)
                            )
                          : null;
                  if (next !== null) {
                    event.preventDefault();
                    cells.current[next]?.focus();
                  }
                }}
              />
            ))}
          </div>
          <div
            className="mt-2 grid text-[11px] text-muted-foreground"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`,
            }}
          >
            {months
              .filter(
                (month, index) =>
                  index === 0 || month.column - months[index - 1].column >= 3
              )
              .map((month, index) => (
                <span
                  key={index}
                  style={{
                    gridColumn: `${month.column + 1} / span ${Math.min(3, columns - month.column)}`,
                  }}
                >
                  {month.label}
                </span>
              ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <p className="text-muted-foreground">
            {selected?.date.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            <span className="ml-2 font-medium text-foreground">
              {selected?.value ?? 0} consultation
              {(selected?.value ?? 0) > 1 ? "s" : ""} ·{" "}
              {formatCurrency(selected?.revenue ?? 0)}
            </span>
          </p>
          <div
            className="flex items-center gap-1"
            aria-label="Intensité de 0 à 8 consultations et plus"
          >
            <span className="mr-1 text-muted-foreground">0</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span
                key={level}
                className="annual-contribution-cell size-3.5 rounded-[3px]"
                data-level={level}
              />
            ))}
            <span className="ml-1 text-muted-foreground">8+</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-5 pb-4 text-[11px] text-muted-foreground">
        <span>Hors annulations et absences</span>
        <Button onClick={onOpenAnalytics} size="xs" variant="ghost">
          Rapport
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </div>
    </WidgetShell>
  );
}
