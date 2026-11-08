import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowDownRight, ArrowUpRight, ChartPie, Landmark } from "lucide-react";
import { Button as ActionButton } from "@/components/ui/action-button";
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
import type { Invoice, Transaction } from "@/types/db";
import { buildFinancialOverview, receivablesSummary } from "@/modules/dashboard/v2/financial-model";
import { receivablesAging } from "../receivables-aging";
import { FinanceOverview } from "./finance-overview";

/*
 * Finances > Analyse, in the language of the other pages: a one-line page header, then sections that are a grey band with its
 * header (icon, title, subtitle) and white cards inside. Spacing 12 / 24 / 48, radii R20 (band) and R16 (card), our tokens.
 * Presentation only: every figure and every calculation below is the page's own, unchanged.
 */

/** A section: its grey band, its header, and one white card. */
function Section({ icon, title, subtitle, aside, className, panelClassName, children, ...props }: {
  icon: typeof Landmark;
  title: string;
  subtitle?: string;
  /** The band's right side: the page's action, as on the other pages. */
  aside?: ReactNode;
  className?: string;
  panelClassName?: string;
  children: ReactNode;
} & Omit<React.ComponentProps<"section">, "title">) {
  return (
    <Shell className={cn("max-w-none rounded-[20px]", className)} {...props}>
      <ShellHeader aside={aside} icon={icon} subtitle={subtitle} title={title} />
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

export function PremiumFinancialAnalysis({ metrics, onNavigate, transactions = [], invoices = [], invoicesUnavailable = false }: {
  metrics: DashboardMetrics;
  onNavigate: (view: View) => void;
  /** The journal: the comparison between periods reads it, and so do the receivables. */
  transactions?: Transaction[];
  /** The issued invoices, for the receivables and their age (the same read the dashboard uses). */
  invoices?: Invoice[];
  /** The invoices could not be read: the receivables say so instead of showing zeros. */
  invoicesUnavailable?: boolean;
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

  const now = new Date();
  const aging = receivablesAging(invoices, transactions, now);
  const owed = receivablesSummary(invoices, transactions);
  const biggest = buildFinancialOverview(invoices, transactions, { from: "", to: "" }, "all").receivables.slice(0, 4);
  const slices = [
    ...categories.map((category) => ({ label: category.label.toLowerCase() === "billing" ? "Facturation" : category.label, value: category.value })),
    ...(rest > 0 ? [{ label: "Autres catégories", value: rest }] : []),
  ];

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
      <PageHeader subtitle="encaissements et trésorerie" title="Analyse financière" />

      <Section
        aside={
          <ActionButton className="text-foreground" icon={ArrowLeft} onClick={() => onNavigate("finances")} variant="secondary">
            Finances
          </ActionButton>
        }
        aria-label="Indicateurs financiers"
        icon={Landmark} panelClassName="bg-border" subtitle="Encaissements, panier moyen et consultations" title="Indicateurs financiers">
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

      {/* Two columns: the income and its comparison between periods on the left, where it comes from and what is owed on the right. */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
        <section aria-label="Évolution financière" className="min-w-0">
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

          <FinanceOverview transactions={transactions} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
        {slices.length ? (
          <section aria-label="Répartition des encaissements" className="min-w-0">
            <ChartCard
              className="max-w-none"
              data={{
                labels: ["Période"],
                series: slices.map((slice) => ({ id: slice.label, label: slice.label, values: [slice.value], valueFormat: (value: number) => formatDinars(value) })),
              }}
              donutLabel="Encaissements"
              footer={
                <div className="flex flex-col gap-6 pt-3">
                  {finding && <p className="text-sm leading-normal">{finding}</p>}
                  <ul className="flex flex-col gap-6">
                    {categories.map((category) => row(category.label.toLowerCase() === "billing" ? "Facturation" : category.label, category.value))}
                    {rest > 0 && row("Autres catégories", rest)}
                  </ul>
                  <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-border pt-6 text-[0.8125rem]">
                    <span className="text-muted-foreground">Total sur 30 jours</span>
                    <strong className="text-lg font-medium tabular-nums">{formatDinars(metrics.summary.income30)}</strong>
                  </div>
                </div>
              }
              subtitle="Par catégorie, sur 30 jours"
              title="Répartition des recettes"
              total={formatDinars(metrics.summary.income30)}
              type="donut"
            />
          </section>
        ) : (
          <Section aria-label="Répartition des encaissements" icon={ChartPie} subtitle="Par catégorie, sur 30 jours" title="Répartition des recettes">
            <p className="p-6 text-[0.8125rem] text-muted-foreground">Aucun encaissement sur cette période.</p>
          </Section>
        )}

        <section aria-label="Créances et ancienneté" className="min-w-0">
          <ChartCard
            className="max-w-none"
            data={{
              labels: ["< 30 j", "30–60 j", "60–90 j", "> 90 j"],
              series: [{ id: "owed", label: "Reste à recouvrer", values: aging.map((bucket) => bucket.amount), color: "var(--tone-amber)", valueFormat: (value: number) => formatDinars(value) }],
            }}
            footer={
              <div className="flex flex-col gap-6 pt-3">
                {invoicesUnavailable ? (
                  <p className="text-xs text-muted-foreground">Les factures n’ont pas pu être lues : seules les écritures en attente sont comptées.</p>
                ) : null}
                <dl className="grid grid-cols-3 gap-3 text-[0.8125rem]">
                  <div><dt className="text-muted-foreground">Factures impayées</dt><dd className="font-medium tabular-nums">{owed.unpaidInvoices.toLocaleString("fr-FR")}</dd></div>
                  <div><dt className="text-muted-foreground">En retard</dt><dd className={cn("font-medium tabular-nums", owed.overdueInvoices > 0 && "text-negative")}>{owed.overdueInvoices.toLocaleString("fr-FR")}</dd></div>
                  <div><dt className="text-muted-foreground">Écritures en attente</dt><dd className="font-medium tabular-nums">{owed.pendingEntries.toLocaleString("fr-FR")}</dd></div>
                </dl>
                {biggest.length ? (
                  <ul aria-label="Plus gros soldes" className="flex flex-col divide-y divide-border border-t border-border">
                    {biggest.map((item) => (
                      <li className="flex items-baseline justify-between gap-3 py-3 text-[0.8125rem]" key={item.id}>
                        <span className="min-w-0 flex-1 truncate">{item.label}<span className="text-muted-foreground"> · {item.detail}</span></span>
                        <strong className="font-medium whitespace-nowrap tabular-nums">{formatDinars(item.balance)}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="border-t border-border pt-6 text-[0.8125rem] text-muted-foreground">Aucune créance à recouvrer.</p>
                )}
              </div>
            }
            height={200}
            subtitle="Reste à recouvrer, par âge"
            title="Créances et ancienneté"
            tooltipNote={(index) => `${aging[index].count} ${aging[index].count > 1 ? "dossiers" : "dossier"}`}
            tooltipTitles={aging.map((bucket) => bucket.label)}
            total={formatDinars(owed.total)}
            type="bar"
          />
        </section>
        </div>
      </div>
    </div>
  );
}
