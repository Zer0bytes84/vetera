import { ArrowUpRight, CalendarBlank, Scales, Stethoscope } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { Appointment, WeightEntry } from "@/types/db";
import { describeWeightChange, sortWeightEntries } from "../lib/weight-change";
import { normalizeDate } from "./patients-shared";

interface PatientKpiStripProps {
  className?: string;
  lastVisit?: string;
  nextAppointment?: Appointment;
  onAppointmentClick: () => void;
  onTimelineClick: () => void;
  onWeightClick: () => void;
  showLastVisit?: boolean;
  weightEntries: WeightEntry[];
}

function formatDateShort(value: string | undefined) {
  const date = normalizeDate(value);
  return date
    ? date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;
}

export function PatientKpiStrip({
  className,
  lastVisit,
  nextAppointment,
  onAppointmentClick,
  onTimelineClick,
  onWeightClick,
  showLastVisit = true,
  weightEntries,
}: PatientKpiStripProps) {
  const sortedWeights = sortWeightEntries(weightEntries);
  const lastWeight = sortedWeights[sortedWeights.length - 1];
  const weightChange = describeWeightChange(weightEntries);
  const formatKg = (value: number) =>
    value.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const sparklineWeights = sortedWeights.slice(-6);
  const minWeight = Math.min(
    ...sparklineWeights.map((entry) => entry.weightKg),
    (lastWeight?.weightKg || 1) * 0.9
  );
  const maxWeight = Math.max(
    ...sparklineWeights.map((entry) => entry.weightKg),
    (lastWeight?.weightKg || 1) * 1.1
  );
  const sparklinePoints = sparklineWeights
    .map((entry, index) => {
      const x =
        sparklineWeights.length > 1
          ? 4 + (index / (sparklineWeights.length - 1)) * 56
          : 32;
      const y =
        maxWeight > minWeight
          ? 24 - ((entry.weightKg - minWeight) / (maxWeight - minWeight)) * 20
          : 14;
      return `${x},${y}`;
    })
    .join(" ");

  const lastVisitFormatted = formatDateShort(lastVisit);
  const nextApptDate = normalizeDate(nextAppointment?.startTime);
  const nextApptFormatted = nextApptDate
    ? formatDateShort(nextAppointment?.startTime)
    : null;
  const displayedVisit = showLastVisit
    ? lastVisitFormatted
    : nextAppointment
      ? nextApptFormatted || "Date à confirmer"
      : null;

  return (
    <section
      aria-label="Suivi clinique consolidé"
      className={cn("medical-kpi-strip", className)}
    >
      <article aria-label="Suivi du poids" className="medical-kpi group">
        <div className="medical-kpi-heading">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-indigo-200/60 bg-indigo-50 text-indigo-600 shadow-xs dark:border-indigo-800/40 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Scales aria-hidden="true" size={16} weight="duotone" />
            </div>
            <h2 className="font-semibold text-foreground/80 text-xs uppercase tracking-wide">
              Poids
            </h2>
          </div>
          <button
            aria-label="Voir l’historique des pesées"
            className="medical-icon-action"
            onClick={onWeightClick}
            title="Historique des pesées"
            type="button"
          >
            <ArrowUpRight aria-hidden="true" size={16} />
          </button>
        </div>
        {lastWeight ? (
          <>
            <div className="medical-kpi-value-row mt-1">
              <p className="medical-kpi-value font-bold text-2xl text-foreground tracking-tight">
                {lastWeight.weightKg.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <span className="medical-kpi-unit ml-1.5 font-medium text-muted-foreground text-sm">
                  kg
                </span>
              </p>
              {sparklineWeights.length > 1 && (
                <svg
                  aria-label={`Évolution des ${sparklineWeights.length} dernières pesées`}
                  className="medical-weight-sparkline h-8 w-20"
                  fill="none"
                  role="img"
                  viewBox="0 0 64 28"
                >
                  <defs>
                    <linearGradient
                      id="weight-spark-grad"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#6366f1"
                        stopOpacity="0.35"
                      />
                      <stop
                        offset="100%"
                        stopColor="#6366f1"
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>
                  <title>
                    {sparklineWeights
                      .map(
                        (entry) =>
                          `${formatDateShort(entry.measuredAt)} : ${entry.weightKg.toLocaleString("fr-FR")} kg`
                      )
                      .join(" ; ")}
                  </title>
                  {sparklinePoints && (
                    <polygon
                      fill="url(#weight-spark-grad)"
                      points={`4,27 ${sparklinePoints} 60,27`}
                    />
                  )}
                  <polyline
                    points={sparklinePoints}
                    stroke="#6366f1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </div>
            <div className="medical-kpi-caption-row mt-2">
              <span className="text-muted-foreground text-xs">
                Mesuré le {formatDateShort(lastWeight.measuredAt)}
              </span>
              {weightChange.kind === "change" && (
                <span
                  className={cn(
                    "medical-weight-delta inline-flex items-center rounded-full border px-2 py-0.5 font-semibold text-xs shadow-2xs",
                    weightChange.deltaKg < 0
                      ? "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/50 dark:text-amber-300"
                      : "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/50 dark:text-emerald-300"
                  )}
                  title="Variation depuis la pesée précédente"
                >
                  {`${weightChange.deltaKg > 0 ? "+" : ""}${formatKg(weightChange.deltaKg)} kg`}
                </span>
              )}
              {weightChange.kind === "implausible" && (
                <button
                  className="medical-weight-delta inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs hover:text-foreground"
                  onClick={onWeightClick}
                  title={`Pesée précédente : ${formatKg(weightChange.previous.weightKg)} kg le ${formatDateShort(weightChange.previous.measuredAt)}. Écart trop grand pour être une variation réelle : vérifiez la saisie dans l’onglet Poids.`}
                  type="button"
                >
                  Écart à vérifier
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="medical-kpi-empty mt-2">
            <p className="medical-kpi-value font-bold text-foreground text-lg">
              Aucune pesée
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              À saisir dans l’onglet Poids.
            </p>
          </div>
        )}
      </article>

      <article aria-label="Parcours de soins" className="medical-kpi group">
        <div className="medical-kpi-heading">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-violet-200/60 bg-violet-50 text-violet-600 shadow-xs dark:border-violet-800/40 dark:bg-violet-950/60 dark:text-violet-400">
              <Stethoscope aria-hidden="true" size={16} weight="duotone" />
            </div>
            <h2 className="font-semibold text-foreground/80 text-xs uppercase tracking-wide">
              Parcours de soins
            </h2>
          </div>
          <button
            aria-label="Voir la chronologie des soins"
            className="medical-icon-action"
            onClick={onTimelineClick}
            title="Chronologie des soins"
            type="button"
          >
            <ArrowUpRight aria-hidden="true" size={16} />
          </button>
        </div>
        {displayedVisit ? (
          <>
            <p className="medical-kpi-value mt-1 font-bold text-foreground text-lg">
              {displayedVisit}
            </p>
            <p className="medical-kpi-caption text-muted-foreground text-xs">
              {showLastVisit ? "Dernière consultation" : "Prochaine visite"}
            </p>
            {!showLastVisit && nextAppointment && (
              <p className="medical-kpi-detail mt-1 truncate font-medium text-foreground/80 text-xs">
                {nextAppointment.type}
                {nextApptDate &&
                  ` · ${nextApptDate.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
              </p>
            )}
          </>
        ) : (
          <div className="medical-kpi-empty mt-2">
            <p className="medical-kpi-value font-bold text-foreground text-lg">
              {showLastVisit ? "Aucune visite" : "Aucune visite à venir"}
            </p>
          </div>
        )}
        {showLastVisit && nextAppointment ? (
          <button
            className="medical-next-visit medical-kpi-footer mt-auto inline-flex cursor-pointer items-center gap-2 pt-2 font-medium text-violet-700 text-xs hover:underline dark:text-violet-300"
            onClick={onAppointmentClick}
            title="Ouvrir le rendez-vous dans l’agenda"
            type="button"
          >
            <CalendarBlank aria-hidden="true" size={15} weight="duotone" />
            <span>Prochaine visite :</span>
            <strong className="font-semibold">
              {nextApptFormatted || "Voir le rendez-vous"}
            </strong>
          </button>
        ) : showLastVisit ? (
          lastVisitFormatted ? (
            <button
              className="medical-kpi-text-action medical-kpi-footer mt-auto inline-flex cursor-pointer items-center gap-1.5 pt-2 font-medium text-muted-foreground text-xs hover:text-foreground"
              onClick={onAppointmentClick}
              type="button"
            >
              <span>Planifier la suite</span>
              <ArrowUpRight aria-hidden="true" size={14} />
            </button>
          ) : null
        ) : (
          <button
            className="medical-kpi-text-action medical-kpi-footer mt-auto inline-flex cursor-pointer items-center gap-1.5 pt-2 font-medium text-muted-foreground text-xs hover:text-foreground"
            onClick={nextAppointment ? onAppointmentClick : onTimelineClick}
            type="button"
          >
            <span>
              {nextAppointment
                ? "Ouvrir l’agenda"
                : "Voir le parcours de soins"}
            </span>
            <ArrowUpRight aria-hidden="true" size={14} />
          </button>
        )}
      </article>
    </section>
  );
}
