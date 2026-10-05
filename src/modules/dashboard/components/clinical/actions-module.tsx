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
      className="clinical-module clinical-actions-module"
      title="Actions à suivre"
      subtitle={
        critical
          ? `${critical} action${critical > 1 ? "s" : ""} prioritaire${critical > 1 ? "s" : ""}`
          : "Les prochaines actions du cabinet"
      }
      actions={
        <SignalBadge
          tone={critical ? "critical" : alerts.length ? "watch" : "positive"}
        >
          {alerts.length ? `${alerts.length} à suivre` : "À jour"}
        </SignalBadge>
      }
      pending={state.loading}
      showSkeleton={state.skeleton}
      error={state.error}
      onRetry={state.retry}
      skeleton={<RowSkeleton />}
    >
      {alerts.length > 0 && (
        <div
          role="group"
          aria-label="Filtrer les actions"
          className="clinical-filter-tabs"
        >
          {filters.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => onFilter(value)}
              className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors duration-150 ${filter === value ? "bg-frame text-ink" : "text-ink-muted hover:bg-frame"} ${focusRing}`}
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
              key={alert.id}
              layout={!reducedMotion}
              initial={false}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
              transition={{ duration: MOTION.fast, ease: MOTION.easeOut }}
              data-row-id={
                alert.source === "task" ? alert.id.slice(5) : undefined
              }
              className="flex items-start gap-3 border-t border-hairline py-3"
            >
              <span
                aria-hidden="true"
                className={`mt-1.5 size-1.5 shrink-0 rounded-full ${alert.tone === "critical" ? "bg-signal-critical" : alert.tone === "warning" ? "bg-signal-watch" : "bg-secondary"}`}
              />
              <button
                type="button"
                className={`min-w-0 flex-1 rounded text-left ${focusRing}`}
                onClick={() => onOpen(alert)}
              >
                <span className="block text-[12px] font-medium leading-5 hover:text-primary">
                  {alert.title}
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 text-ink-muted">
                  {alert.detail}
                </span>
              </button>
              {alert.source === "task" && (
                <button
                  type="button"
                  disabled={busyIds.includes(alert.id.slice(5))}
                  title="Terminer la tâche · Annuler pendant 5 s"
                  aria-label={`Terminer : ${alert.title}`}
                  className={`rounded-control p-1 text-ink-muted hover:bg-primary/10 hover:text-primary ${focusRing}`}
                  onClick={() => onComplete(alert.id.slice(5))}
                >
                  {busyIds.includes(alert.id.slice(5)) ? (
                    <Loader2 size={18} className="animate-spin" />
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
          title={alerts.length ? "Aucune action de ce type" : "Tout est à jour"}
          description={
            alerts.length
              ? "Les autres actions restent disponibles dans les filtres."
              : "Les rappels vaccinaux, les tâches et les stocks à surveiller sont regroupés ici."
          }
        />
      )}
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-hairline pt-3">
        <span className="text-[11px] text-ink-muted">
          {filtered.length > 4
            ? `+ ${filtered.length - 4} à consulter`
            : "Priorités cliniques en premier"}
        </span>
        <ModuleLink onClick={onAll}>Rappels</ModuleLink>
      </div>
    </WidgetShell>
  );
}
