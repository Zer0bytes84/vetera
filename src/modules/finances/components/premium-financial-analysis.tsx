import { useState } from "react";
import { ArrowLeft, ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { percentageDelta, type DashboardMetrics } from "@/lib/metrics";
import type { View } from "@/types";
import { formatDinars } from "@/utils/display-format";
import "../finances-premium.css";

function Variation({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return <span className="finance-analysis-context">Sans valeur sur la période précédente</span>;
  }
  const delta = percentageDelta(current, previous);
  const Icon = delta < 0 ? ArrowDownRight : ArrowUpRight;
  return (
    <span className="finance-analysis-variation" data-direction={delta === 0 ? "equal" : delta < 0 ? "down" : "up"}>
      {delta !== 0 && <Icon size={14} strokeWidth={1} aria-hidden="true" />}
      <span>{delta > 0 ? "+" : ""}{delta.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %</span>
      <span>vs période précédente</span>
    </span>
  );
}

export function PremiumFinancialAnalysis({ metrics, onNavigate }: {
  metrics: DashboardMetrics;
  onNavigate: (view: View) => void;
}) {
  const [chart, setChart] = useState<"revenue" | "cashflow">("revenue");
  const revenue = chart === "revenue";
  const points = revenue
    ? metrics.monthlyRevenue.map(({ month, value }) => ({ label: month, value }))
    : metrics.cashflowSeries.map(({ name, value }) => ({ label: name, value }));
  const yearlyRevenue = metrics.monthlyRevenue.reduce((sum, item) => sum + item.value, 0);
  const chartTotal = points.reduce((sum, item) => sum + item.value, 0);
  const categories = metrics.topCategories.filter(({ value }) => value > 0);
  const tick = { fill: "var(--ink-muted)", fontSize: 12, fontFamily: "var(--app-font-sans)" };

  return (
    <div className="finance-analysis">
      <header className="finance-analysis-heading board-frame">
        <div>
          <h1>Analyse financière</h1>
          <p>Vos encaissements et votre trésorerie, à partir des écritures du journal.</p>
        </div>
        <Button variant="outline" onClick={() => onNavigate("finances")}>
          <ArrowLeft size={16} strokeWidth={1} aria-hidden="true" />
          Retour aux finances
        </Button>
      </header>

      <section className="finance-analysis-metrics board-frame" aria-label="Indicateurs financiers">
        <div className="finance-analysis-metric">
          <h2>Encaissements</h2>
          <strong>{formatDinars(metrics.summary.income30)}</strong>
          <span className="finance-analysis-context">30 derniers jours</span>
          <Variation current={metrics.summary.income30} previous={metrics.summary.previousIncome30} />
        </div>
        <div className="finance-analysis-metric">
          <h2>Encaissements annuels</h2>
          <strong>{formatDinars(yearlyRevenue)}</strong>
          <span className="finance-analysis-context">Cumul depuis janvier {new Date().getFullYear()}</span>
        </div>
        <div className="finance-analysis-metric">
          <h2>Panier moyen</h2>
          <strong>{formatDinars(metrics.summary.averageBasket)}</strong>
          <span className="finance-analysis-context">Par encaissement sur 30 jours</span>
        </div>
        <div className="finance-analysis-metric">
          <h2>Consultations du jour</h2>
          <strong>{metrics.summary.todayAppointments.toLocaleString("fr-FR")}</strong>
          <span className="finance-analysis-context">Hors annulations et absences</span>
          <Variation current={metrics.summary.todayAppointments} previous={metrics.summary.yesterdayAppointments} />
        </div>
      </section>

      <div className="finance-analysis-panels">
        <section className="finance-analysis-chart board-frame" aria-label="Évolution financière">
          <div className="finance-analysis-panel-heading">
            <div>
              <h2>{revenue ? "Évolution des encaissements" : "Flux de trésorerie"}</h2>
              <p>{revenue ? `Mois par mois, en ${new Date().getFullYear()}` : "Entrées moins sorties, sur les 14 derniers jours"}</p>
            </div>
            <ToggleGroup aria-label="Graphique financier" className="finance-view-toggle" multiple={false} value={[chart]} onValueChange={value => setChart((value[0] as "revenue" | "cashflow" | undefined) ?? chart)}>
              <ToggleGroupItem value="revenue">Encaissements</ToggleGroupItem>
              <ToggleGroupItem value="cashflow">Trésorerie</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="finance-analysis-total">
            <strong>{formatDinars(chartTotal)}</strong>
            <span>{revenue ? "encaissés depuis janvier" : "de flux net sur 14 jours"}</span>
          </div>
          <div className="finance-analysis-plot" role="img" aria-label={revenue ? "Encaissements mensuels en dinars" : "Flux net quotidien en dinars"}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              {revenue ? (
                <BarChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 8 }} accessibilityLayer>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="2 5" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={tick} tickMargin={12} minTickGap={10} />
                  <YAxis axisLine={false} tickLine={false} tick={tick} width={60} tickFormatter={value => Number(value).toLocaleString("fr-FR", { notation: "compact" })} />
                  <Tooltip cursor={{ fill: "var(--fill)" }} content={({ active, payload, label }) => active && payload?.length ? (
                    <div className="finance-analysis-tooltip">
                      <span>{String(label)}</span>
                      <strong>{formatDinars(Number(payload[0].value))}</strong>
                      <span>Encaissements</span>
                    </div>
                  ) : null} />
                  <Bar dataKey="value" name="Encaissements" fill="var(--premium-blue)" radius={[3, 3, 0, 0]} maxBarSize={34} isAnimationActive={false} activeBar={{ stroke: "var(--ink)", strokeWidth: 1 }} />
                </BarChart>
              ) : (
                <AreaChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 8 }} accessibilityLayer>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="2 5" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={tick} tickMargin={12} minTickGap={24} />
                  <YAxis axisLine={false} tickLine={false} tick={tick} width={60} tickFormatter={value => Number(value).toLocaleString("fr-FR", { notation: "compact" })} />
                  <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                    <div className="finance-analysis-tooltip">
                      <span>{String(label)}</span>
                      <strong>{formatDinars(Number(payload[0].value))}</strong>
                      <span>Flux net</span>
                    </div>
                  ) : null} />
                  <Area dataKey="value" name="Flux net" type="monotone" stroke="var(--premium-blue)" strokeWidth={2} fill="var(--premium-blue)" fillOpacity={0.08} isAnimationActive={false} activeDot={{ r: 4, fill: "var(--surface)", stroke: "var(--premium-blue)", strokeWidth: 1 }} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
          <p className="finance-analysis-footnote">Montants en DA. Seules les écritures réglées sont prises en compte.</p>
        </section>

        <section className="finance-analysis-categories board-frame" aria-label="Répartition des encaissements">
          <div className="finance-analysis-panel-heading">
            <div>
              <h2>Origine des encaissements</h2>
              <p>Principales catégories du journal, sur 30 jours</p>
            </div>
          </div>
          {categories.length ? (
            <ul className="finance-analysis-category-list">
              {categories.map(category => {
                const share = metrics.summary.income30 > 0 ? category.value / metrics.summary.income30 * 100 : 0;
                const label = category.label.toLowerCase() === "billing" ? "Facturation" : category.label;
                return (
                  <li key={category.label}>
                    <div><span>{label}</span><strong>{formatDinars(category.value)}</strong></div>
                    <div className="finance-analysis-category-detail">
                      <div className="finance-analysis-track"><span style={{ width: `${Math.min(100, share)}%` }} /></div>
                      <span>{share.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <p className="finance-analysis-empty">Aucun encaissement sur cette période.</p>}
          <div className="finance-analysis-category-total"><span>Total sur 30 jours</span><strong>{formatDinars(metrics.summary.income30)}</strong></div>
        </section>
      </div>
    </div>
  );
}
