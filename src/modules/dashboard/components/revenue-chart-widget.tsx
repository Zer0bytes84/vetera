import { ArrowTrendingUpIcon, ChartBarIcon, ChartPieIcon, PresentationChartLineIcon } from "@heroicons/react/16/solid";
import { useMemo, useState, type ReactNode } from "react";
import { ChartCard, type ChartType } from "@/components/ui/chart-card";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/display-format";
import { buildKindsDonut, buildRevenueChart, money } from "../model/revenue-chart";
import type { VisitKindRow } from "../model/dashboard-widgets";
import type { FocusPoint } from "./focus-trend-chart";

const VIEWS: { value: ChartType; label: string; icon: typeof ChartBarIcon }[] = [
  { value: "line", label: "Courbe", icon: ArrowTrendingUpIcon },
  { value: "bar", label: "Barres", icon: ChartBarIcon },
  { value: "area", label: "Aires", icon: PresentationChartLineIcon },
  { value: "donut", label: "Répartition des consultations par type d’acte", icon: ChartPieIcon },
];

/**
 * The dashboard's chart: receipts and consultations on one chart (the default « Courbe »), or the
 * same data as bars or areas, or the period's consultations split by type of act. The header is the
 * model of the dashboard's widgets: an icon, the title, the period as context, the big figure on
 * the right (the period's receipts). Every figure comes from the app's records through `points`
 * and `kinds`; the period is chosen by the dashboard's date selector or the icon in the toolbar.
 */
export function RevenueChartWidget({
  points,
  rangeLabel,
  kinds,
  periodControl,
  footer,
}: {
  points: FocusPoint[];
  /** The period in force, « Du 9 oct. au 7 nov. 2026 ». */
  rangeLabel: string;
  /** The same period's visits by type of act. */
  kinds: VisitKindRow[];
  /** The calendar icon that picks the chart's days. */
  periodControl: ReactNode;
  /** The month's forecast and the card's footer. */
  footer: ReactNode;
}) {
  const [view, setView] = useState<ChartType>("line");
  const model = useMemo(() => buildRevenueChart(points), [points]);
  const donut = useMemo(() => buildKindsDonut(kinds), [kinds]);
  const isDonut = view === "donut";

  return (
    <section aria-label="Recettes & activité" className="recettesWidget">
      <ChartCard
        // Switching between the cartesian views keeps the legend's choices; the donut starts afresh.
        key={isDonut ? "donut" : "cartesian"}
        className="max-w-none"
        data={isDonut ? { labels: ["Période"], series: donut } : { labels: model.labels, series: model.series }}
        donutLabel="Consultations"
        footer={footer}
        format={(value) => formatNumber(value)}
        height={280}
        subtitle={isDonut ? `${rangeLabel} · consultations par type d’acte` : rangeLabel}
        title="Recettes & activité"
        toolbar={
          <>
            {periodControl}
            <div aria-label="Type de graphique" className="flex items-center gap-0.5" role="group">
              {VIEWS.map(({ value, label, icon: Icon }) => (
                <button
                  aria-label={label}
                  aria-pressed={view === value}
                  className={cn(
                    "grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors duration-150",
                    "hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1",
                    view === value && "bg-foreground/[0.08] text-foreground",
                  )}
                  key={value}
                  onClick={() => setView(value)}
                  type="button"
                >
                  <Icon aria-hidden="true" className="size-4" />
                </button>
              ))}
            </div>
          </>
        }
        tooltipNote={isDonut ? undefined : model.note}
        tooltipTitles={isDonut ? undefined : model.titles}
        total={money(model.totals.receipts)}
        type={view}
      />
    </section>
  );
}
