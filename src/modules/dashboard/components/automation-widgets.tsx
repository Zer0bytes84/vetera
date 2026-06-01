import React, { useState } from "react";
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
  Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutomations, type AutomationItem } from "../hooks/useAutomations";
import { AutomationConfigDialog } from "./automation-config-dialog";

const iconMap: Record<string, any> = {
  Mail,
  Sparkles,
  Activity,
  MailCheck,
  Lightbulb,
  Timer
};

export function AutomationWidgets() {
  const { automations, updateAutomation, toggleAutomation } = useAutomations();
  const [editingAutomation, setEditingAutomation] = useState<AutomationItem | null>(null);

  return (
    <div className="flex flex-col gap-6 w-full mt-6">
      <div className="flex flex-col gap-1 px-2">
        <h3 className="text-xl font-display font-semibold tracking-tight text-foreground">
          Automatisations Actives
        </h3>
        <p className="text-sm text-muted-foreground">
          Gérez vos flux de travail automatisés et processus en arrière-plan.
        </p>
      </div>
      
      <div className="flex flex-col gap-4">
        {automations.map((item) => {
          const Icon = iconMap[item.iconName] || Mail;
          const MetricIcon = iconMap[item.metricIconName] || Activity;

          return (
            <Card key={item.id} className="dashboard-kpi-card relative overflow-hidden flex flex-col p-0 shadow-sm border-0 group">
              {/* Top section */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between p-6 gap-6 transition-colors group-hover:bg-zinc-50/50 dark:group-hover:bg-zinc-900/20">
                <div className="flex gap-4">
                  <div className={cn("mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm", item.iconColor)}>
                    <Icon className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-base font-semibold text-foreground tracking-tight">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 mt-2 sm:mt-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingAutomation(item)}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground">
                    {item.active ? "Actif" : "Inactif"}
                  </span>
                  <Switch 
                    checked={item.active} 
                    onCheckedChange={(checked) => toggleAutomation(item.id, checked)}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-zinc-950/5 dark:bg-white/5" />

              {/* Bottom section grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-950/5 dark:divide-white/5 bg-zinc-50/30 dark:bg-zinc-900/10 transition-colors group-hover:bg-zinc-50/80 dark:group-hover:bg-zinc-900/30">
                
                {/* Schedule */}
                <div className="flex flex-col p-6 gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 stroke-[2px]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Planification</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{item.schedule}</span>
                    <span className="text-sm font-medium text-muted-foreground">{item.time}</span>
                  </div>
                </div>

                {/* Last Run */}
                <div className="flex flex-col p-6 gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 stroke-[2px]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Dernier passage</span>
                  </div>
                  <div className="flex flex-col gap-1.5 items-start">
                    <span className="text-sm font-semibold text-foreground">{item.lastRunDate}</span>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold",
                      item.lastRunStatus === "Completed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                      item.lastRunStatus === "Scheduled" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                      "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full",
                        item.lastRunStatus === "Completed" ? "bg-emerald-600 dark:bg-emerald-400" :
                        item.lastRunStatus === "Scheduled" ? "bg-blue-600 dark:bg-blue-400" :
                        "bg-rose-600 dark:bg-rose-400"
                      )} />
                      {item.lastRunStatus === "Completed" ? "Terminé" : item.lastRunStatus === "Scheduled" ? "Programmé" : "Arrêté"}
                    </span>
                  </div>
                </div>

                {/* Next Run */}
                <div className="flex flex-col p-6 gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <History className="h-4 w-4 stroke-[2px]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Prochain passage</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{item.nextRunDate || "-"}</span>
                    {item.nextRunRelative && (
                      <span className="text-sm font-medium text-muted-foreground">{item.nextRunRelative}</span>
                    )}
                  </div>
                </div>

                {/* Metric & Chart */}
                <div className="flex flex-col p-6 gap-3 lg:col-span-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MetricIcon className="h-4 w-4 stroke-[2px]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.metricLabel}</span>
                  </div>
                  <div className="flex items-end justify-between gap-4 mt-auto">
                    <div className="flex flex-col gap-1">
                      <span className="text-2xl font-extrabold tracking-tight tabular-nums leading-none">
                        {item.metricValue}
                      </span>
                      <span className={cn("flex items-center text-[10px] font-bold tracking-wider",
                        item.metricTrendUp ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                      )}>
                        {item.metricTrendUp ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                        {item.metricTrend} sur 5 runs
                      </span>
                    </div>
                    
                    {/* Mini Chart */}
                    <div className="h-7 w-24 flex items-end justify-end shrink-0 mb-1">
                      {item.chartType === "discrete" ? (
                        <div className="flex items-end gap-[2px] h-full w-full">
                          {(item.chartData as number[]).map((val, idx) => (
                            <div 
                              key={idx} 
                              className={cn("flex-1 h-full rounded-[1px] transition-colors duration-500", val === 1 ? item.chartColor : "bg-zinc-950/10 dark:bg-white/10")} 
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="h-full w-full relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={item.chartData as Array<{value: number}>}>
                              <defs>
                                <linearGradient id={`grad-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={item.chartColor} stopOpacity={0.3} />
                                  <stop offset="100%" stopColor={item.chartColor} stopOpacity={0} />
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
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </Card>
          );
        })}
      </div>

      <AutomationConfigDialog 
        isOpen={!!editingAutomation}
        automation={editingAutomation}
        onClose={() => setEditingAutomation(null)}
        onSave={updateAutomation}
      />
    </div>
  );
}
