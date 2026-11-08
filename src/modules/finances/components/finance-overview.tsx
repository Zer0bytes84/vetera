import { useMemo, useState } from "react";
import { ChartCard } from "@/components/ui/chart-card";
import { Segmented } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import {
  ANALYTICS_PERIODS,
  analyticsRanges,
  trendBuckets,
  type AnalyticsPeriod,
  type AnalyticsRange,
} from "@/modules/dashboard/model/premium-analytics";
import type { Transaction } from "@/types/db";
import { formatDinars } from "@/utils/display-format";
import { useIssuedInvoiceLines } from "../hooks/use-issued-invoice-lines";
import { invoicedByNature } from "../invoice-natures";

const PERIODS = ANALYTICS_PERIODS.filter((period) => period.value !== "today");

function paidIncome(transactions: Transaction[], range: AnalyticsRange) {
  return transactions
    .filter((t) => t.type === "income" && t.status === "paid" && t.date)
    .filter((t) => {
      const date = new Date(t.date);
      return date >= range.from && date <= range.to;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

function Change({ value, previous }: { value: number; previous: number }) {
  if (previous === 0) {
    return <span className="text-xs text-muted-foreground">{value === 0 ? "Rien sur les deux périodes" : "Rien sur la période précédente"}</span>;
  }
  const change = ((value - previous) / previous) * 100;
  return (
    <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      <span className={cn("font-medium", change > 0 && "text-positive", change < 0 && "text-negative")}>
        {change > 0 ? "+" : ""}
        {change.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
      </span>
      <span>contre {formatDinars(previous / 100, 0)}</span>
    </span>
  );
}

/**
 * Income at a glance: the period's total and its change, the period chosen inside the card, the curve against the previous
 * period, then what was invoiced by nature. Shown by the Clean skin only (data-clean-only); it reads the same journal and
 * invoices as the rest. The card is the shared ChartCard (grey band, white panel); only its footer is this page's.
 */
export function FinanceOverview({ transactions }: { transactions: Transaction[] }) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const now = useMemo(() => new Date(), []);
  const ranges = useMemo(() => analyticsRanges(period, now), [period, now]);
  const lines = useIssuedInvoiceLines(ranges.previous.from, ranges.current.to);

  const current = paidIncome(transactions, ranges.current);
  const previous = paidIncome(transactions, ranges.previous);
  const points = useMemo(() => {
    const buckets = trendBuckets(period, ranges.current);
    const before = trendBuckets(period, ranges.previous);
    return buckets.map((bucket, index) => ({
      label: bucket.from.toLocaleDateString("fr-FR", period === "12m" ? { month: "short" } : { day: "numeric", month: "short" }),
      value: paidIncome(transactions, bucket) / 100,
      previous: before[index] ? paidIncome(transactions, before[index]) / 100 : null,
    }));
  }, [period, ranges, transactions]);
  const natures = Array.isArray(lines) ? invoicedByNature(lines, ranges) : null;
  const invoiced = natures?.reduce((sum, row) => sum + row.value, 0) ?? 0;

  return (
    <section aria-label="Vue d’ensemble des encaissements" className="finance-overview min-w-0" data-clean-only="">
      <ChartCard
        className="max-w-none"
        data={{
          labels: points.map((point) => point.label),
          series: [
            { id: "current", label: "Encaissements", values: points.map((point) => point.value), valueFormat: (value) => formatDinars(value, 0) },
            // The previous period, quiet: a null stays a gap in the journal and reads as nothing here.
            { id: "previous", label: "Période précédente", values: points.map((point) => point.previous ?? 0), color: "var(--muted-foreground)", valueFormat: (value) => formatDinars(value, 0) },
          ],
        }}
        footer={
          <div className="flex flex-col gap-6 pt-3">
            <Change previous={previous} value={current} />
            <div className="flex flex-col gap-3 border-t border-border pt-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[0.8125rem] font-medium">Facturé par nature</h3>
                {natures ? <span className="text-[0.8125rem] font-medium tabular-nums">{formatDinars(invoiced / 100, 0)}</span> : null}
              </div>
              {natures ? (
                <ul className="flex flex-col divide-y divide-border">
                  {natures.map((row) => (
                    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 py-3 first:pt-0" key={row.key}>
                      <span className="text-[0.8125rem] font-medium">{row.label}</span>
                      <strong className="text-right text-[0.8125rem] font-medium tabular-nums">{formatDinars(row.value / 100, 0)}</strong>
                      <span className="col-span-2 justify-self-end">
                        <Change previous={row.previous} value={row.value} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {lines === "error" ? "Les factures n’ont pas pu être lues." : "Chargement des factures…"}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Facturé : factures émises sur la période, avant avoirs. Encaissé : écritures réglées du journal.</p>
            </div>
          </div>
        }
        height={220}
        subtitle="Écritures réglées, sur la période choisie"
        title="Encaissements"
        toolbar={
          <Segmented<AnalyticsPeriod>
            label="Période des encaissements"
            onValueChange={setPeriod}
            options={PERIODS.map((option) => ({ value: option.value, label: option.label }))}
            value={period}
          />
        }
        total={formatDinars(current / 100, 0)}
        type="line"
      />
    </section>
  );
}
