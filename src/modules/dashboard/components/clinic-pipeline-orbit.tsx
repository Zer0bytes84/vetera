"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PipelineRow {
  color: string;
  label: string;
  ratio: number;
  value: number;
}

interface ClinicPipelineOrbitProps {
  rows: PipelineRow[];
  title?: string;
}

const pipelineIcons: Record<string, string> = {
  Nouveau: "📋",
  "En cours": "🩺",
  Terminé: "✅",
  Absent: "🚫",
};

function getIcon(label: string): string {
  for (const [key, emoji] of Object.entries(pipelineIcons)) {
    if (label.toLowerCase().includes(key.toLowerCase())) {
      return emoji;
    }
  }
  return "📌";
}

export function ClinicPipelineOrbit({
  rows,
  title = "État clinique",
}: ClinicPipelineOrbitProps) {
  const total = rows.reduce((sum, r) => sum + r.value, 0);

  return (
    <Card className="dashboard-luxe-card overflow-hidden rounded-[26px] bg-card shadow-none">
      <CardHeader className="border-border/50 border-b px-6 py-5">
        <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
          Pipeline
        </CardDescription>
        <CardTitle className="font-semibold text-[22px] tracking-[-0.045em]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-2xl">📊</span>
            <p className="font-medium text-foreground text-sm">Aucune donnée</p>
            <p className="text-muted-foreground text-xs">
              Pas de pipeline disponible
            </p>
          </div>
        ) : (
          <>
            <div className="flex h-2.5 gap-1 overflow-hidden rounded-full bg-secondary/70 p-[2px]">
              {rows.map((row) =>
                row.value > 0 ? (
                  <div
                    className="h-full rounded-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                    key={row.label}
                    style={{
                      width: `${Math.max((row.value / Math.max(total, 1)) * 100, 2)}%`,
                      backgroundColor: row.color,
                    }}
                  />
                ) : null
              )}
            </div>

            {rows.map((row) => {
              const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
              return (
                <div key={row.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex min-w-0 items-center gap-2 text-foreground">
                      <span className="shrink-0 text-base">
                        {getIcon(row.label)}
                      </span>
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      {row.label}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-semibold text-foreground tabular-nums">
                        {row.value}
                      </span>
                      {pct > 0 && (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {pct}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.max(row.ratio * 100, row.value ? 8 : 0)}%`,
                        backgroundColor: row.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}
