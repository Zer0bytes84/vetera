import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { formatNumber } from "@/utils/display-format";
import "./focus-trend-chart.css";

export interface FocusPoint {
  label: string;
  long: string;
  receipts: number;
  visits: number;
  previousReceipts?: number;
  previousVisits?: number;
}

type Metric = "receipts" | "visits";

/** Plot geometry: the readout band on top, the scale on the right, three dates under. */
const G = { h: 300, top: 52, bottom: 28, left: 0, right: 40 };

function scaleTop(max: number) {
  const raw = Math.max(max, 5) / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  return { top: step * 5, ticks: [0, 1, 2, 3, 4, 5].map((i) => Math.round(step * i * 100) / 100) };
}

/** Compact scale label: 15 000 → « 15 k ». */
const compact = (value: number) =>
  value >= 1000 ? `${formatNumber(value / 1000, { maximumFractionDigits: 1 })} k` : formatNumber(value);

const METRICS: { value: Metric; label: string }[] = [
  { value: "receipts", label: "Recettes" },
  { value: "visits", label: "Consultations" },
];

/**
 * The receipts chart, after the reference: the period's figure and its change
 * in the head, the series tabs and the period on the right, one series drawn
 * as a fine monochrome line with its glow and a fading area, a dashed grid
 * and a dashed cross on the hovered day, a frameless readout, the scale on
 * the right and three dates under. Straight segments: an empty stretch of
 * days stays flat at zero, as the journal has it.
 */
export function FocusTrendChart({
  points,
  periodControl,
  footer,
}: {
  points: FocusPoint[];
  /** The period switch, set in the head beside the series tabs. */
  periodControl?: ReactNode;
  footer?: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [metric, setMetric] = useState<Metric>("receipts");
  const [active, setActive] = useState<number | null>(null);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const n = points.length;
  const value = (p: FocusPoint) => (metric === "receipts" ? p.receipts : p.visits);
  const previous = (p: FocusPoint) => (metric === "receipts" ? p.previousReceipts : p.previousVisits);
  const total = points.reduce((sum, p) => sum + value(p), 0);
  const hasPrevious = points.some((p) => previous(p) !== undefined);
  const previousTotal = points.reduce((sum, p) => sum + (previous(p) ?? 0), 0);
  const change = hasPrevious && previousTotal ? Math.round(((total - previousTotal) / previousTotal) * 1000) / 10 : null;
  const unit = (v: number) =>
    metric === "receipts" ? `${formatNumber(v)} DA` : `${formatNumber(v)} consultation${v > 1 ? "s" : ""}`;

  const { top, ticks } = scaleTop(Math.max(1, ...points.map(value)));
  const plotW = Math.max(0, width - G.left - G.right);
  const plotH = G.h - G.top - G.bottom;
  const base = G.top + plotH;
  const x = (k: number) => G.left + (n <= 1 ? plotW / 2 : (k * plotW) / (n - 1));
  const y = (v: number) => base - (Math.min(v, top) / top) * plotH;
  const path = (from: number, to: number) =>
    points
      .slice(from, to + 1)
      .map((p, i) => `${i ? "L" : "M"}${x(from + i).toFixed(1)},${y(value(p)).toFixed(1)}`)
      .join(" ");

  // At rest the whole line is lit; on hover, what came before steps back.
  const split = active ?? 0;
  const lit = n > 1 ? path(split, n - 1) : "";
  const quiet = active !== null && active > 0 ? path(0, active) : "";
  const area = lit ? `${lit} L${x(n - 1).toFixed(1)},${base} L${x(split).toFixed(1)},${base} Z` : "";
  const dates = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : [0, n - 1];

  const hot = active !== null ? points[active] : null;
  const hotPrevious = hot ? previous(hot) : undefined;
  const flip = active !== null && x(active) > width - 240;

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (n < 2 || plotW <= 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    const k = Math.round(((event.clientX - box.left - G.left) / plotW) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, k)));
  };
  // The keyboard walks the days as the pointer does.
  const onKey = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.key === "ArrowLeft" ? -1 : 1;
    setActive((current) => Math.min(n - 1, Math.max(0, (current ?? n - 1) + step)));
  };

  return (
    <div className="focusChart">
      <div className="focusHead">
        <div className="focusFigure">
          <span className="focusFigureLabel">{metric === "receipts" ? "Recettes encaissées" : "Consultations"}</span>
          <strong>{metric === "receipts" ? `${formatNumber(total)} DA` : formatNumber(total)}</strong>
          <span className="focusChange" data-sense={change === null ? "none" : change > 0 ? "up" : change < 0 ? "down" : "flat"}>
            {change === null ? (
              "Pas de période précédente comparable"
            ) : (
              <>
                <b>{`${change > 0 ? "+" : ""}${formatNumber(change, { maximumFractionDigits: 1 })} %`}</b>
                {` contre ${unit(previousTotal)} la période précédente`}
              </>
            )}
          </span>
        </div>
        <div className="focusControls">
          <div aria-label="Série affichée" className="focusTabs" data-tabs-style="segmented" role="group">
            {METRICS.map((option) => (
              <button
                aria-pressed={metric === option.value}
                data-active={metric === option.value}
                key={option.value}
                onClick={() => setMetric(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          {periodControl}
        </div>
      </div>

      <div className="focusPlot" ref={boxRef}>
        {width ? (
          <svg
            aria-label={`${metric === "receipts" ? "Recettes" : "Consultations"} sur la période : ${unit(total)}`}
            data-active={active !== null || undefined}
            height={G.h}
            onBlur={() => setActive(null)}
            onFocus={() => setActive(n - 1)}
            onKeyDown={onKey}
            onPointerLeave={() => setActive(null)}
            onPointerMove={onMove}
            role="img"
            tabIndex={0}
            width={width}
          >
            <defs>
              <linearGradient id={`${id}-area`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--focus-ink)", stopOpacity: 0.22 }} />
                <stop offset="65%" style={{ stopColor: "var(--focus-ink)", stopOpacity: 0.05 }} />
                <stop offset="100%" style={{ stopColor: "var(--focus-ink)", stopOpacity: 0 }} />
              </linearGradient>
              <filter height="200%" id={`${id}-glow`} width="200%" x="-50%" y="-50%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            {ticks.map((t) => (
              <g key={t}>
                <line className="focusGrid" x1={G.left} x2={width - G.right + 10} y1={y(t)} y2={y(t)} />
                <text className="focusTickY" x={width} y={y(t)}>
                  {metric === "receipts" ? compact(t) : formatNumber(t)}
                </text>
              </g>
            ))}

            <path className="focusArea" d={area} fill={`url(#${id}-area)`} />
            {quiet ? <path className="focusQuiet" d={quiet} /> : null}
            <path className="focusGlow" d={lit} filter={`url(#${id}-glow)`} />
            <path className="focusLine" d={lit} />

            {/* The hovered day's date replaces any regular date too close to it. */}
            {dates.map((k) =>
              active !== null && Math.abs(x(k) - x(active)) < 64 ? null : (
                <text className="focusTickX" key={k} textAnchor={k === 0 ? "start" : k === n - 1 ? "end" : "middle"} x={x(k)} y={G.h - 6}>
                  {points[k]?.label}
                </text>
              ),
            )}

            {active !== null && hot ? (
              <g>
                <line className="focusRule" x1={x(active)} x2={x(active)} y1={4} y2={base} />
                <line className="focusRule" x1={G.left} x2={width - G.right + 10} y1={y(value(hot))} y2={y(value(hot))} />
                <circle className="focusDot" cx={x(active)} cy={y(value(hot))} r={3.5} />
                <text
                  className="focusTickX focusTickXActive"
                  textAnchor={active === 0 ? "start" : active === n - 1 ? "end" : "middle"}
                  x={x(active)}
                  y={G.h - 6}
                >
                  {hot.label}
                </text>
              </g>
            ) : null}
          </svg>
        ) : null}

        {/* Frameless readout beside the rule, in the band above the plot. */}
        {hot && active !== null ? (
          <div aria-hidden="true" className="focusTip" data-flip={flip || undefined} style={{ left: x(active), top: 0 }}>
            <span className="focusTipDate">{hot.long}</span>
            <strong>{unit(value(hot))}</strong>
            {hotPrevious !== undefined ? (
              <span className="focusTipDate">
                {unit(hotPrevious)} la période précédente
                {value(hot) !== hotPrevious
                  ? ` · ${value(hot) > hotPrevious ? "+" : "−"}${unit(Math.abs(value(hot) - hotPrevious))}`
                  : ""}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {footer}
    </div>
  );
}
