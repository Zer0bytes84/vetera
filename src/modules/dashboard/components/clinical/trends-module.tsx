import { KpiMiniChart } from "../../v2/kpi-mini-chart";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowRight01Icon } from "@/lib/hugeicons";
import {
  ActionButton,
  EmptyState,
  Panel,
  SkeletonBlock,
  focusRing,
} from "@/design-system/primitives";
import type { buildClinicalTrends } from "../../model/clinical-dashboard";
import type { WidgetState } from "./shared";

export function TrendsModule({
  open,
  onOpen,
  model,
  onPeriod,
  state,
  onPlan,
}: {
  open: boolean;
  onOpen: (open: boolean) => void;
  model: ReturnType<typeof buildClinicalTrends>;
  onPeriod: (days: 30 | 90) => void;
  state: WidgetState;
  onPlan: () => void;
}) {
  return (
    <Panel
      aria-label="Tendances"
      className="clinical-module clinical-trends-module"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="clinical-trends-content"
        className={`flex w-full items-center justify-between gap-3 rounded-body p-5 text-left ${focusRing}`}
        onClick={() => onOpen(!open)}
      >
        <div>
          <h2 className="font-display text-[16px] font-medium tracking-[-0.02em]">
            Tendances
          </h2>
          <p className="mt-1 text-[12px] text-ink-muted">
            Activité et actes sur les {model.days} derniers jours
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-[12px] text-ink-muted">
          {open ? "Réduire" : "Explorer"}
          <HugeiconsIcon
            icon={open ? ArrowDown01Icon : ArrowRight01Icon}
            size={16}
            strokeWidth={1.5}
          />
        </span>
      </button>
      {open && (
        <div
          id="clinical-trends-content"
          aria-busy={state.loading || state.skeleton}
          className="border-t border-hairline p-5"
        >
          <div
            role="group"
            aria-label="Période des tendances"
            className="mb-5 inline-flex rounded-control bg-frame p-1"
          >
            {([30, 90] as const).map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={model.days === days}
                onClick={() => onPeriod(days)}
                className={`rounded-[7px] px-3 py-1.5 text-[11px] font-medium ${model.days === days ? "bg-surface shadow-card" : "text-ink-muted hover:text-ink"} ${focusRing}`}
              >
                {days} jours
              </button>
            ))}
          </div>
          {state.loading || state.skeleton ? (
            <SkeletonBlock
              visible={state.skeleton}
              className="h-[192px] w-full"
            />
          ) : state.error ? (
            <EmptyState
              compact
              title="L’activité n’a pas pu être chargée"
              action={
                <ActionButton quiet onClick={state.retry}>
                  Réessayer
                </ActionButton>
              }
            />
          ) : model.total ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <section>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-[14px] font-medium">
                    Consultations terminées
                  </h3>
                  <span className="text-[12px] text-ink-muted">
                    <strong className="font-display text-[20px] font-medium text-ink tabular-nums">
                      {model.total}
                    </strong>{" "}
                    au total
                  </span>
                </div>
                <div className="clinical-trend-chart">
                  <KpiMiniChart
                    bars
                    values={model.points.map((row) => row.count)}
                    labels={model.points.map((row) => row.label)}
                    color="var(--primary)"
                    caption="Visites terminées par semaine"
                  />
                </div>
              </section>
              <section className="lg:border-l lg:border-hairline lg:pl-6">
                <h3 className="font-display text-[14px] font-medium">
                  Répartition des actes
                </h3>
                <div className="mt-4 space-y-4">
                  {model.specialties.slice(0, 5).map((row) => (
                    <div key={row.label}>
                      <div className="mb-1.5 flex justify-between gap-3 text-[12px]">
                        <span>{row.label}</span>
                        <span className="text-ink-muted tabular-nums">
                          {row.count} ·{" "}
                          {Math.round((row.count / model.total) * 100)} %
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-frame">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{
                            width: `${(row.count / model.total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <EmptyState
              compact
              title="Aucune consultation terminée sur cette période"
              description="Choisissez une période plus longue ou préparez votre prochain suivi."
              action={
                <ActionButton quiet onClick={onPlan}>
                  Planifier un suivi
                </ActionButton>
              }
            />
          )}
        </div>
      )}
    </Panel>
  );
}
