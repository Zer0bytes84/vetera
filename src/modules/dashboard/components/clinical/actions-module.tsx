import { ClipboardList } from "lucide-react";
import { Loader2 } from "@/lib/icons";
import { AnimatePresence, motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@/lib/hugeicons";
import { EmptyState, SignalBadge, focusRing } from "@/design-system/primitives";
import { WidgetShell } from "@/design-system/patterns/widget-shell";
import { MOTION } from "@/design-system/motion";
import type { ClinicalAlert } from "../../v2/model";
import { ModuleLink, RowSkeleton, type WidgetState } from "./shared";

export type ActionFilter = "all" | ClinicalAlert["source"];
const labels = {
  all: "Tout",
  task: "Tâches",
  vaccine: "Vaccins",
  stock: "Stock",
  appointment: "Relances",
} as const;
export function ActionsModule({
  alerts,
  busyIds,
  filter,
  onFilter,
  state,
  reducedMotion,
  onOpen,
  onComplete,
  onAll,
}: {
  alerts: ClinicalAlert[];
  busyIds: string[];
  filter: ActionFilter;
  onFilter: (filter: ActionFilter) => void;
  state: WidgetState;
  reducedMotion: boolean;
  onOpen: (alert: ClinicalAlert) => void;
  onComplete: (id: string) => void;
  onAll: () => void;
}) {
  const filtered = alerts.filter(
    (alert) => filter === "all" || alert.source === filter
  );
  const critical = alerts.filter((alert) => alert.tone === "critical").length;
  const filters = Object.keys(labels) as ActionFilter[];
  return (
    <WidgetShell
      actions={
        <SignalBadge
          tone={critical ? "critical" : alerts.length ? "watch" : "positive"}
        >
          {alerts.length ? `${alerts.length} à suivre` : "À jour"}
        </SignalBadge>
      }
      className="clinical-module clinical-actions-module"
      error={state.error}
      icon={ClipboardList}
      onRetry={state.retry}
      pending={state.loading}
      showSkeleton={state.skeleton}
      skeleton={<RowSkeleton />}
      subtitle={
        critical
          ? `${critical} action${critical > 1 ? "s" : ""} prioritaire${critical > 1 ? "s" : ""}`
          : "Les prochaines actions du cabinet"
      }
      title="Actions à suivre"
    >
      {alerts.length > 0 && (
        <div
          aria-label="Filtrer les actions"
          className="clinical-filter-tabs"
          data-tabs-style="segmented"
          role="group"
        >
          {filters.map((value) => (
            <button
              aria-pressed={filter === value}
              className={`rounded-md px-2 py-1.5 t-12 font-medium transition-colors duration-150 ${filter === value ? "bg-frame text-ink" : "text-ink-muted hover:bg-frame"} ${focusRing}`}
              key={value}
              onClick={() => onFilter(value)}
              type="button"
            >
              {labels[value]}
            </button>
          ))}
        </div>
      )}
      {filtered.length ? (
        <AnimatePresence initial={false}>
          {filtered.slice(0, 4).map((alert) => (
            <motion.div
              animate={{ opacity: 1 }}
              className="flex items-start gap-3 border-t border-hairline py-3"
              data-row-id={
                alert.source === "task" ? alert.id.slice(5) : undefined
              }
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
              initial={false}
              key={alert.id}
              layout={!reducedMotion}
              transition={{ duration: MOTION.fast, ease: MOTION.easeOut }}
            >
              <span
                aria-hidden="true"
                className={`mt-1.5 size-1.5 shrink-0 rounded-full ${alert.tone === "critical" ? "bg-signal-critical" : alert.tone === "warning" ? "bg-signal-watch" : "bg-secondary"}`}
              />
              <button
                className={`min-w-0 flex-1 rounded text-left ${focusRing}`}
                onClick={() => onOpen(alert)}
                type="button"
              >
                <span className="block t-12 font-medium leading-5 hover:text-primary">
                  {alert.title}
                </span>
                <span className="mt-0.5 block t-12 leading-4 text-ink-muted">
                  {alert.detail}
                </span>
              </button>
              {alert.source === "task" && (
                <button
                  aria-label={`Terminer : ${alert.title}`}
                  className={`rounded-control p-1 text-ink-muted hover:bg-primary/10 hover:text-primary ${focusRing}`}
                  disabled={busyIds.includes(alert.id.slice(5))}
                  onClick={() => onComplete(alert.id.slice(5))}
                  title="Terminer la tâche · Annuler pendant 5 s"
                  type="button"
                >
                  {busyIds.includes(alert.id.slice(5)) ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      size={18}
                      strokeWidth={1.5}
                    />
                  )}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      ) : (
        <EmptyState
          compact
          description={
            alerts.length
              ? "Les autres actions restent disponibles dans les filtres."
              : "Les rappels vaccinaux, les tâches et les stocks à surveiller sont regroupés ici."
          }
          title={alerts.length ? "Aucune action de ce type" : "Tout est à jour"}
        />
      )}
      <dl aria-label="Bilan des actions" className="premium-widget-metrics">
        <div>
          <dt>
            <i aria-hidden="true" className="finder-dot finder-dot-red" />
            Prioritaires
          </dt>
          <dd>{critical}</dd>
        </div>
        <div>
          <dt>
            <i aria-hidden="true" className="finder-dot finder-dot-orange" />À
            suivre
          </dt>
          <dd>{alerts.length - critical}</dd>
        </div>
        <div>
          <dt>
            <i aria-hidden="true" className="finder-dot finder-dot-blue" />
            Total
          </dt>
          <dd>{alerts.length}</dd>
        </div>
      </dl>
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-hairline pt-3">
        <span className="t-12 text-ink-muted">
          {filtered.length > 4
            ? `+ ${filtered.length - 4} à consulter`
            : "Priorités cliniques en premier"}
        </span>
        <ModuleLink onClick={onAll}>Rappels</ModuleLink>
      </div>
    </WidgetShell>
  );
}
