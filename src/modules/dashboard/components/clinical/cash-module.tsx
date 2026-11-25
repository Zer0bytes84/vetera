import { Wallet } from "lucide-react";
import { ListFilter } from "@/components/ui/list-controls";
import { WidgetShell } from "@/design-system/patterns/widget-shell";
import { EmptyState, SignalBadge, Stat } from "@/design-system/primitives";
import type {
  buildClinicalCash,
  ClinicalCashPeriod,
} from "../../model/clinical-dashboard";
import type { Receivable } from "../../v2/financial-model";
import { KpiSegments } from "../../v2/kpi-mini-chart";
import {
  formatCentimes,
  formatCurrency,
  parseDashboardDate,
} from "../../v2/model";
import { ModuleLink, RowSkeleton, type WidgetState } from "./shared";

export function CashModule({
  cash,
  pending,
  receivables,
  period,
  onPeriod,
  state,
  onFinances,
}: {
  cash: ReturnType<typeof buildClinicalCash>;
  pending: number;
  receivables: Receivable[];
  period: ClinicalCashPeriod;
  onPeriod: (period: ClinicalCashPeriod) => void;
  state: WidgetState;
  onFinances: () => void;
}) {
  return (
    <WidgetShell
      actions={
        <ListFilter
          label="Période"
          onValueChange={(value) => onPeriod(value as ClinicalCashPeriod)}
          options={[
            { value: "today", label: "Jour" },
            { value: "week", label: "Semaine" },
            { value: "month", label: "Mois" },
            { value: "quarter", label: "90 jours" },
            { value: "year", label: "Année" },
          ]}
          value={period}
        />
      }
      className="clinical-module clinical-cash-module"
      error={state.error}
      icon={Wallet}
      onRetry={state.retry}
      pending={state.loading}
      showSkeleton={state.skeleton}
      skeleton={<RowSkeleton />}
      subtitle={`${cash.count} mouvement${cash.count > 1 ? "s" : ""} confirmé${cash.count > 1 ? "s" : ""} sur la période`}
      title="Trésorerie"
    >
      <div className="grid grid-cols-2 gap-5">
        <Stat
          className="[&>p:nth-child(2)]:text-[24px]"
          compact
          label="Encaissements"
          value={formatCentimes(cash.income)}
        />
        <Stat
          className="[&>p:nth-child(2)]:text-[24px]"
          compact
          label="Dépenses réglées"
          value={formatCentimes(cash.expense)}
        />
      </div>
      <KpiSegments
        caption="Répartition des mouvements réglés"
        segments={[
          {
            label: "Encaissements",
            value: cash.income / 100,
            color: "var(--clinical-green)",
          },
          {
            label: "Dépenses",
            value: cash.expense / 100,
            color: "var(--clinical-amber)",
          },
        ]}
        unit="DA"
      />
      <div className="mt-4 flex items-center justify-between gap-3 border-hairline border-y py-3">
        <div>
          <p className="t-12 text-ink-muted">À recouvrer · toutes dates</p>
          <p className="t-18 mt-1 font-display font-medium tabular-nums">
            {formatCentimes(pending)}
          </p>
        </div>
        <SignalBadge tone={pending ? "watch" : "positive"}>
          {pending
            ? `${receivables.length} règlement${receivables.length > 1 ? "s" : ""}`
            : "À jour"}
        </SignalBadge>
      </div>
      {receivables.length ? (
        <div className="divide-y divide-hairline">
          {receivables.slice(0, 2).map((row) => (
            <button
              className="clinical-receivable-row t-12 flex w-full items-center justify-between gap-3 py-2.5 text-left"
              key={row.id}
              onClick={onFinances}
              type="button"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{row.label}</p>
                <p className="t-12 mt-0.5 truncate text-ink-muted">
                  {row.detail}
                </p>
              </div>
              <span className="shrink-0 font-display tabular-nums">
                {formatCurrency(row.balance)}
              </span>
            </button>
          ))}
        </div>
      ) : cash.recent.length > 0 ? (
        <div className="pt-3">
          <h3 className="t-12 mb-1 font-medium text-ink-muted">
            Derniers mouvements · toutes dates
          </h3>
          {cash.recent.slice(0, 2).map((row) => (
            <div
              className="t-12 flex items-center justify-between gap-3 py-2"
              key={row.id}
            >
              <div className="min-w-0">
                <p className="truncate">{row.description || row.category}</p>
                <p className="t-12 mt-0.5 text-ink-muted">
                  {parseDashboardDate(row.date)?.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              <span
                className={`shrink-0 font-display tabular-nums ${row.type === "income" ? "text-[color:var(--ok)]" : "text-ink-muted"}`}
              >
                {row.type === "income" ? "+" : "−"}
                {formatCentimes(row.amount)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          description="Les factures et les règlements alimentent ce suivi automatiquement."
          title="Aucun mouvement enregistré"
        />
      )}
      <dl aria-label="Bilan de trésorerie" className="premium-widget-metrics">
        <div>
          <dt>
            <i aria-hidden="true" className="finder-dot finder-dot-blue" />
            Encaissé
          </dt>
          <dd>{formatCentimes(cash.income)}</dd>
        </div>
        <div>
          <dt>
            <i aria-hidden="true" className="finder-dot finder-dot-orange" />
            Dépensé
          </dt>
          <dd>{formatCentimes(cash.expense)}</dd>
        </div>
        <div>
          <dt>
            <i aria-hidden="true" className="finder-dot finder-dot-green" />À
            recouvrer
          </dt>
          <dd>{formatCentimes(pending)}</dd>
        </div>
      </dl>
      <div className="mt-3 flex justify-end border-hairline border-t pt-3">
        <ModuleLink onClick={onFinances}>Voir les finances</ModuleLink>
      </div>
    </WidgetShell>
  );
}
