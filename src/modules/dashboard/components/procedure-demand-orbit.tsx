"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DemandRow = {
  name: string;
  demand: number;
};

type ProcedureDemandOrbitProps = {
  rows: DemandRow[];
};

const palette = [
  "from-blue-500 to-cyan-400",
  "from-violet-500 to-indigo-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-400",
  "from-pink-500 to-fuchsia-400",
];

export function ProcedureDemandOrbit({ rows }: ProcedureDemandOrbitProps) {
  const max = Math.max(...rows.map((r) => r.demand), 1);

  return (
    <Card className="dashboard-luxe-card overflow-hidden rounded-[26px] bg-card shadow-none">
      <CardHeader className="border-border/50 border-b px-6 py-5">
        <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
          Analyse clinique
        </CardDescription>
        <CardTitle className="font-semibold text-[22px] tracking-[-0.045em]">
          Demande par acte
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-6">
        {rows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Aucun acte enregistré pour l'instant.
          </div>
        ) : (
          rows.slice(0, 5).map((row, index) => {
            const width = Math.max(
              (row.demand / max) * 100,
              row.demand > 0 ? 8 : 0
            );
            return (
              <div key={row.name}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="truncate font-medium text-foreground text-sm">
                    {row.name}
                  </p>
                  <p className="font-mono text-muted-foreground text-xs tabular-nums">
                    {row.demand}
                  </p>
                </div>
                <div className="h-2.5 rounded-full bg-secondary/70 p-[2px]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r opacity-85 ${palette[index % palette.length]}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
