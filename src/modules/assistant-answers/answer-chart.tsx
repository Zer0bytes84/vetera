import { useId } from "react";
import { monotonePath } from "@/modules/dashboard/components/chart-path";
import { formatDinars, formatNumber } from "@/utils/display-format";
import type { AnswerChart as Chart } from "./types";
import "./answer-chart.css";

/*
 * The chart of an answer (tranche 1, 19 November 2026), drawn in SVG like the dashboard's curves (no chart library on
 * this path). Its points come from the table under it and add up to the cards above it (verifyAnswer). For assistive
 * tech it is one image named by its totals; the table carries the detail.
 */

const W = 560;
const H = 150;
const PAD = { top: 10, bottom: 22, left: 4, right: 4 };
const TONES = { income: "var(--chart-blue)", expense: "var(--chart-teal)", count: "var(--chart-blue)" } as const;

const total = (points: { value: number }[]) => points.reduce((sum, point) => sum + point.value, 0);

export function AnswerChart({ chart: given }: { chart: Chart }) {
  const id = useId();
  // A series with nothing in the period (no expense this month) is not drawn: its card already says 0.
  const drawn = given.series.filter((series) => total(series.points) > 0);
  // A single point has no area: it is drawn as a bar.
  const chart = { ...given, kind: given.series[0]?.points.length === 1 ? "bars" : given.kind, series: drawn.length ? drawn : given.series } as Chart;
  const say = (value: number) => (chart.unit === "money" ? formatDinars(value / 100, 2) : formatNumber(value));
  const all = chart.series.flatMap((series) => series.points.map((point) => point.value));
  const max = Math.max(1, ...all);
  const count = chart.series[0]?.points.length ?? 0;
  const x = (index: number) => PAD.left + (count <= 1 ? (W - PAD.left - PAD.right) / 2 : (index / (count - 1)) * (W - PAD.left - PAD.right));
  const y = (value: number) => PAD.top + (1 - value / max) * (H - PAD.top - PAD.bottom);
  const base = H - PAD.bottom;
  const labels = chart.series[0]?.points ?? [];
  const ticks = [...new Set(count <= 1 ? [0] : [0, Math.floor((count - 1) / 2), count - 1])];
  const name = `${chart.title} : ${chart.series.map((series) => `${series.label} ${say(total(series.points))}`).join(", ")}.`;
  const slot = (W - PAD.left - PAD.right) / Math.max(1, count);
  return (
    <figure className="answer-chart" data-kind={chart.kind}>
      <div className="answer-chart-legend" aria-hidden="true">
        {chart.series.map((series) => (
          <span className="answer-chart-pill" key={series.id}>
            <span className="answer-chart-swatch" data-tone={series.tone} />
            {series.label}
          </span>
        ))}
        <span className="answer-chart-max">{say(max)}</span>
      </div>
      <svg aria-label={name} className="answer-chart-plot" preserveAspectRatio="none" role="img" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          {chart.series.map((series) => (
            <linearGradient id={`${id}-${series.id}`} key={series.id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={TONES[series.tone]} stopOpacity="0.22" />
              <stop offset="100%" stopColor={TONES[series.tone]} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>
        {chart.kind === "area"
          ? chart.series.map((series) => {
              const line = monotonePath(series.points.map((point, index) => [x(index), y(point.value)] as const));
              return (
                <g key={series.id}>
                  <path d={`${line} L${x(count - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z`} fill={`url(#${id}-${series.id})`} />
                  <path d={line} fill="none" stroke={TONES[series.tone]} strokeLinecap="round" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
                </g>
              );
            })
          : chart.series[0]?.points.map((point, index) => {
              const width = Math.max(2, Math.min(28, slot * 0.62));
              const top = y(point.value);
              return <rect fill={TONES[chart.series[0].tone]} height={Math.max(0, base - top)} key={point.key} rx="3" width={width} x={PAD.left + slot * index + (slot - width) / 2} y={top} />;
            })}
      </svg>
      <div className="answer-chart-ticks" aria-hidden="true">
        {chart.bucket === "espece"
          ? labels.map((point) => <span key={point.key}>{point.label}</span>)
          : ticks.map((index) => <span key={labels[index]?.key ?? index}>{labels[index]?.label}</span>)}
      </div>
    </figure>
  );
}
