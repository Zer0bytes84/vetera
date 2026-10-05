import "./kpi-mini-chart.css";
import { useId, useState, type KeyboardEvent } from "react";

const number = (value: number) =>
  value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
function readingKey(
  event: KeyboardEvent,
  current: number | null,
  count: number,
  set: (value: number | null) => void
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

/** Compact real-data views with mouse and keyboard reading, separate from navigation. */
export function KpiMiniChart({
  values,
  labels,
  color,
  caption,
  bars = false,
  unit = "",
}: {
  values: number[];
  labels: string[];
  color: string;
  caption: string;
  bars?: boolean;
  unit?: string;
}) {
  const id = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered === null ? null : Math.min(hovered, values.length - 1);
  const max = Math.max(1, ...values);
  const points = values.map((value, i) => [
    8 + (i * 224) / Math.max(1, values.length - 1),
    36 - (value / max) * 30,
  ]);
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const activeX =
    active === null
      ? 0
      : bars
        ? ((active + 0.5) * 240) / values.length
        : points[active][0];
  return (
    <span className="studio-kpi-visual" style={{ color }}>
      <svg
        viewBox="0 0 240 40"
        preserveAspectRatio="none"
        role="img"
        tabIndex={0}
        aria-label={`${caption}. Flèches gauche et droite pour parcourir. ${values.map((value, i) => `${labels[i]} : ${number(value)} ${unit}`).join(", ")}`}
        onFocus={() => setHovered(values.length - 1)}
        onBlur={() => setHovered(null)}
        onKeyDown={(event) =>
          readingKey(event, active, values.length, setHovered)
        }
        onPointerLeave={() => setHovered(null)}
        onPointerMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - box.left) / box.width) * 240;
          setHovered(
            Math.max(
              0,
              Math.min(
                values.length - 1,
                bars
                  ? Math.floor((x / 240) * values.length)
                  : Math.round(((x - 8) / 224) * (values.length - 1))
              )
            )
          );
        }}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="currentColor" stopOpacity=".22" />
            <stop offset="1" stopColor="currentColor" stopOpacity=".02" />
          </linearGradient>
        </defs>
        <path d="M0 37H240" stroke="var(--border)" strokeDasharray="3 4" />
        {active !== null && (
          <path
            d={`M${activeX} 0V38`}
            stroke="currentColor"
            strokeOpacity=".35"
            strokeDasharray="2 3"
          />
        )}
        {bars ? (
          values.map((value, i) => (
            <rect
              key={i}
              className="studio-mini-bar"
              x={(i * 240) / values.length + 4}
              y={36 - (value / max) * 30}
              width={240 / values.length - 8}
              height={Math.max(2, (value / max) * 30)}
              rx="3"
              fill="currentColor"
              opacity={
                active === i
                  ? 1
                  : value
                    ? active !== null
                      ? 0.3
                      : i === values.length - 1
                        ? 1
                        : 0.55
                    : 0.12
              }
            />
          ))
        ) : (
          <>
            <path d={`${line} L232,37 L8,37 Z`} fill={`url(#${id})`} />
            <path
              d={line}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="2.5" fill="currentColor" />
            ))}
            {active !== null && (
              <circle
                cx={activeX}
                cy={points[active][1]}
                r="4"
                fill="var(--card)"
                stroke="currentColor"
                strokeWidth="2"
              />
            )}
          </>
        )}
      </svg>
      {active !== null && (
        <span
          className="studio-mini-tooltip"
          style={{
            left: `${Math.max(25, Math.min(75, (activeX / 240) * 100))}%`,
          }}
        >
          <span>{labels[active]}</span>
          <strong>
            {number(values[active])}
            {unit && ` ${unit}`}
          </strong>
        </span>
      )}
      <span className="studio-kpi-visual-caption">{caption}</span>
    </span>
  );
}

export function KpiSegments({
  segments,
  caption,
  value,
  unit = "",
}: {
  segments: { label: string; value: number; color: string }[];
  caption: string;
  value?: string;
  unit?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const visible = segments.filter((segment) => segment.value > 0);
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);
  const active =
    hovered === null ? null : Math.min(hovered, visible.length - 1);
  const segment = active !== null ? visible[active] : undefined;
  return (
    <span className="studio-kpi-visual studio-kpi-segments">
      <span
        className="studio-kpi-track"
        role="img"
        tabIndex={0}
        aria-label={`${caption}. ${segments.map((segment) => `${segment.label} : ${number(segment.value)} ${unit}`).join(", ")}. Flèches pour parcourir.`}
        onFocus={() => {
          if (visible.length) setHovered(0);
        }}
        onBlur={() => setHovered(null)}
        onKeyDown={(event) =>
          readingKey(event, active, visible.length, setHovered)
        }
        onPointerLeave={() => setHovered(null)}
      >
        {visible.map((segment, i) => (
          <span
            key={segment.label}
            onPointerEnter={() => setHovered(i)}
            style={{
              flexGrow: segment.value / (total || 1),
              background: segment.color,
              opacity: active === null || active === i ? 1 : 0.35,
            }}
          />
        ))}
      </span>
      {segment && (
        <span className="studio-mini-tooltip" style={{ left: "50%" }}>
          <span>{segment.label}</span>
          <strong>
            {number(segment.value)}
            {unit && ` ${unit}`} · {Math.round((segment.value / total) * 100)} %
          </strong>
        </span>
      )}
      <span className="studio-kpi-visual-caption">
        <span>{caption}</span>
        {value && <strong>{value}</strong>}
      </span>
    </span>
  );
}
