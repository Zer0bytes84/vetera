"use client";

import { useId, useState, type KeyboardEvent } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bird,
  Cat,
  Check,
  Dog,
  Horse,
  PawPrint,
  Rabbit,
  Turtle,
} from "@/lib/icons";
import { getSpeciesTheme } from "@/lib/species-theme";
import { formatNumber } from "@/utils/display-format";
import { formatCentimes } from "./model";
import { cn } from "@/lib/utils";
import "./kpi-visuals.css";

function handleKeyNavigation(
  event: KeyboardEvent,
  current: number | null,
  count: number,
  set: (val: number | null) => void
) {
  if (!count) return;
  if (event.key === "Escape") {
    set(null);
    return;
  }
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  set(
    Math.max(
      0,
      Math.min(
        count - 1,
        (current ?? count - 1) + (event.key === "ArrowRight" ? 1 : -1)
      )
    )
  );
}

// ---------------------------------------------------------------------------
// 1. CONSULTATIONS: 7-DAY CADENCE HISTOGRAM (Baitari Blue theme)
// ---------------------------------------------------------------------------
export function KpiConsultationsCadence({
  values,
  labels,
  change,
  completed,
  total,
}: {
  values: number[];
  labels: string[];
  change: number | null;
  completed?: number;
  total?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const count = values.length;
  const max = Math.max(1, ...values);
  const active = hovered === null ? null : Math.min(hovered, count - 1);

  const svgWidth = 240;
  const svgHeight = 32;
  const slotWidth = count > 0 ? svgWidth / count : svgWidth;
  const barWidth = Math.min(16, slotWidth * 0.58);

  const activeX = active === null ? 0 : (active + 0.5) * slotWidth;

  return (
    <div className="kpi-visual-container">
      <svg
        className="kpi-cadence-svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="none"
        role="img"
        tabIndex={0}
        aria-label={`Cadence des consultations sur 7 jours. ${values
          .map((v, i) => `${labels[i]} : ${v} consultation${v > 1 ? "s" : ""}`)
          .join(", ")}`}
        onFocus={() => setHovered(count - 1)}
        onBlur={() => setHovered(null)}
        onKeyDown={(e) => handleKeyNavigation(e, active, count, setHovered)}
        onPointerLeave={() => setHovered(null)}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * svgWidth;
          const idx = Math.max(0, Math.min(count - 1, Math.floor(x / slotWidth)));
          setHovered(idx);
        }}
      >
        {/* Baseline */}
        <line
          x1={0}
          y1={svgHeight - 2}
          x2={svgWidth}
          y2={svgHeight - 2}
          stroke="var(--border)"
          strokeDasharray="3 4"
        />

        {values.map((val, i) => {
          const isToday = i === count - 1;
          const isSelected = active === i;
          const slotX = i * slotWidth;
          const x = slotX + (slotWidth - barWidth) / 2;
          const barHeight = val > 0 ? Math.max(4, (val / max) * (svgHeight - 7)) : 2.5;
          const y = svgHeight - 2 - barHeight;

          return (
            <g key={i} className="kpi-bar-slot">
              {/* Background ambient pillar for today */}
              {isToday && (
                <rect
                  x={slotX + 2}
                  y={2}
                  width={slotWidth - 4}
                  height={svgHeight - 4}
                  rx={5}
                  fill="var(--primary)"
                  opacity={0.08}
                />
              )}

              {/* Bar - Baitari Blue palette */}
              <rect
                className="kpi-bar-rect"
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={Math.min(3, barWidth / 2)}
                fill="var(--primary)"
                opacity={
                  isSelected
                    ? 1
                    : isToday
                      ? 0.95
                      : val > 0
                        ? active !== null
                          ? 0.35
                          : 0.55
                        : 0.16
                }
              />

              {/* Accent dot for today */}
              {isToday && (
                <circle
                  cx={slotX + slotWidth / 2}
                  cy={svgHeight - 1}
                  r={1.5}
                  fill="var(--primary)"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Interactive Tooltip */}
      {active !== null && (
        <span
          className="kpi-interactive-tooltip"
          style={{
            left: `${Math.max(16, Math.min(84, (activeX / svgWidth) * 100))}%`,
          }}
        >
          <span>{labels[active]}</span>
          <strong>
            {values[active]} consultation{values[active] > 1 ? "s" : ""}
          </strong>
        </span>
      )}

      {/* Footer Info */}
      <div className="kpi-visual-footer">
        <span className="kpi-visual-caption">
          {completed !== undefined && total !== undefined && total > 0
            ? `${formatNumber(completed)}/${formatNumber(total)} honorée${completed > 1 ? "s" : ""}`
            : "Cadence 7 derniers jours"}
        </span>
        {change !== null && (
          <span
            className={cn(
              "kpi-badge",
              change > 0
                ? "kpi-badge-positive"
                : change < 0
                  ? "kpi-badge-negative"
                  : "kpi-badge-neutral"
            )}
            title="Comparaison aux 7 jours précédents"
          >
            {change > 0 ? (
              <ArrowUpRight size={10} aria-hidden="true" />
            ) : change < 0 ? (
              <ArrowDownRight size={10} aria-hidden="true" />
            ) : null}
            {change > 0 ? "+" : ""}
            {formatNumber(change)} %
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. ENCAISSEMENTS: SMOOTH SPLINE WAVE (Baitari Blue theme)
// ---------------------------------------------------------------------------
function buildSplinePath(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function KpiIncomeSplineWave({
  values,
  labels,
  change,
}: {
  values: number[];
  labels: string[];
  change: number | null;
}) {
  const gradientId = `income-spline-grad-${useId().replace(/:/g, "")}`;
  const [hovered, setHovered] = useState<number | null>(null);
  const count = values.length;
  const max = Math.max(1, ...values);
  const active = hovered === null ? null : Math.min(hovered, count - 1);

  const svgWidth = 240;
  const svgHeight = 32;
  const paddingX = 8;
  const usableWidth = svgWidth - paddingX * 2;

  const points: [number, number][] = values.map((val, i) => [
    paddingX + (i * usableWidth) / Math.max(1, count - 1),
    svgHeight - 4 - (val / max) * (svgHeight - 9),
  ]);

  const spline = buildSplinePath(points);
  const areaPath =
    points.length >= 2
      ? `${spline} L ${points[points.length - 1][0].toFixed(1)},${svgHeight - 2} L ${points[0][0].toFixed(1)},${svgHeight - 2} Z`
      : "";

  const activeX = active === null ? 0 : points[active][0];
  const lastPoint = points[points.length - 1];

  return (
    <div className="kpi-visual-container">
      <svg
        className="kpi-spline-svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="none"
        role="img"
        tabIndex={0}
        aria-label={`Courbe des encaissements sur 7 jours. ${values
          .map((v, i) => `${labels[i]} : ${Math.round(v).toLocaleString("fr-FR")} DA`)
          .join(", ")}`}
        onFocus={() => setHovered(count - 1)}
        onBlur={() => setHovered(null)}
        onKeyDown={(e) => handleKeyNavigation(e, active, count, setHovered)}
        onPointerLeave={() => setHovered(null)}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * svgWidth;
          const idx = Math.max(
            0,
            Math.min(count - 1, Math.round(((x - paddingX) / usableWidth) * (count - 1)))
          );
          setHovered(idx);
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Baseline */}
        <line
          x1={0}
          y1={svgHeight - 2}
          x2={svgWidth}
          y2={svgHeight - 2}
          stroke="var(--border)"
          strokeDasharray="3 4"
        />

        {/* Area fill - Baitari Blue */}
        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

        {/* Stroke wave - Baitari Blue */}
        {spline && (
          <path
            d={spline}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Crosshair guide */}
        {active !== null && (
          <line
            x1={activeX}
            y1={2}
            x2={activeX}
            y2={svgHeight - 2}
            stroke="var(--primary)"
            strokeOpacity={0.35}
            strokeDasharray="2 3"
          />
        )}

        {/* Interactive / Last point marker */}
        {active !== null ? (
          <circle
            cx={activeX}
            cy={points[active][1]}
            r={3.8}
            fill="var(--card)"
            stroke="var(--primary)"
            strokeWidth={2.4}
          />
        ) : lastPoint ? (
          <g>
            <circle
              cx={lastPoint[0]}
              cy={lastPoint[1]}
              r={4.5}
              fill="var(--primary)"
              opacity={0.25}
            />
            <circle
              cx={lastPoint[0]}
              cy={lastPoint[1]}
              r={2.6}
              fill="var(--primary)"
            />
          </g>
        ) : null}
      </svg>

      {/* Interactive Tooltip */}
      {active !== null && (
        <span
          className="kpi-interactive-tooltip"
          style={{
            left: `${Math.max(18, Math.min(82, (activeX / svgWidth) * 100))}%`,
          }}
        >
          <span>{labels[active]}</span>
          <strong>{Math.round(values[active]).toLocaleString("fr-FR")} DA</strong>
        </span>
      )}

      {/* Footer Info */}
      <div className="kpi-visual-footer">
        <span className="kpi-visual-caption">Flux 7 derniers jours</span>
        {change !== null && (
          <span
            className={cn(
              "kpi-badge",
              change > 0
                ? "kpi-badge-positive"
                : change < 0
                  ? "kpi-badge-negative"
                  : "kpi-badge-neutral"
            )}
            title="Comparaison aux 7 jours précédents"
          >
            {change > 0 ? (
              <ArrowUpRight size={10} aria-hidden="true" />
            ) : change < 0 ? (
              <ArrowDownRight size={10} aria-hidden="true" />
            ) : null}
            {change > 0 ? "+" : ""}
            {formatNumber(change)} %
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. PATIENTS: VETERINARY SPECIES SEGMENTED DISTRIBUTION & MICRO-CHIPS
// ---------------------------------------------------------------------------
function resolveSpeciesGlyph(name: string) {
  const norm = name.toLowerCase();
  if (norm.includes("chien") || norm.includes("canin")) return Dog;
  if (norm.includes("chat") || norm.includes("felin") || norm.includes("félin")) return Cat;
  if (norm.includes("lapin") || norm.includes("rongeur") || norm.includes("nac")) return Rabbit;
  if (norm.includes("oiseau") || norm.includes("perroquet")) return Bird;
  if (norm.includes("tortue") || norm.includes("reptile")) return Turtle;
  if (norm.includes("cheval") || norm.includes("equin") || norm.includes("équin")) return Horse;
  return PawPrint;
}

export function KpiSpeciesDistribution({
  speciesEntries,
  totalPatients,
}: {
  speciesEntries: [string, number][];
  totalPatients: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const cleanTotal = Math.max(1, totalPatients);
  const displayEntries = speciesEntries.filter(([_, count]) => count > 0);
  const topSpecies = displayEntries.slice(0, 3);

  return (
    <div className="kpi-visual-container">
      <div className="kpi-species-box">
        {/* Segmented Multi-Species Track */}
        <div
          className="kpi-species-track"
          role="img"
          aria-label={`Répartition des espèces : ${displayEntries
            .map(
              ([name, count]) =>
                `${name} : ${count} (${Math.round((count / cleanTotal) * 100)} %)`
            )
            .join(", ")}`}
          onPointerLeave={() => setHoveredIndex(null)}
        >
          {displayEntries.length > 0 ? (
            displayEntries.map(([name, count], index) => {
              const theme = getSpeciesTheme(name);
              const isDog = name.toLowerCase().includes("chien") || name.toLowerCase().includes("canin");
              const speciesColor = isDog ? "var(--primary)" : theme.accentHex;
              const pct = (count / cleanTotal) * 100;
              const isSelected = hoveredIndex === index;

              return (
                <div
                  key={name}
                  className="kpi-species-segment"
                  style={{
                    flexGrow: count,
                    backgroundColor: speciesColor,
                    opacity: hoveredIndex === null || isSelected ? 1 : 0.35,
                    filter: isSelected ? "brightness(1.15)" : undefined,
                  }}
                  onPointerEnter={() => setHoveredIndex(index)}
                  title={`${name} : ${count} (${Math.round(pct)} %)`}
                />
              );
            })
          ) : (
            <div className="w-full h-full bg-muted/60 rounded-full" />
          )}
        </div>

        {/* Micro Species Badges (Single-line compact) */}
        <div className="kpi-species-chips">
          {topSpecies.length > 0 ? (
            topSpecies.map(([name, count], index) => {
              const Glyph = resolveSpeciesGlyph(name);
              const theme = getSpeciesTheme(name);
              const isDog = name.toLowerCase().includes("chien") || name.toLowerCase().includes("canin");
              const speciesColor = isDog ? "var(--primary)" : theme.accentHex;
              const pct = Math.round((count / cleanTotal) * 100);
              const isSelected = hoveredIndex === index;

              return (
                <span
                  key={name}
                  className={cn(
                    "kpi-species-chip transition-opacity",
                    hoveredIndex !== null && !isSelected ? "opacity-35" : "opacity-100"
                  )}
                  style={{ color: isSelected ? speciesColor : undefined }}
                  onPointerEnter={() => setHoveredIndex(index)}
                  onPointerLeave={() => setHoveredIndex(null)}
                >
                  <Glyph
                    size={11.5}
                    style={{ color: speciesColor }}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{formatNumber(count)}</strong>{" "}
                    {name.toLocaleLowerCase("fr-FR")}{count > 1 ? "s" : ""}
                  </span>
                  <span className="text-[11px] opacity-65">({pct}%)</span>
                </span>
              );
            })
          ) : (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <PawPrint size={11} className="opacity-50" />
              <span>Aucun patient enregistré</span>
            </span>
          )}
        </div>
      </div>

      {/* Floating tooltip on hover */}
      {hoveredIndex !== null && displayEntries[hoveredIndex] && (
        <span
          className="kpi-interactive-tooltip"
          style={{ left: "50%" }}
        >
          <span>{displayEntries[hoveredIndex][0]}</span>
          <strong>
            {displayEntries[hoveredIndex][1]} patient
            {displayEntries[hoveredIndex][1] > 1 ? "s" : ""} ·{" "}
            {Math.round((displayEntries[hoveredIndex][1] / cleanTotal) * 100)} %
          </strong>
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. À ENCAISSER: APPLE HEALTH CIRCULAR ACTIVITY RING (Baitari Blue theme)
// ---------------------------------------------------------------------------
export function KpiReceivablesGauge({
  waitingAmount,
  waitingCount,
  periodPaid,
}: {
  waitingAmount: number;
  waitingCount: number;
  periodPaid: number;
}) {
  const isClean = waitingAmount === 0;
  const totalDue = periodPaid + waitingAmount;
  const recoveryRate = totalDue > 0 ? Math.min(100, Math.round((periodPaid / totalDue) * 100)) : 100;

  // Circle radius 12.5, circumference ≈ 78.54
  const strokeRadius = 12.5;
  const circumference = 2 * Math.PI * strokeRadius;
  const strokeOffset = isClean ? 0 : circumference - (recoveryRate / 100) * circumference;

  return (
    <div className="kpi-visual-container">
      <div className="kpi-gauge-box">
        {/* Circular Progress Ring */}
        <div className="kpi-gauge-ring-wrap">
          <svg className="kpi-gauge-ring-svg" viewBox="0 0 32 32">
            {/* Background ring */}
            <circle
              cx={16}
              cy={16}
              r={strokeRadius}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={3}
            />
            {/* Active gauge ring - Baitari Blue when clean */}
            <circle
              cx={16}
              cy={16}
              r={strokeRadius}
              fill="none"
              stroke={isClean ? "var(--primary)" : "#f59e0b"}
              strokeWidth={3}
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
            />
          </svg>

          {/* Center icon / percentage */}
          <div className="kpi-gauge-center">
            {isClean ? (
              <Check
                size={14}
                className="text-primary stroke-[2.4]"
                aria-hidden="true"
              />
            ) : (
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {recoveryRate}%
              </span>
            )}
          </div>
        </div>

        {/* Text detail */}
        <div className="kpi-gauge-info">
          {isClean ? (
            <>
              <div className="kpi-gauge-title text-primary">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                <span>100 % à jour</span>
              </div>
              <div className="kpi-gauge-sub">Aucun impayé en attente</div>
            </>
          ) : (
            <>
              <div className="kpi-gauge-title text-amber-600 dark:text-amber-400">
                <span className="size-1.5 rounded-full bg-amber-500" />
                <span>
                  {formatNumber(waitingCount)} solde{waitingCount > 1 ? "s" : ""} à suivre
                </span>
              </div>
              <div className="kpi-gauge-sub">
                {formatCentimes(waitingAmount)} à recouvrer
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
