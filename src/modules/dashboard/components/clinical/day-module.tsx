import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CalendarAdd01Icon,
} from "@/lib/hugeicons";
import {
  ActionButton,
  EmptyState,
  IconButton,
  focusRing,
} from "@/design-system/primitives";
import { WidgetShell } from "@/design-system/patterns/widget-shell";
import { StatusStepper } from "@/design-system/patterns/status-stepper";
import { MOTION } from "@/design-system/motion";
import { formatTime, type ScheduleEntry } from "../../v2/model";
import {
  ModuleLink,
  ModuleTotals,
  PatientPortrait,
  RowSkeleton,
  type WidgetState,
} from "./shared";

export function DayModule({
  rows,
  date,
  context,
  state,
  reducedMotion,
  onShiftDay,
  onToday,
  onAgenda,
  onPlan,
  onPatient,
  onIntent,
  onIntentCancel,
  onFlux,
}: {
  rows: ScheduleEntry[];
  date: Date;
  context: { label: string; rows: ScheduleEntry[] };
  state: WidgetState;
  reducedMotion: boolean;
  onShiftDay: (days: number) => void;
  onToday: () => void;
  onAgenda: () => void;
  onPlan: () => void;
  onPatient: (id: string) => void;
  onIntent: () => void;
  onIntentCancel: () => void;
  onFlux: (id: string) => void;
}) {
  const [filter, setFilter] = useState<
    "all" | "waiting" | "in_progress" | "completed"
  >("all");
  const [page, setPage] = useState(0);
  const filtered = rows.filter(
    (row) =>
      filter === "all" ||
      (filter === "waiting"
        ? ["scheduled", "confirmed", "arrived", "waiting"].includes(
            row.appointment.status
          )
        : row.appointment.status === filter)
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 5));
  const activePage = Math.min(page, pageCount - 1);
  const completed = rows.filter(
    (row) => row.appointment.status === "completed"
  ).length;
  const waiting = rows.filter((row) =>
    ["arrived", "waiting"].includes(row.appointment.status)
  ).length;
  const total = rows.filter(
    (row) => row.appointment.status !== "no_show"
  ).length;
  return (
    <WidgetShell
      actions={
        <div className="flex items-center gap-1">
          <IconButton label="Jour précédent" onClick={() => onShiftDay(-1)}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.5} />
          </IconButton>
          <button
            className={`rounded-control px-2 py-1.5 t-12 text-ink-muted hover:bg-frame ${focusRing}`}
            onClick={onToday}
            type="button"
          >
            Aujourd’hui
          </button>
          <IconButton label="Jour suivant" onClick={() => onShiftDay(1)}>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={16}
              strokeWidth={1.5}
            />
          </IconButton>
        </div>
      }
      className="clinical-module clinical-day-module"
      error={state.error}
      icon={CalendarDays}
      onRetry={state.retry}
      pending={state.loading}
      showSkeleton={state.skeleton}
      skeleton={<RowSkeleton />}
      subtitle={date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}
      title="Planning des visites"
    >
      <ModuleTotals
        values={[
          { label: "rendez-vous", value: total },
          {
            label: "en attente",
            value: waiting,
            tone: waiting ? "watch" : "quiet",
          },
          {
            label: "terminés",
            value: completed,
            tone: completed ? "positive" : "quiet",
          },
        ]}
      />
      <div
        aria-label="Filtrer les visites"
        className="clinical-filter-tabs"
        data-tabs-style="segmented"
        role="group"
      >
        {(
          [
            ["all", "Toutes"],
            ["waiting", "À recevoir"],
            ["in_progress", "En consultation"],
            ["completed", "Terminées"],
          ] as const
        ).map(([value, label]) => (
          <button
            aria-pressed={filter === value}
            key={value}
            onClick={() => {
              setFilter(value);
              setPage(0);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      {filtered.length ? (
        <div className="pt-1">
          <AnimatePresence initial={false}>
            {filtered.slice(activePage * 5, activePage * 5 + 5).map((row) => (
              <motion.div
                animate={{ opacity: 1 }}
                className="group/row flex min-w-0 flex-wrap items-center gap-3 rounded-control py-3 transition-colors duration-150 hover:bg-frame sm:flex-nowrap"
                data-row-id={row.appointment.id}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                initial={false}
                key={row.appointment.id}
                layout={!reducedMotion}
                onBlur={onIntentCancel}
                onFocus={onIntent}
                onPointerEnter={onIntent}
                onPointerLeave={onIntentCancel}
                transition={{ duration: MOTION.fast, ease: MOTION.easeOut }}
              >
                <div className="w-12 shrink-0 border-r border-hairline">
                  <time className="t-13 font-medium tabular-nums">
                    {formatTime(row.start)}
                  </time>
                  <p className="mt-1 t-12 text-ink-muted">
                    {Math.max(
                      0,
                      Math.round(
                        (row.end.getTime() - row.start.getTime()) / 60_000
                      )
                    )}{" "}
                    min
                  </p>
                </div>
                <PatientPortrait name={row.patientName} />
                <div className="min-w-0 flex-1">
                  <button
                    className={`max-w-full truncate rounded text-left t-13 font-medium hover:text-primary ${focusRing}`}
                    onClick={() => onPatient(row.appointment.patientId)}
                    type="button"
                  >
                    {row.patientName}
                  </button>
                  <p className="mt-1 truncate t-12 text-ink-muted">
                    {row.appointment.type} · {row.ownerName}
                  </p>
                </div>
                <StatusStepper
                  onFlux={() => onFlux(row.appointment.id)}
                  status={row.appointment.status}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState
          action={
            <ActionButton onClick={onPlan} quiet>
              <HugeiconsIcon
                icon={CalendarAdd01Icon}
                size={15}
                strokeWidth={1.5}
              />
              Planifier une visite
            </ActionButton>
          }
          compact
          description={
            rows.length
              ? "Choisissez un autre état pour retrouver les visites de cette journée."
              : "La prochaine visite peut se préparer dès maintenant."
          }
          title={
            rows.length
              ? "Aucune visite dans ce filtre"
              : "Aucun rendez-vous ce jour"
          }
        />
      )}
      {rows.length < 3 && context.rows.length > 0 && (
        <div className="mt-2 border-t border-hairline pt-3">
          <h3 className="mb-1 t-12 font-medium text-ink-muted">
            {context.label}
          </h3>
          {context.rows.slice(0, 2).map((row) => (
            <button
              className={`flex w-full items-center justify-between gap-3 rounded-control py-2 text-left t-12 hover:text-primary ${focusRing}`}
              key={row.appointment.id}
              onClick={() => onPatient(row.appointment.patientId)}
              type="button"
            >
              <span className="truncate">
                {row.patientName}
                <span className="ml-2 text-ink-muted">
                  {row.appointment.type}
                </span>
              </span>
              <time className="shrink-0 t-12 text-ink-muted">
                {row.start.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </time>
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
        <span className="t-12 text-ink-muted">
          {filtered.length
            ? `${activePage * 5 + 1}–${Math.min(filtered.length, activePage * 5 + 5)} sur ${filtered.length} visites`
            : "Chaque visite reste reliée au dossier"}
        </span>
        <div className="flex items-center gap-2">
          {pageCount > 1 && (
            <>
              <IconButton
                disabled={activePage === 0}
                label="Visites précédentes"
                onClick={() => setPage(activePage - 1)}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
              </IconButton>
              <IconButton
                disabled={activePage + 1 === pageCount}
                label="Visites suivantes"
                onClick={() => setPage(activePage + 1)}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </IconButton>
            </>
          )}
          <ModuleLink onClick={onAgenda}>Agenda</ModuleLink>
        </div>
      </div>
    </WidgetShell>
  );
}
