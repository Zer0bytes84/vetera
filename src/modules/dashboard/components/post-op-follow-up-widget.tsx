import {
  ArrowRight,
  Bandaids,
  CheckCircle,
  Heartbeat,
  ListChecks,
  Pill,
  Pulse,
  Shield,
  Stethoscope,
  Thermometer,
  UserCircle,
  Warning,
  WarningOctagon,
  Wind,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  type PostOpFilter,
  type PostOpPatient,
  usePostOpFollowUp,
} from "../hooks/usePostOpFollowUp";

const FILTER_TABS: {
  value: PostOpFilter;
  labelKey: string;
  fallback: string;
}[] = [
  { value: "all", labelKey: "dashboard.postOp.filterAll", fallback: "Tous" },
  {
    value: "critical",
    labelKey: "dashboard.postOp.filterCritical",
    fallback: "Critiques",
  },
  {
    value: "warn",
    labelKey: "dashboard.postOp.filterWarn",
    fallback: "Alertes",
  },
  { value: "ok", labelKey: "dashboard.postOp.filterOk", fallback: "OK" },
  {
    value: "tasks",
    labelKey: "dashboard.postOp.filterTasks",
    fallback: "Tâches",
  },
];

export function PostOpFollowUpWidget({
  onPatientClick,
  onOpenPatientFile,
}: {
  onPatientClick?: (patientId: string) => void;
  onOpenPatientFile?: (patientId: string) => void;
}) {
  const { t } = useTranslation();
  const { patients, isLoading, error, refresh } = usePostOpFollowUp();
  const [filter, setFilter] = useState<PostOpFilter>("all");

  const filtered = useMemo(() => {
    switch (filter) {
      case "critical":
        return patients.filter((p) => p.hasCritical);
      case "warn":
        return patients.filter((p) => p.hasWarn && !p.hasCritical);
      case "ok":
        return patients.filter((p) => !(p.hasCritical || p.hasWarn));
      case "tasks":
        return patients.filter((p) => p.hasTasks);
      default:
        return patients;
    }
  }, [patients, filter]);

  const counts = useMemo(
    () => ({
      all: patients.length,
      critical: patients.filter((p) => p.hasCritical).length,
      warn: patients.filter((p) => p.hasWarn && !p.hasCritical).length,
      ok: patients.filter((p) => !(p.hasCritical || p.hasWarn)).length,
      tasks: patients.filter((p) => p.hasTasks).length,
    }),
    [patients]
  );

  return (
    <Card className="@container/card group relative h-full overflow-hidden border-zinc-200/50 bg-white/40 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md dark:border-zinc-800/50 dark:bg-zinc-950/40">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 via-transparent to-transparent" />
      </div>

      <CardHeader className="relative z-10 border-border/40 border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Bandaids className="size-4" weight="duotone" />
            </div>
            <div>
              <CardTitle className="font-semibold text-sm tracking-tight">
                {t("dashboard.postOp.title", "Suivi Post-Opératoire")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t(
                  "dashboard.postOp.subtitle",
                  "30 derniers jours · constantes & alertes cliniques"
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {counts.critical > 0 && (
              <Badge className="border-rose-500/20 bg-rose-500/10 text-[10px] text-rose-600 tabular-nums dark:text-rose-400">
                <WarningOctagon className="mr-0.5 size-2.5" weight="fill" />
                {counts.critical}
              </Badge>
            )}
            {counts.warn > 0 && (
              <Badge className="border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-600 tabular-nums dark:text-amber-400">
                <Warning className="mr-0.5 size-2.5" weight="fill" />
                {counts.warn}
              </Badge>
            )}
            {counts.ok > 0 && (
              <Badge className="border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-600 tabular-nums dark:text-emerald-400">
                <CheckCircle className="mr-0.5 size-2.5" weight="fill" />
                {counts.ok}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1 overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.value;
            const count = counts[tab.value];
            return (
              <button
                className={cn(
                  "flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 font-semibold text-[11px] transition-colors",
                  active
                    ? "border border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    : "border border-border/40 bg-background/40 text-muted-foreground hover:bg-background/70"
                )}
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                type="button"
              >
                {t(tab.labelKey, tab.fallback)}
                {count > 0 && (
                  <span className="ml-1 text-[10px] tabular-nums opacity-70">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-2 pt-4">
        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-700 text-xs dark:text-rose-300">
            <p className="flex items-center gap-1.5 font-semibold">
              <WarningOctagon className="size-3.5" weight="fill" />
              {t(
                "dashboard.postOp.error",
                "Impossible de charger le suivi post-op."
              )}
            </p>
            <p className="mt-1 text-rose-600/80 dark:text-rose-400/80">
              {error.message}
            </p>
            <Button
              className="mt-2 h-7"
              onClick={refresh}
              size="sm"
              variant="ghost"
            >
              {t("common.retry", "Réessayer")}
            </Button>
          </div>
        ) : isLoading && patients.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                className="h-24 animate-pulse rounded-xl bg-zinc-100/50 dark:bg-zinc-900/50"
                key={i}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} onReset={() => setFilter("all")} t={t} />
        ) : (
          filtered.map((p) => (
            <PatientRow
              key={`${p.patientId}-${p.endedAt.toISOString()}`}
              onOpenFile={onOpenPatientFile}
              onPatientClick={onPatientClick}
              patient={p}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function PatientRow({
  patient,
  onPatientClick,
  onOpenFile,
}: {
  patient: PostOpPatient;
  onPatientClick?: (patientId: string) => void;
  onOpenFile?: (patientId: string) => void;
}) {
  const { t } = useTranslation();
  const severity = patient.hasCritical
    ? "critical"
    : patient.hasWarn
      ? "warn"
      : "ok";

  const tone = {
    critical: {
      border: "border-rose-500/40 dark:border-rose-500/30",
      bg: "bg-rose-500/5",
      badge:
        "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      Icon: WarningOctagon,
    },
    warn: {
      border: "border-amber-500/30 dark:border-amber-500/30",
      bg: "bg-amber-500/5",
      badge:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      Icon: Warning,
    },
    ok: {
      border: "border-emerald-500/20 dark:border-emerald-500/20",
      bg: "bg-emerald-500/5",
      badge:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      Icon: CheckCircle,
    },
  }[severity];

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-all",
        tone.border,
        tone.bg
      )}
    >
      <div className="flex items-start gap-3">
        <button
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          onClick={() => onPatientClick?.(patient.patientId)}
          type="button"
        >
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              tone.badge
            )}
          >
            <UserCircle className="size-5" weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-foreground/90 text-sm">
                {patient.patientName}
              </p>
              {patient.species && (
                <span className="font-mono text-[10px] text-muted-foreground/70">
                  {patient.species}
                </span>
              )}
              <Badge
                className="px-1.5 py-0 font-mono text-[10px]"
                variant="outline"
              >
                J+{patient.daysPostOp}
              </Badge>
              {patient.procedure && (
                <Badge
                  className="gap-1 px-1.5 py-0 text-[10px]"
                  variant="outline"
                >
                  <Stethoscope className="size-2.5" weight="duotone" />
                  {patient.procedure}
                </Badge>
              )}
            </div>
            {patient.ownerName && (
              <p className="truncate text-[11px] text-muted-foreground">
                {patient.ownerName}
              </p>
            )}
          </div>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge className={cn("text-[10px]", tone.badge)} variant="outline">
            <tone.Icon className="mr-0.5 size-2.5" weight="fill" />
            {severity === "critical"
              ? t("dashboard.postOp.severityCritical", "Critique")
              : severity === "warn"
                ? t("dashboard.postOp.severityWarn", "À surveiller")
                : t("dashboard.postOp.severityOk", "OK")}
          </Badge>
          {patient.hasVitals && patient.vitals.recordedAt && (
            <span className="font-mono text-[9px] text-muted-foreground/60">
              {formatRelative(patient.vitals.recordedAt)}
            </span>
          )}
        </div>
      </div>

      {patient.alerts.length > 0 && (
        <ul className="mt-2 space-y-1">
          {patient.alerts.slice(0, 3).map((a, idx) => (
            <li
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px]",
                a.severity === "critical"
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
              )}
              key={idx}
            >
              <AlertIcon metric={a.metric} />
              <span className="truncate font-medium">{a.message}</span>
            </li>
          ))}
          {patient.alerts.length > 3 && (
            <li className="px-2 text-[10px] text-muted-foreground/70">
              + {patient.alerts.length - 3} autre(s)
            </li>
          )}
        </ul>
      )}

      {patient.hasVitals && (
        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px]">
          {patient.vitals.temperatureC !== null && (
            <VitalChip
              icon={<Thermometer weight="duotone" />}
              label="T°"
              value={`${patient.vitals.temperatureC.toFixed(1)}°C`}
            />
          )}
          {patient.vitals.heartRateBpm !== null && (
            <VitalChip
              icon={<Heartbeat weight="duotone" />}
              label="FC"
              value={`${patient.vitals.heartRateBpm} bpm`}
            />
          )}
          {patient.vitals.respiratoryRate !== null && (
            <VitalChip
              icon={<Wind weight="duotone" />}
              label="FR"
              value={`${patient.vitals.respiratoryRate}/m`}
            />
          )}
          {patient.vitals.spo2Percent !== null && (
            <VitalChip
              icon={<Pulse weight="duotone" />}
              label="SpO2"
              value={`${patient.vitals.spo2Percent}%`}
            />
          )}
          {patient.vitals.painScore !== null && (
            <VitalChip
              icon={<Pill weight="duotone" />}
              label="Douleur"
              value={`${patient.vitals.painScore}/10`}
            />
          )}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        <Button
          className="h-7 gap-1 text-[11px]"
          onClick={() => onPatientClick?.(patient.patientId)}
          size="sm"
          variant="ghost"
        >
          {t("dashboard.postOp.actionView", "Voir dossier")}
          <ArrowRight className="size-2.5" weight="bold" />
        </Button>
        {patient.hasCritical && (
          <Button
            className="h-7 gap-1 text-[11px] text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
            onClick={() => onOpenFile?.(patient.patientId)}
            size="sm"
            variant="ghost"
          >
            <Shield className="size-2.5" weight="duotone" />
            {t("dashboard.postOp.actionEscalate", "Escalader")}
          </Button>
        )}
        {patient.hasTasks && (
          <Badge
            className="gap-1 border-violet-500/20 bg-violet-500/10 text-[10px] text-violet-600 dark:text-violet-400"
            variant="outline"
          >
            <ListChecks className="size-2.5" weight="duotone" />
            {patient.tasksOpen}/{patient.tasksTotal}
          </Badge>
        )}
      </div>
    </div>
  );
}

function VitalChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-background/60 px-1.5 py-0.5 text-foreground/80">
      <span className="text-muted-foreground/70">{icon}</span>
      <span className="text-[9px] text-muted-foreground/60 uppercase">
        {label}
      </span>
      <span className="font-bold tabular-nums">{value}</span>
    </span>
  );
}

function AlertIcon({ metric }: { metric: string }) {
  const Icon =
    {
      temperature: Thermometer,
      heartRate: Heartbeat,
      respiratoryRate: Wind,
      spo2: Pulse,
      pain: Pill,
    }[metric] ?? Warning;
  return <Icon className="size-3 shrink-0" weight="duotone" />;
}

function EmptyState({
  filter,
  onReset,
  t,
}: {
  filter: PostOpFilter;
  onReset: () => void;
  t: (k: string, d: string) => string;
}) {
  return (
    <div className="rounded-xl border border-emerald-500/30 border-dashed bg-emerald-500/5 p-6 text-center">
      <CheckCircle
        className="mx-auto mb-2 size-8 text-emerald-500"
        weight="duotone"
      />
      <p className="font-semibold text-emerald-700 text-sm dark:text-emerald-300">
        {filter === "all"
          ? t("dashboard.postOp.emptyAll", "Aucune chirurgie récente (30j).")
          : filter === "critical"
            ? t(
                "dashboard.postOp.emptyCritical",
                "Aucune alerte critique — excellent."
              )
            : filter === "warn"
              ? t("dashboard.postOp.emptyWarn", "Aucun patient à surveiller.")
              : t(
                  "dashboard.postOp.emptyOk",
                  "Aucun patient OK dans cette vue."
                )}
      </p>
      {filter !== "all" && (
        <Button
          className="mt-2 h-7 text-xs"
          onClick={onReset}
          size="sm"
          variant="ghost"
        >
          {t("dashboard.postOp.resetFilter", "Voir tous")}
        </Button>
      )}
    </div>
  );
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return "à l'instant";
  }
  if (minutes < 60) {
    return `il y a ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `il y a ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}
