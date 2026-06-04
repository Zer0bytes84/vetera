import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  Mail,
  Calendar,
  Clock,
  History,
  MailCheck,
  Lightbulb,
  Activity,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Settings2,
  ChevronDown,
  ChevronUp,
  Play,
  AlertCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutomations, type AutomationItemLive } from "../hooks/useAutomations";
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
  critical: "text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20",
};

const severityIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  info: Info,
  warn: AlertTriangle,
  critical: AlertCircle,
};

function formatCompact(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function AutomationCard({ item, onToggle, onRunNow, onConfigure, drilldownOpen, onToggleDrilldown, loadingDrilldown, drilldown, onPatientClick, t }: {
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
    <Card className="dashboard-kpi-card relative overflow-hidden flex flex-col p-0 shadow-sm border-0 group">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between p-6 gap-6 transition-colors group-hover:bg-zinc-50/50 dark:group-hover:bg-zinc-900/20">
        <div className="flex gap-4 min-w-0 flex-1">
          <div
            className={cn(
              "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm",
              item.iconColor
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              {item.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
              {item.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-2 sm:mt-0 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onConfigure(item)}
            aria-label="Configurer"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => onRunNow(item.id)}
            disabled={!item.active}
          >
            <Play className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t("dashboard.automations.runNow", "Exécuter")}
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            {item.active ? "Actif" : "Inactif"}
          </span>
          <Switch
            checked={item.active}
            onCheckedChange={(checked) => onToggle(item.id, checked)}
          />
        </div>
      </div>

      <div className="w-full h-px bg-zinc-950/5 dark:bg-white/5" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-950/5 dark:divide-white/5 bg-zinc-50/30 dark:bg-zinc-900/10 transition-colors group-hover:bg-zinc-50/80 dark:group-hover:bg-zinc-900/30">
        <div className="flex flex-col p-6 gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 stroke-[2px]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Planification
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">{item.schedule}</span>
            <span className="text-sm font-medium text-muted-foreground">{item.time}</span>
          </div>
        </div>

        <div className="flex flex-col p-6 gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 stroke-[2px]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Dernier passage
            </span>
          </div>
          <div className="flex flex-col gap-1.5 items-start">
            <span className="text-sm font-semibold text-foreground">
              {item.lastRunDate || "—"}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold",
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

        <div className="flex flex-col p-6 gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <History className="h-4 w-4 stroke-[2px]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Prochain passage
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {item.nextRunDate || "—"}
            </span>
            {item.nextRunRelative && (
              <span className="text-sm font-medium text-muted-foreground">
                {item.nextRunRelative}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col p-6 gap-3 lg:col-span-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MetricIcon className="h-4 w-4 stroke-[2px]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {item.metricLabel}
            </span>
          </div>
          <div className="flex items-end justify-between gap-4 mt-auto">
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-extrabold tracking-tight tabular-nums leading-none">
                {metricValue}
              </span>
              <span
                className={cn(
                  "flex items-center text-[10px] font-bold tracking-wider",
                  trendUp
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {trendUp ? (
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-0.5" />
                )}
                {trendLabel} vs période précédente
              </span>
            </div>
            <div className="h-7 w-24 flex items-end justify-end shrink-0 mb-1">
              {isArea ? (
                <div className="h-full w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartPoints as Array<{ value: number }>}>
                      <defs>
                        <linearGradient
                          id={`grad-${item.id}`}
                          x1="0"
                          y1="0"
                          x2="0"
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
                        type="monotone"
                        dataKey="value"
                        stroke={item.chartColor}
                        strokeWidth={2}
                        fill={`url(#grad-${item.id})`}
                        isAnimationActive={true}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-end gap-[2px] h-full w-full">
                  {(chartPoints as number[]).map((val, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex-1 h-full rounded-[1px] transition-colors duration-500",
                        val > 0 ? item.chartColor : "bg-zinc-950/10 dark:bg-white/10"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onToggleDrilldown(item.id)}
        className="flex items-center justify-between gap-2 w-full px-6 py-3 border-t border-zinc-950/5 dark:border-white/5 bg-zinc-50/20 dark:bg-zinc-900/5 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/30 transition-colors text-xs font-bold uppercase tracking-wider text-muted-foreground"
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
        <div className="border-t border-zinc-950/5 dark:border-white/5 bg-background/40 p-3 max-h-72 overflow-y-auto">
          {loadingDrilldown ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              Chargement…
            </div>
          ) : drilldown.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              Aucun élément à afficher pour cette automation.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
              {drilldown.map((row) => {
                const SevIcon = severityIcon[row.severity] ?? Info;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onPatientClick(row.patientId)}
                      className="w-full text-left flex items-center gap-3 py-2.5 px-2 rounded-md hover:bg-zinc-100/60 dark:hover:bg-zinc-900/40 transition-colors"
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
                        <p className="text-sm font-semibold text-foreground truncate">
                          {row.patientName}
                          {row.species ? (
                            <span className="text-muted-foreground font-normal">
                              {" "}· {row.species}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {row.contextLabel}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0">
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

export function AutomationWidgets({ onPatientClick }: { onPatientClick?: (patientId: string) => void }) {
  const { automations, isLoading, updateAutomation, toggleAutomation, runNow, loadDrilldown } =
    useAutomations();
  const { t } = useTranslation();
  const [editingAutomation, setEditingAutomation] = useState<AutomationItemLive | null>(null);
  const [openDrilldown, setOpenDrilldown] = useState<Record<string, boolean>>({});

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
      <div className="flex flex-col gap-6 w-full mt-6">
        <div className="flex flex-col gap-1 px-2">
          <h3 className="text-xl font-display font-semibold tracking-tight text-foreground">
            {t("dashboard.automations.title", "Automatisations Actives")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.automations.subtitle", "Règles métier en arrière-plan.")}
          </p>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-32 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900/40 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full mt-6">
      <div className="flex flex-col gap-1 px-2">
        <h3 className="text-xl font-display font-semibold tracking-tight text-foreground">
          {t("dashboard.automations.title", "Automatisations Actives")}
        </h3>
        <p className="text-sm text-muted-foreground">
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
