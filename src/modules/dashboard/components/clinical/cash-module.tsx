import { ListFilter } from "@/components/ui/list-controls";
import { KpiSegments } from "../../v2/kpi-mini-chart";
import { EmptyState, SignalBadge, Stat } from "@/design-system/primitives";
import { WidgetShell } from "@/design-system/patterns/widget-shell";
import type {
  buildClinicalCash,
  ClinicalCashPeriod,
} from "../../model/clinical-dashboard";
import type { Receivable } from "../../v2/financial-model";
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
      className="clinical-module clinical-cash-module"
      title="Trésorerie"
      subtitle={`${cash.count} mouvement${cash.count > 1 ? "s" : ""} confirmé${cash.count > 1 ? "s" : ""} sur la période`}
      actions={
        <ListFilter
          label="Période"
          value={period}
          onValueChange={(value) => onPeriod(value as ClinicalCashPeriod)}
          options={[
            { value: "today", label: "Jour" },
            { value: "week", label: "Semaine" },
            { value: "month", label: "Mois" },
            { value: "quarter", label: "90 jours" },
            { value: "year", label: "Année" },
          ]}
        />
      }
      pending={state.loading}
      showSkeleton={state.skeleton}
      error={state.error}
      onRetry={state.retry}
      skeleton={<RowSkeleton />}
    >
      <div className="grid grid-cols-2 gap-5">
        <Stat
          compact
          label="Encaissements"
          value={formatCentimes(cash.income)}
          className="[&>p:nth-child(2)]:text-[24px]"
        />
        <Stat
          compact
          label="Dépenses réglées"
          value={formatCentimes(cash.expense)}
          className="[&>p:nth-child(2)]:text-[24px]"
        />
      </div>
      <KpiSegments
        caption="Répartition des mouvements réglés"
        unit="DA"
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
      />
      <div className="mt-4 flex items-center justify-between gap-3 border-y border-hairline py-3">
        <div>
          <p className="text-[11px] text-ink-muted">
            À recouvrer · toutes dates
          </p>
          <p className="mt-1 font-display text-[18px] font-medium tabular-nums">
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
              type="button"
              onClick={onFinances}
              key={row.id}
              className="clinical-receivable-row flex w-full items-center justify-between gap-3 py-2.5 text-left text-[12px]"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{row.label}</p>
                <p className="mt-0.5 truncate text-[11px] text-ink-muted">
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
          <h3 className="mb-1 text-[11px] font-medium text-ink-muted">
            Derniers mouvements · toutes dates
          </h3>
          {cash.recent.slice(0, 2).map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 py-2 text-[12px]"
            >
              <div className="min-w-0">
                <p className="truncate">{row.description || row.category}</p>
                <p className="mt-0.5 text-[10px] text-ink-muted">
                  {parseDashboardDate(row.date)?.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              <span
                className={`shrink-0 font-display tabular-nums ${row.type === "income" ? "text-emerald-700 dark:text-emerald-300" : "text-ink-muted"}`}
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
          title="Aucun mouvement enregistré"
          description="Les factures et les règlements alimentent ce suivi automatiquement."
        />
      )}
      <div className="mt-3 flex justify-end border-t border-hairline pt-3">
        <ModuleLink onClick={onFinances}>Voir les finances</ModuleLink>
      </div>
    </WidgetShell>
  );
}
