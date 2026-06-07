import { useTranslation } from "react-i18next";
import {
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  CheckCircle,
  Clock,
  FileText,
  Sparkle,
  Stethoscope,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { useConsultationSummary } from "../hooks/useConsultationSummary";

const TYPE_COLORS: Record<string, string> = {
  Consultation: "bg-sky-500",
  Vaccin: "bg-emerald-500",
  Chirurgie: "bg-violet-500",
  Urgence: "bg-rose-500",
  Contrôle: "bg-amber-500",
  Autre: "bg-zinc-500",
};

const TYPE_LABELS: Record<string, string> = {
  Consultation: "Consultations",
  Vaccin: "Vaccins",
  Chirurgie: "Chirurgies",
  Urgence: "Urgences",
  Contrôle: "Contrôles",
  Autre: "Autres",
};

function formatCompact(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function formatHours(h: number): string {
  if (h < 1) return "< 1h";
  if (h < 24) return `${Math.round(h)}h`;
  const days = Math.floor(h / 24);
  const hours = Math.round(h % 24);
  return `${days}j ${hours}h`;
}

export function ConsultationSummaryWidget({
  onPatientClick,
  onOpenClinique,
}: {
  onPatientClick?: (patientId: string) => void;
  onOpenClinique?: () => void;
}) {
  const { t } = useTranslation();
  const {
    summary,
    backlogRows,
    trendPercent,
    trendUp,
    completionRate,
    isLoading,
  } = useConsultationSummary();

  const dailyChartData = summary
    ? summary.dailySeries.map((v, idx) => ({
        day: idx,
        label: ilabel(idx),
        value: v,
      }))
    : [];

  return (
    <Card className="@container/card h-full relative overflow-hidden group border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-overlay">
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/5 via-transparent to-transparent" />
      </div>

      <CardHeader className="relative z-10 pb-4 border-b border-border/40">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Stethoscope className="size-4" weight="duotone" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                {t("dashboard.consultations.title", "Résumé des Consultations")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("dashboard.consultations.subtitle", "7 derniers jours · SOAPs générés et insights")}
              </CardDescription>
            </div>
          </div>
          {summary && (
            <Badge
              className={cn(
                "text-[10px] bg-background/50 backdrop-blur-sm tabular-nums",
                trendUp
                  ? "border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/20 text-amber-600 dark:text-amber-400"
              )}
              variant="outline"
            >
              {trendUp ? (
                <ArrowUpRight className="size-3 mr-0.5" weight="bold" />
              ) : (
                <ArrowDownRight className="size-3 mr-0.5" weight="bold" />
              )}
              {trendPercent >= 0 ? "+" : ""}
              {trendPercent}% vs 7j précédents
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 pt-4">
        {isLoading || !summary ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/50 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KpiTile
                icon={<FileText className="size-3.5" weight="duotone" />}
                label={t("dashboard.consultations.soapsCreated", "SOAPs créés")}
                value={formatCompact(summary.total7d)}
                tone="sky"
              />
              <KpiTile
                icon={<CheckCircle className="size-3.5" weight="duotone" />}
                label={t("dashboard.consultations.completed", "Complétés")}
                value={`${summary.completed7d} (${completionRate}%)`}
                tone="emerald"
              />
              <KpiTile
                icon={<Sparkle className="size-3.5" weight="duotone" />}
                label={t("dashboard.consultations.aiGenerated", "IA assistée")}
                value={formatCompact(summary.aiGenerated)}
                subValue={
                  summary.avgAiConfidence > 0
                    ? `confiance ${Math.round(summary.avgAiConfidence * 100)}%`
                    : undefined
                }
                tone="violet"
              />
              <KpiTile
                icon={<Clock className="size-3.5" weight="duotone" />}
                label={t("dashboard.consultations.avgCompletion", "Délai moyen")}
                value={formatHours(summary.avgCompletionHours)}
                tone="amber"
                warning={summary.backlog > 0}
                warningLabel={`${summary.backlog} en attente`}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-5">
              <div className="md:col-span-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-background/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("dashboard.consultations.dailySeries", "Activité 7 jours")}
                  </p>
                  <span className="text-[10px] font-mono text-muted-foreground/60">
                    {formatCompact(summary.dailySeries.reduce((a, b) => a + b, 0))} SOAPs
                  </span>
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart
                      data={dailyChartData}
                      margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="soapGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                      <XAxis
                        axisLine={false}
                        dataKey="label"
                        fontSize={9}
                        stroke="currentColor"
                        strokeOpacity={0.4}
                        tickLine={false}
                      />
                      <YAxis
                        axisLine={false}
                        fontSize={9}
                        stroke="currentColor"
                        strokeOpacity={0.4}
                        tickLine={false}
                        width={20}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(0,0,0,0.85)",
                          border: "none",
                          borderRadius: 8,
                          color: "white",
                          fontSize: 11,
                        }}
                        labelStyle={{ color: "white", fontWeight: 600 }}
                      />
                      <Area
                        dataKey="value"
                        fill="url(#soapGrad)"
                        isAnimationActive={true}
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        type="monotone"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="md:col-span-2 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-background/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("dashboard.consultations.typeBreakdown", "Répartition par type")}
                </p>
                {summary.typeBreakdown.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                    {t("dashboard.consultations.noData", "Aucun SOAP sur 7j")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {summary.typeBreakdown.map((t) => {
                      const total = summary.typeBreakdown.reduce(
                        (a, b) => a + b.count,
                        0
                      );
                      const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                      return (
                        <div key={t.type} className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full shrink-0",
                              TYPE_COLORS[t.type] ?? TYPE_COLORS.Autre
                            )}
                          />
                          <span className="text-xs font-medium flex-1 truncate">
                            {TYPE_LABELS[t.type] ?? t.type}
                          </span>
                          <span className="text-xs font-bold tabular-nums text-foreground/80">
                            {t.count}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground/60 w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-background/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Brain className="size-3 text-violet-500" weight="duotone" />
                  {t("dashboard.consultations.topDiagnostics", "Top diagnostics (7j)")}
                </p>
                {summary.topDiagnostics.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    {t("dashboard.consultations.noDiagnostics", "Aucun diagnostic enregistré.")}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {summary.topDiagnostics.map((d, idx) => (
                      <li
                        key={`${d.label}-${idx}`}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="font-mono text-[10px] text-muted-foreground/60 w-4">
                          {idx + 1}.
                        </span>
                        <span className="flex-1 truncate text-foreground/90">{d.label}</span>
                        <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
                          ×{d.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-background/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <WarningCircle
                    className={cn(
                      "size-3",
                      summary.backlog > 0 ? "text-amber-500" : "text-emerald-500"
                    )}
                    weight="duotone"
                  />
                  {t("dashboard.consultations.backlog", "Backlog à compléter")}
                </p>
                {backlogRows.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="size-3.5" weight="duotone" />
                    {t(
                      "dashboard.consultations.backlogEmpty",
                      "Tous les SOAPs sont à jour."
                    )}
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {backlogRows.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => onPatientClick?.(row.patientId)}
                          className="w-full text-left flex items-center gap-2 text-xs rounded-md px-1.5 py-1 hover:bg-amber-500/10 transition-colors"
                        >
                          <span className="font-semibold truncate flex-1 text-foreground/90">
                            {row.patientName}
                            {row.species ? (
                              <span className="text-muted-foreground font-normal ml-1">
                                · {row.species}
                              </span>
                            ) : null}
                          </span>
                          <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 shrink-0">
                            {row.filledSections}/4 · {row.hoursIdle}h
                          </span>
                        </button>
                      </li>
                    ))}
                    {summary.backlog > backlogRows.length && (
                      <li className="pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-7 text-xs"
                          onClick={onOpenClinique}
                        >
                          + {summary.backlog - backlogRows.length} autre(s) →
                        </Button>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function KpiTile({
  icon,
  label,
  value,
  subValue,
  tone,
  warning,
  warningLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  tone: "sky" | "emerald" | "violet" | "amber";
  warning?: boolean;
  warningLabel?: string;
}) {
  const toneClass: Record<string, string> = {
    sky: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    violet: "text-violet-600 dark:text-violet-400 bg-violet-500/10",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  };
  return (
    <div className="rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-background/40 p-3 transition-colors hover:border-zinc-300/60 dark:hover:border-zinc-700/60">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-md",
            toneClass[tone]
          )}
        >
          {icon}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold tabular-nums tracking-tighter text-foreground/90">
        {value}
      </p>
      {subValue && (
        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{subValue}</p>
      )}
      {warning && warningLabel && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-bold flex items-center gap-1">
          <Warning className="size-2.5" weight="duotone" />
          {warningLabel}
        </p>
      )}
    </div>
  );
}

function ilabel(idx: number): string {
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  // On centre sur aujourd'hui : idx 0 = il y a 6 jours
  const today = new Date().getDay();
  // En JS : 0=dim, 1=lun, ..., 6=sam
  const dayIdx = (today - 6 + idx + 7) % 7;
  return days[dayIdx];
}
