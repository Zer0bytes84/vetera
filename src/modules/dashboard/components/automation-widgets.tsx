import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  Info,
  Lightbulb,
  Mail,
  MailCheck,
  Play,
  Settings2,
  Sparkles,
  Timer,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  type AutomationItemLive,
  useAutomations,
} from "../hooks/useAutomations";
import { AutomationConfigDialog } from "./automation-config-dialog";

const iconMap: Record<string, any> = {
  Mail,
  Sparkles,
  Activity,
  MailCheck,
  Lightbulb,
  Timer,
};

const severityTone: Record<string, string> = {
  info: "text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/20",
  warn: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20",
  critical:
    "text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20",
};

const severityIcon: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  info: Info,
  warn: AlertTriangle,
  critical: AlertCircle,
};

function formatCompact(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function AutomationCard({
  item,
  onToggle,
  onRunNow,
  onConfigure,
  drilldownOpen,
  onToggleDrilldown,
  loadingDrilldown,
  drilldown,
  onPatientClick,
  t,
}: {
  item: AutomationItemLive;
  onToggle: (id: string, active: boolean) => void;
  onRunNow: (id: string) => void;
  onConfigure: (item: AutomationItemLive) => void;
  drilldownOpen: boolean;
  onToggleDrilldown: (id: string) => void;
  loadingDrilldown: boolean;
  drilldown: AutomationItemLive["drilldown"];
  onPatientClick: (patientId: string) => void;
  t: (key: string, opts?: any) => string;
}) {
  const Icon = iconMap[item.iconName] || Mail;
  const MetricIcon = iconMap[item.metricIconName] || Activity;
  const live = item.liveMetrics;
  const metricValue = live ? formatCompact(live.count) : "—";
  const trendUp = live ? live.trendUp : item.metricTrendUp;
  const trendLabel = live
    ? `${live.trendPercent >= 0 ? "+" : ""}${live.trendPercent}%`
    : item.metricTrend;
  const chartData =
    live && live.chartData.length > 0
      ? live.chartData
      : (item.chartData as number[] | Array<{ value: number }>);
  const isArea = item.chartType === "area";
  const chartPoints = isArea
    ? (chartData as number[]).map((v) => ({ value: v }))
    : (chartData as number[]);

  return (
    <Card className="dashboard-kpi-card group relative flex flex-col overflow-hidden border-0 p-0 shadow-sm">
      <div className="flex flex-col justify-between gap-6 p-6 transition-colors group-hover:bg-zinc-50/50 sm:flex-row sm:items-start dark:group-hover:bg-zinc-900/20">
        <div className="flex min-w-0 flex-1 gap-4">
          <div
            className={cn(
              "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm",
              item.iconColor
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <h3 className="font-semibold text-base text-foreground tracking-tight">
              {item.title}
            </h3>
            <p className="max-w-3xl text-muted-foreground text-sm leading-relaxed">
              {item.description}
            </p>
          </div>
        </div>
        <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2 sm:mt-0">
          <Button
            aria-label="Configurer"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onConfigure(item)}
            size="icon"
            variant="ghost"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button
            className="h-8 gap-1.5 text-xs"
            disabled={!item.active}
            onClick={() => onRunNow(item.id)}
            size="sm"
            variant="outline"
          >
            <Play className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t("dashboard.automations.runNow", "Exécuter")}
          </Button>
          <span className="font-medium text-muted-foreground text-sm">
            {item.active ? "Actif" : "Inactif"}
          </span>
          <Switch
            checked={item.active}
            onCheckedChange={(checked) => onToggle(item.id, checked)}
          />
        </div>
      </div>

      <div className="h-px w-full bg-zinc-950/5 dark:bg-white/5" />

      <div className="grid grid-cols-1 divide-y divide-zinc-950/5 bg-zinc-50/30 transition-colors group-hover:bg-zinc-50/80 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 dark:divide-white/5 dark:bg-zinc-900/10 dark:group-hover:bg-zinc-900/30">
        <div className="flex flex-col gap-3 p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 stroke-[2px]" />
            <span className="font-bold text-[10px] uppercase tracking-wider">
              Planification
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground text-sm">
              {item.schedule}
            </span>
            <span className="font-medium text-muted-foreground text-sm">
              {item.time}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 stroke-[2px]" />
            <span className="font-bold text-[10px] uppercase tracking-wider">
              Dernier passage
            </span>
          </div>
          <div className="flex flex-col items-start gap-1.5">
            <span className="font-semibold text-foreground text-sm">
              {item.lastRunDate || "—"}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-bold text-xs",
                item.lastRunStatus === "Completed"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : item.lastRunStatus === "Scheduled"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  item.lastRunStatus === "Completed"
                    ? "bg-emerald-600 dark:bg-emerald-400"
                    : item.lastRunStatus === "Scheduled"
                      ? "bg-blue-600 dark:bg-blue-400"
                      : "bg-zinc-500"
                )}
              />
              {item.lastRunStatus === "Completed"
                ? "Terminé"
                : item.lastRunStatus === "Scheduled"
                  ? "Programmé"
                  : "Arrêté"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <History className="h-4 w-4 stroke-[2px]" />
            <span className="font-bold text-[10px] uppercase tracking-wider">
              Prochain passage
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground text-sm">
              {item.nextRunDate || "—"}
            </span>
            {item.nextRunRelative && (
              <span className="font-medium text-muted-foreground text-sm">
                {item.nextRunRelative}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 p-6 lg:col-span-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MetricIcon className="h-4 w-4 stroke-[2px]" />
            <span className="font-bold text-[10px] uppercase tracking-wider">
              {item.metricLabel}
            </span>
          </div>
          <div className="mt-auto flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-extrabold text-2xl tabular-nums leading-none tracking-tight">
                {metricValue}
              </span>
              <span
                className={cn(
                  "flex items-center font-bold text-[10px] tracking-wider",
                  trendUp
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {trendUp ? (
                  <ArrowUpRight className="mr-0.5 h-3 w-3" />
                ) : (
                  <ArrowDownRight className="mr-0.5 h-3 w-3" />
                )}
                {trendLabel} vs période précédente
              </span>
            </div>
            <div className="mb-1 flex h-7 w-24 shrink-0 items-end justify-end">
              {isArea ? (
                <div className="relative h-full w-full">
                  <ResponsiveContainer
                    height="100%"
                    minHeight={0}
                    minWidth={0}
                    width="100%"
                  >
                    <AreaChart data={chartPoints as Array<{ value: number }>}>
                      <defs>
                        <linearGradient
                          id={`grad-${item.id}`}
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={item.chartColor}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor={item.chartColor}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <Area
                        dataKey="value"
                        fill={`url(#grad-${item.id})`}
                        isAnimationActive={true}
                        stroke={item.chartColor}
                        strokeWidth={2}
                        type="monotone"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-full w-full items-end gap-[2px]">
                  {(chartPoints as number[]).map((val, idx) => (
                    <div
                      className={cn(
                        "h-full flex-1 rounded-[1px] transition-colors duration-500",
                        val > 0
                          ? item.chartColor
                          : "bg-zinc-950/10 dark:bg-white/10"
                      )}
                      key={idx}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        className="flex w-full items-center justify-between gap-2 border-zinc-950/5 border-t bg-zinc-50/20 px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider transition-colors hover:bg-zinc-100/60 dark:border-white/5 dark:bg-zinc-900/5 dark:hover:bg-zinc-900/30"
        onClick={() => onToggleDrilldown(item.id)}
        type="button"
      >
        <span>
          {drilldown.length > 0
            ? `${drilldown.length} élément${drilldown.length > 1 ? "s" : ""} à traiter`
            : "Voir les patients concernés"}
        </span>
        {drilldownOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {drilldownOpen && (
        <div className="max-h-72 overflow-y-auto border-zinc-950/5 border-t bg-background/40 p-3 dark:border-white/5">
          {loadingDrilldown ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
              Chargement…
            </div>
          ) : drilldown.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
              Aucun élément à afficher pour cette automation.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
              {drilldown.map((row) => {
                const SevIcon = severityIcon[row.severity] ?? Info;
                return (
                  <li key={row.id}>
                    <button
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-zinc-100/60 dark:hover:bg-zinc-900/40"
                      onClick={() => onPatientClick(row.patientId)}
                      type="button"
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg border",
                          severityTone[row.severity]
                        )}
                      >
                        <SevIcon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground text-sm">
                          {row.patientName}
                          {row.species ? (
                            <span className="font-normal text-muted-foreground">
                              {" "}
                              · {row.species}
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-muted-foreground text-xs">
                          {row.contextLabel}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
                        {row.contextDate.slice(0, 10)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

export function AutomationWidgets({
  onPatientClick,
}: {
  onPatientClick?: (patientId: string) => void;
}) {
  const {
    automations,
    isLoading,
    updateAutomation,
    toggleAutomation,
    runNow,
    loadDrilldown,
  } = useAutomations();
  const { t } = useTranslation();
  const [editingAutomation, setEditingAutomation] =
    useState<AutomationItemLive | null>(null);
  const [openDrilldown, setOpenDrilldown] = useState<Record<string, boolean>>(
    {}
  );

  const handleToggleDrilldown = (id: string) => {
    const willOpen = !openDrilldown[id];
    setOpenDrilldown((prev) => ({ ...prev, [id]: willOpen }));
    if (willOpen) {
      const target = automations.find((a) => a.id === id);
      if (target && target.drilldown.length === 0 && !target.loadingDrilldown) {
        void loadDrilldown(id);
      }
    }
  };

  const handlePatientClick = (patientId: string) => {
    onPatientClick?.(patientId);
  };

  if (isLoading) {
    return (
      <div className="mt-6 flex w-full flex-col gap-6">
        <div className="flex flex-col gap-1 px-2">
          <h3 className="font-display font-semibold text-foreground text-xl tracking-tight">
            {t("dashboard.automations.title", "Automatisations Actives")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t(
              "dashboard.automations.subtitle",
              "Règles métier en arrière-plan."
            )}
          </p>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              className="h-32 animate-pulse rounded-2xl bg-zinc-100/60 dark:bg-zinc-900/40"
              key={idx}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1 px-2">
        <h3 className="font-display font-semibold text-foreground text-xl tracking-tight">
          {t("dashboard.automations.title", "Automatisations Actives")}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t(
            "dashboard.automations.subtitle",
            "Règles métier en arrière-plan — compteurs calculés depuis vos données."
          )}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {automations.map((item) => (
          <AutomationCard
            drilldown={item.drilldown}
            drilldownOpen={!!openDrilldown[item.id]}
            item={item}
            key={item.id}
            loadingDrilldown={item.loadingDrilldown}
            onConfigure={setEditingAutomation}
            onPatientClick={handlePatientClick}
            onRunNow={runNow}
            onToggle={toggleAutomation}
            onToggleDrilldown={handleToggleDrilldown}
            t={t}
          />
        ))}
      </div>

      <AutomationConfigDialog
        automation={editingAutomation}
        isOpen={!!editingAutomation}
        onClose={() => setEditingAutomation(null)}
        onSave={updateAutomation}
      />
    </div>
  );
}
