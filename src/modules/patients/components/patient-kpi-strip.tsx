import {
  ArrowUpRight,
  CalendarBlank,
  Plus,
  Scales,
  Stethoscope,
  Syringe,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Appointment, Vaccination, WeightEntry } from "@/types/db";
import { normalizeDate } from "./patients-shared";

interface PatientKpiStripProps {
  className?: string;
  lastVisit?: string;
  nextAppointment?: Appointment;
  nextVaccination?: Vaccination | null;
  now: number;
  onAppointmentClick: () => void;
  onTimelineClick: () => void;
  onVaccinationClick: () => void;
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

function diffDays(target: Date, now: Date) {
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function PatientKpiStrip({
  className,
  lastVisit,
  nextAppointment,
  nextVaccination,
  now,
  onAppointmentClick,
  onTimelineClick,
  onVaccinationClick,
  onWeightClick,
  showLastVisit = true,
  weightEntries,
}: PatientKpiStripProps) {
  const currentDate = new Date(now);
  const sortedWeights = [...weightEntries].sort(
    (a, b) =>
      new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
  );
  const lastWeight = sortedWeights[sortedWeights.length - 1];
  const previousWeight = sortedWeights[sortedWeights.length - 2];
  const weightDifference =
    lastWeight && previousWeight
      ? lastWeight.weightKg - previousWeight.weightKg
      : null;
  const weightDelta =
    weightDifference !== null && Math.abs(weightDifference) >= 0.05
      ? `${weightDifference > 0 ? "+" : ""}${weightDifference.toLocaleString(
          "fr-FR",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )} kg`
      : null;

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

  const nextVaccDate = normalizeDate(nextVaccination?.nextDueAt);
  const nextVaccDaysOut = nextVaccDate
    ? diffDays(nextVaccDate, currentDate)
    : null;
  const isVaccOverdue = nextVaccDaysOut !== null && nextVaccDaysOut < 0;
  const isVaccDueSoon =
    nextVaccDaysOut !== null && nextVaccDaysOut >= 0 && nextVaccDaysOut <= 30;
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
      <article className="medical-kpi group" aria-label="Suivi du poids">
        <div className="medical-kpi-heading">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-200/60 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800/40 shrink-0 shadow-xs">
              <Scales size={16} weight="duotone" aria-hidden="true" />
            </div>
            <h2 className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Poids</h2>
          </div>
          {lastWeight && (
            <button
              onClick={onWeightClick}
              type="button"
              className="medical-icon-action"
              aria-label="Voir l’historique des pesées"
              title="Historique des pesées"
            >
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        {lastWeight ? (
          <>
            <div className="medical-kpi-value-row mt-1">
              <p className="medical-kpi-value text-2xl font-bold tracking-tight text-foreground">
                {lastWeight.weightKg.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <span className="medical-kpi-unit text-sm font-medium text-muted-foreground ml-1.5">kg</span>
              </p>
              {sparklineWeights.length > 1 && (
                <svg
                  className="medical-weight-sparkline w-20 h-8"
                  viewBox="0 0 64 28"
                  fill="none"
                  role="img"
                  aria-label={`Évolution des ${sparklineWeights.length} dernières pesées`}
                >
                  <defs>
                    <linearGradient id="weight-spark-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
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
                    stroke="#6366f1"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={sparklinePoints}
                  />
                </svg>
              )}
            </div>
            <div className="medical-kpi-caption-row mt-2">
              <span className="text-xs text-muted-foreground">Mesuré le {formatDateShort(lastWeight.measuredAt)}</span>
              {weightDelta && (
                <span
                  className={cn(
                    "medical-weight-delta inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border shadow-2xs",
                    weightDifference && weightDifference < 0
                      ? "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/40"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40"
                  )}
                  title="Variation depuis la pesée précédente"
                >
                  {weightDelta}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="medical-kpi-empty mt-2">
            <Button
              variant="outline"
              size="sm"
              className="medical-action medical-action-outline h-8 text-xs font-medium cursor-pointer"
              onClick={onWeightClick}
            >
              <Plus className="size-3.5 mr-1" aria-hidden="true" />
              Ajouter une pesée
            </Button>
            <p className="text-xs text-muted-foreground mt-1">Suivre l’évolution du poids.</p>
          </div>
        )}
      </article>

      <article className="medical-kpi group" aria-label="Suivi vaccinal">
        <div className="medical-kpi-heading">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/40 shrink-0 shadow-xs">
              <Syringe size={16} weight="duotone" aria-hidden="true" />
            </div>
            <h2 className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Vaccination</h2>
          </div>
          {nextVaccination && (
            <button
              onClick={onVaccinationClick}
              type="button"
              className="medical-icon-action"
              aria-label="Voir les vaccinations"
              title="Détails des vaccinations"
            >
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        {nextVaccination ? (
          <>
            <div className="medical-kpi-value-row mt-1">
              <p className="medical-kpi-value text-lg font-bold text-foreground">
                {formatDateShort(nextVaccination.nextDueAt) ||
                  "Rappel à planifier"}
              </p>
              <span
                className={cn(
                  "medical-kpi-status inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs",
                  nextVaccDaysOut === null
                    ? "bg-muted text-muted-foreground border-border"
                    : isVaccOverdue
                      ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/40"
                      : isVaccDueSoon
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40"
                )}
              >
                {nextVaccDaysOut === null
                  ? "À planifier"
                  : isVaccOverdue
                    ? "En retard"
                    : isVaccDueSoon
                      ? "Bientôt dû"
                      : "À jour"}
              </span>
            </div>
            <p className="medical-kpi-detail text-xs font-medium text-foreground/85 truncate mt-1">{nextVaccination.vaccineName}</p>
            {nextVaccDaysOut !== null && (
              <p className="medical-kpi-caption medical-kpi-footer text-xs text-muted-foreground mt-auto pt-2">
                {nextVaccDaysOut < 0
                  ? `${Math.abs(nextVaccDaysOut)} jours de retard`
                  : nextVaccDaysOut === 0
                    ? "Rappel aujourd’hui"
                    : `Rappel dans ${nextVaccDaysOut} jours`}
              </p>
            )}
          </>
        ) : (
          <div className="medical-kpi-empty mt-2">
            <Button
              variant="outline"
              size="sm"
              className="medical-action medical-action-outline h-8 text-xs font-medium cursor-pointer"
              onClick={onVaccinationClick}
            >
              <Plus className="size-3.5 mr-1" aria-hidden="true" />
              Enregistrer un vaccin
            </Button>
            <p className="text-xs text-muted-foreground mt-1">Tenir le carnet vaccinal à jour.</p>
          </div>
        )}
      </article>

      <article className="medical-kpi group" aria-label="Parcours de soins">
        <div className="medical-kpi-heading">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg flex items-center justify-center bg-violet-50 text-violet-600 border border-violet-200/60 dark:bg-violet-950/60 dark:text-violet-400 dark:border-violet-800/40 shrink-0 shadow-xs">
              <Stethoscope size={16} weight="duotone" aria-hidden="true" />
            </div>
            <h2 className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Parcours de soins</h2>
          </div>
          <button
            onClick={onTimelineClick}
            type="button"
            className="medical-icon-action"
            aria-label="Voir la chronologie des soins"
            title="Chronologie des soins"
          >
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </div>
        {displayedVisit ? (
          <>
            <p className="medical-kpi-value text-lg font-bold text-foreground mt-1">{displayedVisit}</p>
            <p className="medical-kpi-caption text-xs text-muted-foreground">
              {showLastVisit ? "Dernière consultation" : "Prochaine visite"}
            </p>
            {!showLastVisit && nextAppointment && (
              <p className="medical-kpi-detail text-xs font-medium text-foreground/80 truncate mt-1">
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
            <Button
              variant="outline"
              size="sm"
              className="medical-action medical-action-outline h-8 text-xs font-medium cursor-pointer"
              onClick={onAppointmentClick}
            >
              <Plus className="size-3.5 mr-1" aria-hidden="true" />
              Planifier une visite
            </Button>
            {!showLastVisit && <p className="text-xs text-muted-foreground mt-1">Aucune visite à venir.</p>}
          </div>
        )}
        {showLastVisit && nextAppointment ? (
          <button
            type="button"
            className="medical-next-visit medical-kpi-footer inline-flex items-center gap-2 mt-auto pt-2 text-xs font-medium text-violet-700 dark:text-violet-300 hover:underline cursor-pointer"
            onClick={onAppointmentClick}
            title="Ouvrir le rendez-vous dans l’agenda"
          >
            <CalendarBlank size={15} weight="duotone" aria-hidden="true" />
            <span>Prochaine visite :</span>
            <strong className="font-semibold">{nextApptFormatted || "Voir le rendez-vous"}</strong>
          </button>
        ) : !showLastVisit ? (
          <button
            type="button"
            onClick={nextAppointment ? onAppointmentClick : onTimelineClick}
            className="medical-kpi-text-action medical-kpi-footer inline-flex items-center gap-1.5 mt-auto pt-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <span>{nextAppointment ? "Ouvrir l’agenda" : "Voir le parcours de soins"}</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        ) : lastVisitFormatted ? (
          <button
            type="button"
            onClick={onAppointmentClick}
            className="medical-kpi-text-action medical-kpi-footer inline-flex items-center gap-1.5 mt-auto pt-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <span>Planifier la suite</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        ) : null}
      </article>
    </section>
  );
}
