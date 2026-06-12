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
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  if (h < 1) {
    return "< 1h";
  }
  if (h < 24) {
    return `${Math.round(h)}h`;
  }
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
    <Card className="@container/card group relative h-full overflow-hidden border-zinc-200/50 bg-white/40 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md dark:border-zinc-800/50 dark:bg-zinc-950/40">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/5 via-transparent to-transparent" />
      </div>

      <CardHeader className="relative z-10 border-border/40 border-b pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Stethoscope className="size-4" weight="duotone" />
            </div>
            <div>
              <CardTitle className="font-semibold text-sm tracking-tight">
                {t("dashboard.consultations.title", "Résumé des Consultations")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t(
                  "dashboard.consultations.subtitle",
                  "7 derniers jours · SOAPs générés et insights"
                )}
              </CardDescription>
            </div>
          </div>
          {summary && (
            <Badge
              className={cn(
                "bg-background/50 text-[10px] tabular-nums backdrop-blur-sm",
                trendUp
                  ? "border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/20 text-amber-600 dark:text-amber-400"
              )}
              variant="outline"
            >
              {trendUp ? (
                <ArrowUpRight className="mr-0.5 size-3" weight="bold" />
              ) : (
                <ArrowDownRight className="mr-0.5 size-3" weight="bold" />
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
                className="h-20 animate-pulse rounded-xl bg-zinc-100/50 dark:bg-zinc-900/50"
                key={i}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KpiTile
                icon={<FileText className="size-3.5" weight="duotone" />}
                label={t("dashboard.consultations.soapsCreated", "SOAPs créés")}
                tone="sky"
                value={formatCompact(summary.total7d)}
              />
              <KpiTile
                icon={<CheckCircle className="size-3.5" weight="duotone" />}
                label={t("dashboard.consultations.completed", "Complétés")}
                tone="emerald"
                value={`${summary.completed7d} (${completionRate}%)`}
              />
              <KpiTile
                icon={<Sparkle className="size-3.5" weight="duotone" />}
                label={t("dashboard.consultations.aiGenerated", "IA assistée")}
                subValue={
                  summary.avgAiConfidence > 0
                    ? `confiance ${Math.round(summary.avgAiConfidence * 100)}%`
                    : undefined
                }
                tone="violet"
                value={formatCompact(summary.aiGenerated)}
              />
              <KpiTile
                icon={<Clock className="size-3.5" weight="duotone" />}
                label={t(
                  "dashboard.consultations.avgCompletion",
                  "Délai moyen"
                )}
                tone="amber"
                value={formatHours(summary.avgCompletionHours)}
                warning={summary.backlog > 0}
                warningLabel={`${summary.backlog} en attente`}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-5">
              <div className="rounded-xl border border-zinc-200/50 bg-background/40 p-3 md:col-span-3 dark:border-zinc-800/50">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                    {t(
                      "dashboard.consultations.dailySeries",
                      "Activité 7 jours"
                    )}
                  </p>
                  <span className="font-mono text-[10px] text-muted-foreground/60">
                    {formatCompact(
                      summary.dailySeries.reduce((a, b) => a + b, 0)
                    )}{" "}
                    SOAPs
                  </span>
                </div>
                <div className="h-32">
                  <ResponsiveContainer
                    height="100%"
                    minHeight={0}
                    minWidth={0}
                    width="100%"
                  >
                    <AreaChart
                      data={dailyChartData}
                      margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="soapGrad"
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#0ea5e9"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="100%"
                            stopColor="#0ea5e9"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="currentColor"
                        strokeOpacity={0.05}
                        vertical={false}
                      />
                      <XAxis
                        axisLine={false}
                        dataKey="label"
                        fontSize={9}
                        stroke="currentColor"
                        strokeOpacity={0.4}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        axisLine={false}
                        fontSize={9}
                        stroke="currentColor"
                        strokeOpacity={0.4}
                        tickLine={false}
                        width={20}
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

              <div className="rounded-xl border border-zinc-200/50 bg-background/40 p-3 md:col-span-2 dark:border-zinc-800/50">
                <p className="mb-2 font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  {t(
                    "dashboard.consultations.typeBreakdown",
                    "Répartition par type"
                  )}
                </p>
                {summary.typeBreakdown.length === 0 ? (
                  <div className="flex h-32 items-center justify-center text-muted-foreground text-xs">
                    {t("dashboard.consultations.noData", "Aucun SOAP sur 7j")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {summary.typeBreakdown.map((t) => {
                      const total = summary.typeBreakdown.reduce(
                        (a, b) => a + b.count,
                        0
                      );
                      const pct =
                        total > 0 ? Math.round((t.count / total) * 100) : 0;
                      return (
                        <div className="flex items-center gap-2" key={t.type}>
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              TYPE_COLORS[t.type] ?? TYPE_COLORS.Autre
                            )}
                          />
                          <span className="flex-1 truncate font-medium text-xs">
                            {TYPE_LABELS[t.type] ?? t.type}
                          </span>
                          <span className="font-bold text-foreground/80 text-xs tabular-nums">
                            {t.count}
                          </span>
                          <span className="w-8 text-right font-mono text-[10px] text-muted-foreground/60">
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
              <div className="rounded-xl border border-zinc-200/50 bg-background/40 p-3 dark:border-zinc-800/50">
                <p className="mb-2 flex items-center gap-1.5 font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  <Brain className="size-3 text-violet-500" weight="duotone" />
                  {t(
                    "dashboard.consultations.topDiagnostics",
                    "Top diagnostics (7j)"
                  )}
                </p>
                {summary.topDiagnostics.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">
                    {t(
                      "dashboard.consultations.noDiagnostics",
                      "Aucun diagnostic enregistré."
                    )}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {summary.topDiagnostics.map((d, idx) => (
                      <li
                        className="flex items-center gap-2 text-xs"
                        key={`${d.label}-${idx}`}
                      >
                        <span className="w-4 font-mono text-[10px] text-muted-foreground/60">
                          {idx + 1}.
                        </span>
                        <span className="flex-1 truncate text-foreground/90">
                          {d.label}
                        </span>
                        <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 font-bold text-[10px] text-violet-600 tabular-nums dark:text-violet-400">
                          ×{d.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200/50 bg-background/40 p-3 dark:border-zinc-800/50">
                <p className="mb-2 flex items-center gap-1.5 font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  <WarningCircle
                    className={cn(
                      "size-3",
                      summary.backlog > 0
                        ? "text-amber-500"
                        : "text-emerald-500"
                    )}
                    weight="duotone"
                  />
                  {t("dashboard.consultations.backlog", "Backlog à compléter")}
                </p>
                {backlogRows.length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-600 text-xs dark:text-emerald-400">
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
                          className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-amber-500/10"
                          onClick={() => onPatientClick?.(row.patientId)}
                          type="button"
                        >
                          <span className="flex-1 truncate font-semibold text-foreground/90">
                            {row.patientName}
                            {row.species ? (
                              <span className="ml-1 font-normal text-muted-foreground">
                                · {row.species}
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 font-mono text-[10px] text-amber-600 dark:text-amber-400">
                            {row.filledSections}/4 · {row.hoursIdle}h
                          </span>
                        </button>
                      </li>
                    ))}
                    {summary.backlog > backlogRows.length && (
                      <li className="pt-1">
                        <Button
                          className="h-7 w-full text-xs"
                          onClick={onOpenClinique}
                          size="sm"
                          variant="ghost"
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
    <div className="rounded-xl border border-zinc-200/50 bg-background/40 p-3 transition-colors hover:border-zinc-300/60 dark:border-zinc-800/50 dark:hover:border-zinc-700/60">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-md",
            toneClass[tone]
          )}
        >
          {icon}
        </span>
        <span className="truncate font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="font-bold text-foreground/90 text-xl tabular-nums tracking-tighter">
        {value}
      </p>
      {subValue && (
        <p className="mt-0.5 font-medium text-[10px] text-muted-foreground">
          {subValue}
        </p>
      )}
      {warning && warningLabel && (
        <p className="mt-0.5 flex items-center gap-1 font-bold text-[10px] text-amber-600 dark:text-amber-400">
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
