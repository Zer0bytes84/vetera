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

/** Plot geometry: the readout band on top, the visits scale on the left, the receipts scale on the right, three dates under. */
const G = { h: 300, top: 52, bottom: 28, left: 34, right: 46 };

/** Five equal steps up to a round top, so the two scales share one grid. */
export function scaleTop(max: number) {
  const raw = Math.max(max, 5) / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  return { top: step * 5, ticks: [0, 1, 2, 3, 4, 5].map((i) => Math.round(step * i * 100) / 100) };
}

/** The change of a total against the one before it; null when there is nothing to compare. */
export function seriesChange(total: number, previousTotal: number, hasPrevious: boolean) {
  return hasPrevious && previousTotal ? Math.round(((total - previousTotal) / previousTotal) * 1000) / 10 : null;
}

/** Compact scale label: 15 000 → « 15 k ». */
const compact = (value: number) =>
  value >= 1000 ? `${formatNumber(value / 1000, { maximumFractionDigits: 1 })} k` : formatNumber(value);

const money = (v: number) => `${formatNumber(v)} DA`;
const count = (v: number) => `${formatNumber(v)} consultation${v > 1 ? "s" : ""}`;

function Figure({
  series,
  label,
  value,
  change,
  previous,
}: {
  series: "receipts" | "visits";
  label: string;
  value: string;
  change: number | null;
  previous: string;
}) {
  return (
    <div className="focusFigure" data-series={series}>
      <span className="focusFigureLabel">
        <i aria-hidden="true" className="focusKey" data-series={series} />
        {label}
      </span>
      <strong>{value}</strong>
      <span className="focusChange" data-sense={change === null ? "none" : change > 0 ? "up" : change < 0 ? "down" : "flat"}>
        {change === null ? (
          "Pas de période précédente comparable"
        ) : (
          <>
            <b>{`${change > 0 ? "+" : ""}${formatNumber(change, { maximumFractionDigits: 1 })} %`}</b>
            {` contre ${previous} la période précédente`}
          </>
        )}
      </span>
    </div>
  );
}

/**
 * The period's receipts and consultations on one chart: receipts in dinars as
 * the ink line with its glow and fading area (scale on the right), consultations
 * as a blue line with a marker per day (scale on the left). Each has its figure
 * and its change in the head; a dashed grid and cross, a frameless readout with
 * both values. Straight segments: an empty stretch of days stays flat at zero.
 */
export function FocusTrendChart({
  points,
  periodControl,
  footer,
}: {
  points: FocusPoint[];
  /** The period switch, set in the head. */
  periodControl?: ReactNode;
  footer?: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
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
  const sum = (pick: (p: FocusPoint) => number | undefined) => points.reduce((total, p) => total + (pick(p) ?? 0), 0);
  const receiptsTotal = sum((p) => p.receipts);
  const visitsTotal = sum((p) => p.visits);
  const receiptsBefore = sum((p) => p.previousReceipts);
  const visitsBefore = sum((p) => p.previousVisits);
  const hasPrevious = points.some((p) => p.previousReceipts !== undefined || p.previousVisits !== undefined);
  const receiptsChange = seriesChange(receiptsTotal, receiptsBefore, hasPrevious);
  const visitsChange = seriesChange(visitsTotal, visitsBefore, hasPrevious);

  const left = scaleTop(Math.max(1, ...points.map((p) => p.visits)));
  const right = scaleTop(Math.max(1, ...points.map((p) => p.receipts)));
  const plotW = Math.max(0, width - G.left - G.right);
  const plotH = G.h - G.top - G.bottom;
  const base = G.top + plotH;
  const x = (k: number) => G.left + (n <= 1 ? plotW / 2 : (k * plotW) / (n - 1));
  const yReceipts = (v: number) => base - (Math.min(v, right.top) / right.top) * plotH;
  const yVisits = (v: number) => base - (Math.min(v, left.top) / left.top) * plotH;
  const path = (pick: (p: FocusPoint) => number, y: (v: number) => number, from: number, to: number) =>
    points
      .slice(from, to + 1)
      .map((p, i) => `${i ? "L" : "M"}${x(from + i).toFixed(1)},${y(pick(p)).toFixed(1)}`)
      .join(" ");

  // At rest the whole receipts line is lit; on hover, what came before steps back.
  const split = active ?? 0;
  const lit = n > 1 ? path((p) => p.receipts, yReceipts, split, n - 1) : "";
  const quiet = active !== null && active > 0 ? path((p) => p.receipts, yReceipts, 0, active) : "";
  const area = lit ? `${lit} L${x(n - 1).toFixed(1)},${base} L${x(split).toFixed(1)},${base} Z` : "";
  const visitsLine = n > 1 ? path((p) => p.visits, yVisits, 0, n - 1) : "";
  const dates = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : [0, n - 1];
  // A marker a day while days stay apart; a long period keeps the line alone.
  const markers = n <= 31;

  const hot = active !== null ? points[active] : null;
  const flip = active !== null && x(active) > width - 260;

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
        <div className="focusFigures">
          <Figure
            change={receiptsChange}
            label="Recettes encaissées"
            previous={money(receiptsBefore)}
            series="receipts"
            value={money(receiptsTotal)}
          />
          <Figure
            change={visitsChange}
            label="Consultations"
            previous={formatNumber(visitsBefore)}
            series="visits"
            value={formatNumber(visitsTotal)}
          />
        </div>
        <div className="focusControls">{periodControl}</div>
      </div>

      <div className="focusPlot" ref={boxRef}>
        {width ? (
          <svg
            aria-label={`Recettes et consultations sur la période : ${money(receiptsTotal)} et ${count(visitsTotal)}`}
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

            {/* One grid, two scales: the five steps of each line up. */}
            {right.ticks.map((t, i) => (
              <g key={t}>
                <line className="focusGrid" x1={G.left} x2={width - G.right + 10} y1={yReceipts(t)} y2={yReceipts(t)} />
                <text className="focusTickY" data-series="receipts" x={width} y={yReceipts(t)}>
                  {compact(t)}
                </text>
                <text className="focusTickY focusTickLeft" data-series="visits" x={0} y={yVisits(left.ticks[i])}>
                  {formatNumber(left.ticks[i])}
                </text>
              </g>
            ))}

            <path className="focusArea" d={area} fill={`url(#${id}-area)`} />
            {quiet ? <path className="focusQuiet" d={quiet} /> : null}
            <path className="focusGlow" d={lit} filter={`url(#${id}-glow)`} />
            <path className="focusLine" d={lit} />
            <path className="focusLineVisits" d={visitsLine} />
            {markers
              ? points.map((p, k) => (
                  <circle className="focusMarker" cx={x(k)} cy={yVisits(p.visits)} key={k} r={2.5} />
                ))
              : null}

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
                <circle className="focusDot" cx={x(active)} cy={yReceipts(hot.receipts)} r={3.5} />
                <circle className="focusDot focusDotVisits" cx={x(active)} cy={yVisits(hot.visits)} r={3.5} />
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

        {/* Frameless readout beside the rule, in the band above the plot: both series, each named. */}
        {hot && active !== null ? (
          <div aria-hidden="true" className="focusTip" data-flip={flip || undefined} style={{ left: x(active), top: 0 }}>
            <span className="focusTipDate">{hot.long}</span>
            <strong>
              <i className="focusKey" data-series="receipts" />
              {money(hot.receipts)}
            </strong>
            <strong>
              <i className="focusKey" data-series="visits" />
              {count(hot.visits)}
            </strong>
            {hot.previousReceipts !== undefined || hot.previousVisits !== undefined ? (
              <span className="focusTipDate">
                Période précédente : {money(hot.previousReceipts ?? 0)} · {formatNumber(hot.previousVisits ?? 0)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {footer}
    </div>
  );
}
