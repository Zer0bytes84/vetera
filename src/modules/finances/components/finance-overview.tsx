import { useMemo, useState } from "react";
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
    return <span className="finance-overview-context">{value === 0 ? "Rien sur les deux périodes" : "Rien sur la période précédente"}</span>;
  }
  const change = ((value - previous) / previous) * 100;
  return (
    <span className="finance-overview-change">
      <span data-sense={change > 0 ? "good" : change < 0 ? "bad" : "neutral"}>
        {change > 0 ? "+" : ""}
        {change.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
      </span>
      <span>contre {formatDinars(previous / 100, 0)}</span>
    </span>
  );
}

/**
 * Income at a glance (Portfolio overview reference): the period's total and
 * its change, the period chosen inside the card, the curve against the
 * previous period, then what was invoiced by nature. Shown by the Clean skin
 * only (data-clean-only); it reads the same journal and invoices as the rest.
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
  const tick = { fill: "var(--ink-muted)", fontSize: 12, fontFamily: "var(--app-font-sans)" };

  return (
    <section aria-label="Vue d’ensemble des encaissements" className="finance-overview board-frame" data-clean-only="">
      <div className="finance-overview-head">
        <div>
          <h2>Encaissements</h2>
          <p>Écritures réglées, sur la période choisie</p>
        </div>
        <div aria-label="Période des encaissements" className="finance-overview-periods" data-tabs-style="segmented" role="group">
          {PERIODS.map((option) => (
            <button aria-pressed={period === option.value} key={option.value} onClick={() => setPeriod(option.value)} type="button">
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="finance-overview-hero">
        <strong>{formatDinars(current / 100, 0)}</strong>
        <Change previous={previous} value={current} />
      </div>

      <div aria-label="Encaissements de la période, et de la période précédente en pointillé" className="finance-overview-plot" role="img">
        <ResponsiveContainer height="100%" minHeight={0} minWidth={0} width="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <XAxis axisLine={false} dataKey="label" minTickGap={24} tick={tick} tickLine={false} tickMargin={10} />
            <YAxis axisLine={false} tick={tick} tickFormatter={(value) => Number(value).toLocaleString("fr-FR", { notation: "compact" })} tickLine={false} width={48} />
            <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
              <div className="finance-analysis-tooltip">
                <span>{String(label)}</span>
                <strong>{formatDinars(Number(payload[0]?.payload?.value ?? 0), 0)}</strong>
                {payload[0]?.payload?.previous !== null ? (
                  <span>{formatDinars(Number(payload[0]?.payload?.previous ?? 0), 0)} la période précédente</span>
                ) : null}
              </div>
            ) : null} />
            <Line dataKey="previous" dot={false} isAnimationActive={false} stroke="var(--series-1, var(--premium-blue))" strokeDasharray="3 4" strokeOpacity={0.5} strokeWidth={1.5} type="monotone" />
            <Area activeDot={{ r: 4, fill: "var(--surface)", stroke: "var(--series-1, var(--premium-blue))", strokeWidth: 1 }} dataKey="value" fill="var(--series-1, var(--premium-blue))" fillOpacity={0.08} isAnimationActive={false} stroke="var(--series-1, var(--premium-blue))" strokeWidth={2} type="monotone" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="finance-overview-natures">
        <div className="finance-overview-natures-head">
          <h3>Facturé par nature</h3>
          {natures ? <span>{formatDinars(invoiced / 100, 0)}</span> : null}
        </div>
        {natures ? (
          <ul>
            {natures.map((row) => (
              <li key={row.key}>
                <span className="finance-overview-nature">{row.label}</span>
                <strong>{formatDinars(row.value / 100, 0)}</strong>
                <Change previous={row.previous} value={row.value} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="finance-overview-context">
            {lines === "error" ? "Les factures n’ont pas pu être lues." : "Chargement des factures…"}
          </p>
        )}
        <p className="finance-overview-footnote">Facturé : factures émises sur la période, avant avoirs. Encaissé : écritures réglées du journal.</p>
      </div>
    </section>
  );
}
