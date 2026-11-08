import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowDownRight, ArrowUpRight, ChartPie, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartCard } from "@/components/ui/chart-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Segmented } from "@/components/ui/segmented-control";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { percentageDelta, type DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { View } from "@/types";
import { formatDinars } from "@/utils/display-format";
import { categoryFinding, otherIncome } from "../category-finding";
import { PageHeader } from "@/design-system/patterns/page-header";
import type { Transaction } from "@/types/db";
import { FinanceOverview } from "./finance-overview";

/*
 * Finances > Analyse, in the language of the other pages: a one-line page header, then sections that are a grey band with its
 * header (icon, title, subtitle) and white cards inside. Spacing 12 / 24 / 48, radii R20 (band) and R16 (card), our tokens.
 * Presentation only: every figure and every calculation below is the page's own, unchanged.
 */

/** A section: its grey band, its header, and one white card. */
function Section({ icon, title, subtitle, className, panelClassName, children, ...props }: {
  icon: typeof Landmark;
  title: string;
  subtitle?: string;
  className?: string;
  panelClassName?: string;
  children: ReactNode;
} & Omit<React.ComponentProps<"section">, "title">) {
  return (
    <Shell className={cn("max-w-none rounded-[20px]", className)} {...props}>
      <ShellHeader icon={icon} subtitle={subtitle} title={title} />
      <Panel className={cn("overflow-hidden border border-border", panelClassName)}>{children}</Panel>
    </Shell>
  );
}

function Variation({ current, previous, format = (value: number) => value.toLocaleString("fr-FR") }: { current: number; previous: number; format?: (value: number) => string }) {
  if (previous === 0) {
    return <span className="text-xs text-muted-foreground">Sans valeur sur la période précédente</span>;
  }
  const delta = percentageDelta(current, previous);
  const Icon = delta < 0 ? ArrowDownRight : ArrowUpRight;
  return (
    <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      <span className={cn("flex items-center gap-1", delta > 0 && "text-positive", delta < 0 && "text-negative")}>
        {delta !== 0 && <Icon aria-hidden="true" size={14} strokeWidth={2} />}
        {delta > 0 ? "+" : ""}{delta.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
      </span>
      <span>contre {format(previous)} sur la période précédente</span>
    </span>
  );
}

function Metric({ title, value, context, children }: { title: string; value: string; context: string; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-[var(--card-inset)] p-6">
      <h2 className="text-[0.8125rem] font-normal text-muted-foreground">{title}</h2>
      <strong className="text-[1.5rem] leading-tight font-medium tracking-tight tabular-nums">{value}</strong>
      <span className="text-xs text-muted-foreground">{context}</span>
      {children}
    </div>
  );
}

export function PremiumFinancialAnalysis({ metrics, onNavigate, transactions = [] }: {
  metrics: DashboardMetrics;
  onNavigate: (view: View) => void;
  /** The journal, for the Clean overview card's own periods. */
  transactions?: Transaction[];
}) {
  const [chart, setChart] = useState<"revenue" | "cashflow">("revenue");
  const revenue = chart === "revenue";
  const points = revenue
    ? metrics.monthlyRevenue.map(({ month, value }) => ({ label: month, value }))
    : metrics.cashflowSeries.map(({ name, value }) => ({ label: name, value }));
  const yearlyRevenue = metrics.monthlyRevenue.reduce((sum, item) => sum + item.value, 0);
  const chartTotal = points.reduce((sum, item) => sum + item.value, 0);
  const categories = metrics.topCategories.filter(({ value }) => value > 0);
  const finding = categoryFinding(categories, metrics.summary.income30);
  const rest = otherIncome(categories, metrics.summary.income30);

  const row = (label: string, value: number) => {
    const share = metrics.summary.income30 > 0 ? value / metrics.summary.income30 * 100 : 0;
    return (
      <li className="flex flex-col gap-2" key={label}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[0.8125rem]">
          <span>{label}</span>
          <strong className="font-medium whitespace-nowrap tabular-nums">{formatDinars(value)}</strong>
        </div>
        <div className="flex items-center gap-3">
          <ProgressBar className="flex-1" label={`${label} : part des encaissements`} size="sm" value={Math.min(100, share)} />
          <span className="min-w-12 text-right text-xs text-muted-foreground tabular-nums">
            {share.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
          </span>
        </div>
      </li>
    );
  };

  return (
    <div className="finance-analysis flex w-full min-w-0 flex-col gap-6 px-4 pb-8 lg:px-6">
      <PageHeader
        actions={
          <Button className="rounded-full" variant="outline" onClick={() => onNavigate("finances")}>
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.5} />
            Retour aux finances
          </Button>
        }
        subtitle="encaissements et trésorerie"
        title="Analyse financière"
      />

      <Section aria-label="Indicateurs financiers" icon={Landmark} panelClassName="bg-border" subtitle="Encaissements, panier moyen et consultations" title="Indicateurs financiers">
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          <Metric context="30 derniers jours" title="Encaissements" value={formatDinars(metrics.summary.income30)}>
            <Variation current={metrics.summary.income30} format={formatDinars} previous={metrics.summary.previousIncome30} />
          </Metric>
          <Metric context={`Cumul depuis janvier ${new Date().getFullYear()}`} title="Encaissements annuels" value={formatDinars(yearlyRevenue)} />
          <Metric context="Par encaissement sur 30 jours" title="Panier moyen" value={formatDinars(metrics.summary.averageBasket)} />
          <Metric context="Hors annulations et absences" title="Consultations du jour" value={metrics.summary.todayAppointments.toLocaleString("fr-FR")}>
            <Variation current={metrics.summary.todayAppointments} previous={metrics.summary.yesterdayAppointments} />
          </Metric>
        </div>
      </Section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <FinanceOverview transactions={transactions} />
          {/* Clean shows the overview above in place of this chart. */}
          <section aria-label="Évolution financière" data-clean-hidden="">
            <ChartCard
              className="max-w-none"
              data={{
                labels: points.map((point) => point.label),
                series: [{
                  id: chart,
                  label: revenue ? "Encaissements" : "Flux net",
                  values: points.map((point) => point.value),
                  valueFormat: (value) => formatDinars(value),
                }],
              }}
              footer={<p className="pt-3 text-xs text-muted-foreground">Montants en DA. Seules les écritures réglées sont prises en compte.</p>}
              height={288}
              key={chart}
              subtitle={`${revenue ? `Mois par mois, en ${new Date().getFullYear()}` : "Entrées moins sorties, sur les 14 derniers jours"} · ${revenue ? "encaissés depuis janvier" : "de flux net sur 14 jours"}`}
              title={revenue ? "Évolution des encaissements" : "Flux de trésorerie"}
              toolbar={
                <Segmented<"revenue" | "cashflow">
                  label="Graphique financier"
                  onValueChange={setChart}
                  options={[
                    { value: "revenue", label: "Encaissements" },
                    { value: "cashflow", label: "Trésorerie" },
                  ]}
                  value={chart}
                />
              }
              total={formatDinars(chartTotal)}
              type={revenue ? "bar" : "area"}
            />
          </section>
        </div>

        <Section aria-label="Répartition des encaissements" icon={ChartPie} subtitle="Principales catégories du journal, sur 30 jours" title="Origine des encaissements">
          {finding && <p className="px-6 pt-6 text-sm leading-normal">{finding}</p>}
          {categories.length ? (
            <ul className="flex flex-col gap-6 p-6">
              {categories.map((category) => row(category.label.toLowerCase() === "billing" ? "Facturation" : category.label, category.value))}
              {rest > 0 && row("Autres catégories", rest)}
            </ul>
          ) : <p className="p-6 text-[0.8125rem] text-muted-foreground">Aucun encaissement sur cette période.</p>}
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-border p-6 text-[0.8125rem]">
            <span className="text-muted-foreground">Total sur 30 jours</span>
            <strong className="text-lg font-medium tabular-nums">{formatDinars(metrics.summary.income30)}</strong>
          </div>
        </Section>
      </div>
    </div>
  );
}
