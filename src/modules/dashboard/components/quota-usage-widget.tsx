import {
  Activity,
  Database,
  HardDrive,
  type LucideIcon,
  Server,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface QuotaItem {
  color?: "blue" | "emerald" | "slate";
  icon: LucideIcon;
  label: string;
  total: number;
  unit?: string;
  used: number;
}

const barColorMap: Record<string, { track: string; fill: string }> = {
  blue: {
    track: "bg-primary/10",
    fill: "bg-primary",
  },
  emerald: {
    track: "bg-emerald-500/10 dark:bg-emerald-400/10",
    fill: "bg-emerald-500 dark:bg-emerald-400",
  },
  slate: {
    track: "bg-slate-500/10 dark:bg-slate-400/10",
    fill: "bg-slate-500 dark:bg-slate-400",
  },
};

const defaultQuotas: QuotaItem[] = [
  {
    icon: Users,
    label: "Patients actifs",
    used: 847,
    total: 1000,
    color: "blue",
  },
  {
    icon: Database,
    label: "Stockage DPI",
    used: 3.2,
    total: 10,
    unit: "GB",
    color: "slate",
  },
  {
    icon: Activity,
    label: "API mensuelle",
    used: 12_450,
    total: 50_000,
    color: "emerald",
  },
  {
    icon: HardDrive,
    label: "Espace fichiers",
    used: 1.8,
    total: 5,
    unit: "GB",
    color: "slate",
  },
  {
    icon: Server,
    label: "Sessions actives",
    used: 3,
    total: 10,
    color: "slate",
  },
];

function formatQuotaValue(value: number, unit?: string): string {
  if (unit) {
    return `${value} ${unit}`;
  }
  if (value >= 1000) {
    return new Intl.NumberFormat("fr-FR").format(value);
  }
  return String(value);
}

function getPercentage(used: number, total: number): number {
  return Math.min(Math.round((used / total) * 100), 100);
}

export function QuotaUsageWidget({
  quotas = defaultQuotas,
  title = "Utilisation",
}: {
  quotas?: QuotaItem[];
  title?: string;
}) {
  return (
    <Card className="dashboard-luxe-card @container">
      <CardHeader className="pb-3">
        <CardTitle className="font-semibold text-base">{title}</CardTitle>
        <CardDescription>Ressources et capacité</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {quotas.map((quota) => {
          const Icon = quota.icon;
          const pct = getPercentage(quota.used, quota.total);
          const colors = barColorMap[quota.color ?? "slate"];
          const isHigh = pct >= 85;
          return (
            <div key={quota.label}>
              <div className="mb-1 flex items-center gap-2.5">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-md ${colors.track}`}
                >
                  <Icon className="size-3 text-foreground/70" />
                </span>
                <span className="min-w-0 flex-1 text-foreground text-sm">
                  {quota.label}
                </span>
                <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                  {formatQuotaValue(quota.used, quota.unit)}
                  {" / "}
                  {formatQuotaValue(quota.total, quota.unit)}
                </span>
              </div>
              <div className={`h-1 rounded-full ${colors.track}`}>
                <div
                  className={`h-full rounded-full transition-all duration-700 ${isHigh ? "bg-destructive" : colors.fill}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
