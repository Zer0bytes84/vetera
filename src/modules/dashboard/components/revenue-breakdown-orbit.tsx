"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CategoryRevenue {
  color: string;
  label: string;
  value: number;
}

interface RevenueBreakdownOrbitProps {
  categories: CategoryRevenue[];
  title?: string;
}

interface NormalizedCategory extends CategoryRevenue {
  dash: number;
  offset: number;
  percent: number;
}

function formatDA(value: number): string {
  if (value >= 100_000) {
    return (value / 1000).toFixed(0) + "k";
  }
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

export function RevenueBreakdownOrbit({
  categories,
  title = "Répartition des revenus",
}: RevenueBreakdownOrbitProps) {
  const total = categories.reduce((sum, c) => sum + c.value, 0) || 1;

  const normalized: NormalizedCategory[] = [];
  let currentOffset = 0;
  for (const category of categories) {
    const percent = Math.round((category.value / total) * 100);
    const dash = Math.max(percent, 7);
    normalized.push({ ...category, percent, dash, offset: currentOffset });
    currentOffset += dash + 4;
  }

  return (
    <Card className="dashboard-luxe-card overflow-hidden rounded-[26px] bg-card shadow-none">
      <CardHeader className="border-border/50 border-b px-6 py-5">
        <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
          Revenus
        </CardDescription>
        <CardTitle className="font-semibold text-[22px] tracking-[-0.045em]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid gap-6 md:grid-cols-[1fr_160px] md:items-center">
          <div className="relative mx-auto aspect-square w-full max-w-[200px]">
            <svg aria-hidden="true" className="size-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                fill="none"
                r="40"
                stroke="var(--muted)"
                strokeWidth="12"
              />
              {normalized.map((row) => (
                <circle
                  className="transition-all duration-300 hover:stroke-[14] hover:opacity-80"
                  cx="50"
                  cy="50"
                  fill="none"
                  key={row.label}
                  r="40"
                  stroke={row.color}
                  strokeDasharray={`${row.dash} ${100 - row.dash}`}
                  strokeDashoffset={-row.offset}
                  strokeLinecap="butt"
                  strokeWidth="12"
                  style={{
                    transformOrigin: "center",
                    transition: "stroke-width 0.2s",
                  }}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-semibold text-foreground text-lg tabular-nums leading-none tracking-[-0.04em]">
                {formatDA(total)} DA
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">total</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {normalized.map((row) => (
              <div
                className="dashboard-soft-panel flex items-center justify-between gap-2 rounded-xl px-3 py-2 transition-colors hover:bg-secondary"
                key={row.label}
              >
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full ring-1 ring-black/5 ring-offset-1"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="truncate text-muted-foreground">
                    {row.label}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {formatDA(row.value)} DA
                  </span>
                  <span className="font-semibold text-foreground text-xs tabular-nums">
                    {row.percent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
