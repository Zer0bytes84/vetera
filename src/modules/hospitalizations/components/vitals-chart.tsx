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

  if (sorted.length < 2) return null;

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

  const series: { key: string; color: string; values: (number | null | undefined)[]; domain: [number, number] }[] = [
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
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px]">
        {series.map((s) => (
          <div className="flex items-center gap-1.5" key={s.key}>
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="font-mono uppercase tracking-[0.06em] text-muted-foreground">
              {s.key}
            </span>
          </div>
        ))}
      </div>
      <svg
        className="h-[160px] w-full overflow-visible"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <line
          x1={padX}
          x2={W - padX}
          y1={H - padY}
          y2={H - padY}
          stroke="currentColor"
          strokeOpacity={0.1}
        />
        {series.map((s) => {
          const [dmin, dmax] = s.domain;
          const range = dmax - dmin;
          const yOf = (val: number | null | undefined) => {
            if (val == null) return null;
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
              <polyline
                fill="none"
                points={points}
                stroke={s.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
              {s.values.map((v, i) => {
                const y = yOf(v);
                if (y == null) return null;
                return (
                  <circle
                    cx={xOf(sorted[i].recordedAt)}
                    cy={y}
                    fill={s.color}
                    key={i}
                    r={2.5}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
