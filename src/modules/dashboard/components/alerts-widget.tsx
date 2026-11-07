import { useMemo } from "react";
import { DivergingBars } from "@/components/ui/diverging-bars";
import { formatNumber } from "@/utils/display-format";
import {
  ALERT_CATEGORIES,
  buildAlertBars,
  type AlertReminder,
} from "../model/alert-bars";
import type { ComponentProps } from "react";

type Inputs = Pick<
  Parameters<typeof buildAlertBars>[0],
  "careTasks" | "products" | "patients" | "invoices" | "appointments"
> & { reminders: AlertReminder[] };

const COLORS = {
  reminders: "var(--tone-blue)",
  care: "var(--chart-teal)",
  stock: "var(--tone-violet)",
  receivables: "var(--tone-amber)",
  appointments: "var(--chart-indigo)",
} as const;

/**
 * « Alertes »: the clinic's open reminders, care and stock by day, the late ones hanging below the line in red (TuffUI's
 * Diverging Bars). A source that could not be read is named under the chart instead of silently counting zero.
 */
export function AlertsWidget({
  now,
  inputs,
  unavailable,
}: {
  now: Date;
  inputs: Inputs;
  /** Sources that failed to load, by name. */
  unavailable: string[];
}) {
  const model = useMemo(
    () => buildAlertBars({ now, ...inputs }),
    [now, inputs],
  );
  const series: ComponentProps<typeof DivergingBars>["series"] =
    ALERT_CATEGORIES.map((category) => ({
      id: category.id,
      label: category.label,
      values: model.chart.values[category.id],
      color: COLORS[category.id],
    }));

  return (
    <DivergingBars
      aside={
        model.lateAll ? (
          <span style={{ color: "var(--tone-rose)" }}>
            {formatNumber(model.lateAll)} en retard
            {model.olderLate
              ? ` · dont ${formatNumber(model.olderLate)} dans « Avant »`
              : ""}
          </span>
        ) : (
          "Rien en retard"
        )
      }
      below={{ id: "late", label: "En retard", values: model.chart.late }}
      className="alertsBars"
      footer={
        unavailable.length ? (
          <p className="text-xs text-muted-foreground">
            Non comptés : {unavailable.join(", ")} (chargement impossible).
          </p>
        ) : undefined
      }
      format={(value) => formatNumber(value)}
      headline={{
        value: formatNumber(model.open),
        caption: model.open > 1 ? "alertes à traiter" : "alerte à traiter",
      }}
      labels={model.chart.labels}
      marker={model.chart.todayIndex}
      series={series}
      subtitle="Rappels, soins, stock, créances et rendez-vous"
      title="Alertes"
      titles={model.chart.titles}
    />
  );
}
