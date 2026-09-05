import {
  ArrowRight,
  BellRing,
  Box,
  CalendarX2,
  CheckCircle2,
  ClipboardCheck,
  ShieldAlert,
  Syringe,
} from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { View } from "@/types";
import type {
  Appointment,
  Patient,
  Product,
  Task,
  Vaccination,
} from "@/types/db";
import {
  type AlertTone,
  buildClinicalAlerts,
  type ClinicalAlert,
} from "./model";
import { WidgetShell } from "./widget-shell";

const SOURCE_CONFIG = {
  task: { icon: ClipboardCheck, label: "Action" },
  stock: { icon: Box, label: "Stock" },
  vaccine: { icon: Syringe, label: "Vaccin" },
  appointment: { icon: CalendarX2, label: "Relance" },
} as const;

const TONE_CLASS: Record<AlertTone, string> = {
  critical:
    "bg-rose-50 text-rose-600 ring-rose-200/70 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20",
  warning:
    "bg-amber-50 text-amber-600 ring-amber-200/70 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  info: "bg-sky-50 text-sky-600 ring-sky-200/70 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20",
};

function routeForAlert(alert: ClinicalAlert): View {
  if (alert.source === "stock") {
    return "stock";
  }
  if (alert.source === "task") {
    return "taches";
  }
  if (alert.source === "appointment") {
    return "agenda";
  }
  return "patients";
}

export function ClinicalAlertsWidget({
  appointments,
  patients,
  products,
  referenceDate,
  tasks,
  vaccinations,
  onNavigate,
  onNavigateToPatient,
}: {
  appointments: Appointment[];
  patients: Patient[];
  products: Product[];
  referenceDate: Date;
  tasks: Task[];
  vaccinations: Vaccination[];
  onNavigate?: (view: View) => void;
  onNavigateToPatient?: (patientId: string) => void;
}) {
  const alerts = useMemo(
    () =>
      buildClinicalAlerts({
        appointments,
        patients,
        products,
        tasks,
        vaccinations,
        referenceDate,
      }),
    [appointments, patients, products, referenceDate, tasks, vaccinations]
  );
  const criticalCount = alerts.filter(
    (alert) => alert.tone === "critical"
  ).length;
  const warningCount = alerts.filter(
    (alert) => alert.tone === "warning"
  ).length;
  const handleAlert = (alert: ClinicalAlert) => {
    if (alert.patientId && alert.source !== "task") {
      onNavigateToPatient?.(alert.patientId);
      return;
    }
    onNavigate?.(routeForAlert(alert));
  };

  return (
    <WidgetShell
      accent="amber"
      action={
        alerts.length ? (
          <Badge
            className={cn(
              alerts.some((alert) => alert.tone === "critical")
                ? "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300"
                : "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
            )}
            variant="outline"
          >
            {alerts.length} à traiter
          </Badge>
        ) : null
      }
      className="min-h-[430px]"
      contentClassName="flex flex-col p-0"
      description="Priorités cliniques et opérationnelles"
      icon={ShieldAlert}
      iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300"
      title="Vigilance"
    >
      <div className="border-zinc-200/70 border-b px-5 py-4 dark:border-white/8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground">
              Priorités à traiter
            </p>
            <p className="mt-0.5 font-semibold text-2xl tabular-nums tracking-[-0.035em]">
              {alerts.length}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-rose-600 dark:text-rose-300">
              <strong className="font-semibold tabular-nums">
                {criticalCount}
              </strong>{" "}
              critique{criticalCount > 1 ? "s" : ""}
            </span>
            <span className="text-amber-600 dark:text-amber-300">
              <strong className="font-semibold tabular-nums">
                {warningCount}
              </strong>{" "}
              alerte{warningCount > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {alerts.length ? (
        <div className="flex-1 space-y-1.5 p-3">
          {alerts.slice(0, 5).map((alert) => {
            const source = SOURCE_CONFIG[alert.source];
            const Icon = source.icon;
            return (
              <button
                className="group/alert flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-zinc-100/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/6"
                key={alert.id}
                onClick={() => handleAlert(alert)}
                type="button"
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-xl ring-1",
                    TONE_CLASS[alert.tone]
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold text-[12px] tracking-[-0.01em]">
                      {alert.title}
                    </span>
                    <span className="shrink-0 text-[9px] text-muted-foreground uppercase tracking-[0.12em]">
                      {source.label}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {alert.detail}
                  </span>
                </span>
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/45 transition-transform group-hover/alert:translate-x-0.5 group-hover/alert:text-foreground" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid flex-1 place-items-center p-8 text-center">
          <div>
            <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
              <CheckCircle2 className="size-5" />
            </span>
            <p className="mt-3 font-semibold text-sm">Tout est sous contrôle</p>
            <p className="mt-1 max-w-60 text-muted-foreground text-xs leading-relaxed">
              Aucun rappel urgent, rupture ou suivi clinique arrivé à échéance.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-zinc-200/70 border-t px-5 py-3 dark:border-white/8">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <BellRing className="size-3.5" />
          Données actualisées en continu
        </span>
        {alerts.length > 5 ? (
          <Button
            onClick={() => onNavigate?.("taches")}
            size="xs"
            variant="ghost"
          >
            +{alerts.length - 5} autres
          </Button>
        ) : null}
      </div>
    </WidgetShell>
  );
}
