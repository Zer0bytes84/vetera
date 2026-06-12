import { useMemo } from "react";

import type { HospitalizationVital } from "@/types/db";

/**
 * Mini chart SVG inline — pas de dépendance externe, simple courbe + points.
 * 4 lignes empilées (T°, FC, FR, SpO2) avec leurs propres axes.
 */
export function VitalsChart({
  vitals,
  className,
}: {
  vitals: HospitalizationVital[];
  className?: string;
}) {
  const sorted = useMemo(
    () => [...vitals].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)),
    [vitals]
  );

  if (sorted.length < 2) {
    return null;
  }

  const W = 600;
  const H = 160;
  const padX = 32;
  const padY = 16;

  const firstT = new Date(sorted[0].recordedAt).getTime();
  const lastT = new Date(sorted[sorted.length - 1].recordedAt).getTime();
  const span = Math.max(lastT - firstT, 60_000);

  const xOf = (t: string) => {
    const ms = new Date(t).getTime();
    return padX + ((ms - firstT) / span) * (W - padX * 2);
  };

  const series: {
    key: string;
    color: string;
    values: (number | null | undefined)[];
    domain: [number, number];
  }[] = [
    {
      key: "T°",
      color: "#f97316",
      values: sorted.map((v) => v.temperatureC),
      domain: [36, 41],
    },
    {
      key: "FC",
      color: "#ef4444",
      values: sorted.map((v) => v.heartRateBpm),
      domain: [40, 200],
    },
    {
      key: "FR",
      color: "#3b82f6",
      values: sorted.map((v) => v.respiratoryRateBpm),
      domain: [4, 80],
    },
    {
      key: "SpO2",
      color: "#10b981",
      values: sorted.map((v) => v.spo2Percent),
      domain: [85, 100],
    },
  ];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-4 shadow-inner dark:border-zinc-800 dark:bg-zinc-950",
        className
      )}
    >
      {/* Background grid for "monitor" effect */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #888 1px, transparent 1px), linear-gradient(to bottom, #888 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative z-10 mb-4 flex flex-wrap items-center gap-4 text-[10px]">
        {series.map((s) => (
          <div
            className="flex items-center gap-2 rounded-md border border-black/5 bg-white/50 px-2 py-1 shadow-sm dark:border-white/5 dark:bg-white/5"
            key={s.key}
          >
            <span
              className="inline-block size-2.5 rounded-full shadow-[0_0_8px_currentColor]"
              style={{ backgroundColor: s.color, color: s.color }}
            />
            <span className="font-bold text-foreground/80 uppercase tracking-widest">
              {s.key}
            </span>
          </div>
        ))}
      </div>
      <div className="relative z-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 shadow-inner dark:bg-black">
        <svg
          className="h-[180px] w-full overflow-visible"
          preserveAspectRatio="none"
          viewBox={`0 0 ${W} ${H}`}
        >
          {/* Grid lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = padY + (i * (H - padY * 2)) / 4;
            return (
              <line
                className="text-zinc-500"
                key={`grid-${i}`}
                stroke="currentColor"
                strokeOpacity={0.1}
                x1={padX}
                x2={W - padX}
                y1={y}
                y2={y}
              />
            );
          })}

          {series.map((s) => {
            const [dmin, dmax] = s.domain;
            const range = dmax - dmin;
            const yOf = (val: number | null | undefined) => {
              if (val == null) {
                return null;
              }
              return H - padY - ((val - dmin) / range) * (H - padY * 2);
            };
            const points = s.values
              .map((v, i) => {
                const x = xOf(sorted[i].recordedAt);
                const y = yOf(v);
                return y == null ? null : `${x},${y}`;
              })
              .filter(Boolean)
              .join(" ");
            return (
              <g key={s.key}>
                {/* Glow effect line */}
                <polyline
                  fill="none"
                  points={points}
                  stroke={s.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={0.2}
                  strokeWidth={4}
                  vectorEffect="non-scaling-stroke"
                />
                {/* Main line */}
                <polyline
                  className="drop-shadow-[0_0_3px_currentColor]"
                  fill="none"
                  points={points}
                  stroke={s.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  style={{ color: s.color }}
                  vectorEffect="non-scaling-stroke"
                />
                {s.values.map((v, i) => {
                  const y = yOf(v);
                  if (y == null) {
                    return null;
                  }
                  return (
                    <circle
                      className="drop-shadow-[0_0_4px_currentColor]"
                      cx={xOf(sorted[i].recordedAt)}
                      cy={y}
                      fill={s.color}
                      key={i}
                      r={3}
                      style={{ color: s.color }}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
