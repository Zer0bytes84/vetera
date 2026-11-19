import { KpiMiniChart } from "../../v2/kpi-mini-chart";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowRight01Icon } from "@/lib/hugeicons";
import { TrendingUp } from "lucide-react";
import {
  ActionButton,
  EmptyState,
  SkeletonBlock,
  focusRing,
} from "@/design-system/primitives";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
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
    <Shell
      aria-label="Tendances"
      className="clinical-module clinical-trends-module"
    >
      <ShellHeader
        as="h2"
        aside={
          <button
            aria-controls="clinical-trends-content"
            aria-expanded={open}
            className={`inline-flex h-8 items-center gap-2 rounded-full bg-[var(--card-inset)] px-3 t-12 font-medium text-ink-muted hover:text-ink ${focusRing}`}
            onClick={() => onOpen(!open)}
            type="button"
          >
            {open ? "Réduire" : "Explorer"}
            <HugeiconsIcon
              icon={open ? ArrowDown01Icon : ArrowRight01Icon}
              size={14}
              strokeWidth={1.5}
            />
          </button>
        }
        icon={TrendingUp}
        subtitle={`Activité et actes sur les ${model.days} derniers jours`}
        title="Tendances"
      />
      {open && (
        <Panel
          aria-busy={state.loading || state.skeleton}
          className="p-5"
          id="clinical-trends-content"
        >
          <div
            aria-label="Période des tendances"
            className="mb-5"
            data-tabs-style="segmented"
            role="group"
          >
            {([30, 90] as const).map((days) => (
              <button
                aria-pressed={model.days === days}
                className={`rounded-full px-3 py-1.5 t-12 font-medium ${model.days === days ? "bg-surface shadow-card" : "text-ink-muted hover:text-ink"} ${focusRing}`}
                key={days}
                onClick={() => onPeriod(days)}
                type="button"
              >
                {days} jours
              </button>
            ))}
          </div>
          {state.loading || state.skeleton ? (
            <SkeletonBlock
              className="h-[192px] w-full"
              visible={state.skeleton}
            />
          ) : state.error ? (
            <EmptyState
              action={
                <ActionButton onClick={state.retry} quiet>
                  Réessayer
                </ActionButton>
              }
              compact
              title="L’activité n’a pas pu être chargée"
            />
          ) : model.total ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <section>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display t-14 font-medium">
                    Consultations terminées
                  </h3>
                  <span className="t-12 text-ink-muted">
                    <strong className="font-display t-18 font-medium text-ink tabular-nums">
                      {model.total}
                    </strong>{" "}
                    au total
                  </span>
                </div>
                <div className="clinical-trend-chart">
                  <KpiMiniChart
                    bars
                    caption="Visites terminées par semaine"
                    color="var(--primary)"
                    labels={model.points.map((row) => row.label)}
                    values={model.points.map((row) => row.count)}
                  />
                </div>
              </section>
              <section className="lg:border-l lg:border-hairline lg:pl-6">
                <h3 className="font-display t-14 font-medium">
                  Répartition des actes
                </h3>
                <div className="mt-4 space-y-4">
                  {model.specialties.slice(0, 5).map((row) => (
                    <div key={row.label}>
                      <div className="mb-1.5 flex justify-between gap-3 t-12">
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
              action={
                <ActionButton onClick={onPlan} quiet>
                  Planifier un suivi
                </ActionButton>
              }
              compact
              description="Choisissez une période plus longue ou préparez votre prochain suivi."
              title="Aucune consultation terminée sur cette période"
            />
          )}
        </Panel>
      )}
    </Shell>
  );
}
