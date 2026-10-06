import { useState } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "framer-motion";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { FittedAmount } from "@/shared/ui/fitted-amount";
import type { ReceiptsBucket } from "../v2/receipts-series";
import "./receipts-chart.css";

const money = (value: number) => `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DA`;
const series = [
  { key: "invoices", label: "Factures encaissées", color: "var(--receipts-invoices)" },
  { key: "manual", label: "Hors facture encaissé", color: "var(--receipts-manual)" },
  { key: "pending", label: "À encaisser", color: "var(--receipts-pending)" },
] as const;
const config = Object.fromEntries(series.map(s => [s.key, { label: s.label, color: s.color }]));

export function ReceiptsChart({ data, total, collected, unavailable }: { data: ReceiptsBucket[]; total: number; collected: number; unavailable: boolean }) {
  const reducedMotion = useReducedMotion();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const highlighted = hoverKey ?? selectedKey;
  const totals = series.map(s => ({ ...s, value: data.reduce((sum, row) => sum + row[s.key], 0) }));
  const rate = total > 0 ? Math.min(total > collected ? 99 : 100, Math.round(collected / total * 100)) : null;
  return (
    <div className="receipts-analytics">
      <div className="receipts-summary">
        <div><span>Recettes nettes</span><FittedAmount value={unavailable ? "—" : money(total)} maxFontSize={30} /></div>
        <span className="receipts-rate">{unavailable || rate === null ? "—" : `${rate} % encaissé`}</span>
      </div>
      <div className="receipts-legend" aria-label="Répartition des recettes">
        {totals.map(s => <button key={s.key} type="button" className="receipts-series-button" aria-label={`Mettre en évidence ${s.label.toLocaleLowerCase("fr-FR")}`} aria-pressed={selectedKey === s.key} data-highlighted={highlighted === s.key || undefined} onClick={() => setSelectedKey(key => key === s.key ? null : s.key)} onMouseEnter={() => setHoverKey(s.key)} onMouseLeave={() => setHoverKey(null)} onFocus={() => setHoverKey(s.key)} onBlur={() => setHoverKey(null)}><span><i style={{ background: s.color }} />{s.label}</span><FittedAmount value={unavailable ? "—" : money(s.value)} maxFontSize={19} /></button>)}
      </div>
      {unavailable || total <= 0 ? (
        <div className="receipts-chart-empty" role="status">{unavailable ? "Le graphique sera disponible après actualisation." : "Aucune recette sur cette période."}</div>
      ) : (
        <ChartContainer config={config} className="receipts-chart" initialDimension={{ width: 600, height: 148 }} aria-label="Évolution des recettes : factures encaissées, recettes hors facture encaissées et montants à encaisser">
          <LineChart data={data} accessibilityLayer margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
            <XAxis dataKey="label" tick={{ fill: "var(--analysis-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={9} minTickGap={12} height={30} />
            <YAxis tick={{ fill: "var(--analysis-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={8} width={40} scale="sqrt" domain={[0, "auto"]} tickCount={4} tickFormatter={v => new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(v)} />
            <ChartTooltip cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.45, strokeDasharray: "3 4" }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as ReceiptsBucket;
              return <div className="receipts-tooltip"><strong>{row.detail}</strong>{series.map(s => <div key={s.key}><span><i style={{ background: s.color }} />{s.label}</span><b>{money(row[s.key])}</b></div>)}<div className="receipts-tooltip-total"><span>Recettes nettes</span><b>{money(row.invoices + row.manual + row.pending)}</b></div></div>;
            }} />
            {series.map(s => <Line key={s.key} dataKey={s.key} name={s.label} type="monotone" stroke={s.color} strokeWidth={highlighted === s.key ? 3 : 2.25} strokeOpacity={!highlighted || highlighted === s.key ? 1 : 0.18} strokeDasharray={s.key === "pending" ? "4 3" : undefined} dot={{ r: 2, fill: s.color, strokeWidth: 0, opacity: !highlighted || highlighted === s.key ? 1 : 0.18 }} activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }} isAnimationActive={!reducedMotion} animationDuration={250} />)}
          </LineChart>
        </ChartContainer>
      )}
      <div className="receipts-chart-note"><span>Montants en DA · échelle √</span><span>Survolez une courbe ou sa légende</span></div>
    </div>
  );
}
