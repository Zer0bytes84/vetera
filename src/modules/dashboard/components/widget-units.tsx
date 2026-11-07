import { useState, type ReactNode } from "react";
import { ArrowRight, Bird, Cat, Dog, Horse, PawPrint, Rabbit, Turtle } from "@/lib/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/utils/display-format";
import { formatCentimes } from "../v2/model";
import type { DayUnit, DayUnitState, MonthForecast, SpeciesRow } from "../model/dashboard-widgets";
import { shares } from "../model/dashboard-widgets";
import "./widget-units.css";

/** One category line: mark, name, count, share, aligned to the right. */
export interface CategoryRow {
  key: string;
  mark: ReactNode;
  name: string;
  value: string;
  share?: number;
}

export function CategoryRows({
  rows,
  label,
  active,
  onActive,
}: {
  rows: CategoryRow[];
  label: string;
  /** The row lit by a hover elsewhere (the donut's arc). */
  active?: string | null;
  onActive?: (key: string | null) => void;
}) {
  return (
    <ul aria-label={label} className="widgetRows" data-dimmed={active ? "" : undefined}>
      {rows.map((row) => (
        <li
          data-active={active === row.key || undefined}
          key={row.key}
          onPointerEnter={onActive ? () => onActive(row.key) : undefined}
          onPointerLeave={onActive ? () => onActive(null) : undefined}
        >
          <span aria-hidden="true" className="widgetRowMark">
            {row.mark}
          </span>
          <span className="widgetRowName">{row.name}</span>
          <span className="widgetRowValue">{row.value}</span>
          {row.share === undefined ? null : <span className="widgetRowShare">{row.share} %</span>}
        </li>
      ))}
    </ul>
  );
}

const DAY_STATES: { state: DayUnitState; name: string; plural: string }[] = [
  { state: "done", name: "Terminé", plural: "Terminés" },
  { state: "underway", name: "En cours", plural: "En cours" },
  { state: "upcoming", name: "À venir", plural: "À venir" },
];

/** The day's appointments as units that count at a glance, then their split. */
export function DayUnits({
  day,
}: {
  day: { units: DayUnit[]; total: number; done: number; underway: number; upcoming: number };
}) {
  const counts = DAY_STATES.map(({ state }) => day[state]);
  const parts = shares(counts);
  return (
    <div className="dayUnits">
      <p className="widgetHero">
        <strong>{formatNumber(day.done)}</strong>
        <span>
          sur {formatNumber(day.total)} rendez-vous terminé{day.done > 1 ? "s" : ""}
        </span>
      </p>
      <div
        aria-label={`${day.done} rendez-vous terminés sur ${day.total}, ${day.underway} en cours, ${day.upcoming} à venir`}
        className="unitGrid"
        role="img"
      >
        {day.units.map((unit) => (
          <Tooltip key={unit.id}>
            <TooltipTrigger render={<span className="unit" data-state={unit.state} />} />
            <TooltipContent>
              {unit.label} · {DAY_STATES.find((s) => s.state === unit.state)?.name}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <CategoryRows
        label="Répartition des rendez-vous du jour"
        rows={DAY_STATES.map(({ state, plural }, index) => ({
          key: state,
          mark: <i className="unit" data-state={state} />,
          name: plural,
          value: formatNumber(counts[index]),
          share: parts[index],
        }))}
      />
    </div>
  );
}

const shortDay = (date: Date) => date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** The forecast sentence, written from the computed figures only. */
export function forecastSentence(forecast: MonthForecast): string {
  if (forecast.kind === "empty") return `Aucun encaissement en ${forecast.monthLabel} : rien à prévoir.`;
  if (forecast.kind === "early") {
    return `${formatCentimes(forecast.collected)} encaissés en ${forecast.daysElapsed} jour${forecast.daysElapsed > 1 ? "s" : ""} : trop tôt pour prévoir, prévision dès le ${forecast.minimumDays} ${forecast.monthLabel}.`;
  }
  const end = `${forecast.monthLabel} finit vers ${formatCentimes(forecast.projected)}`;
  const previous = `${forecast.previousLabel} (${formatCentimes(forecast.previousTotal)})`;
  if (!forecast.previousTotal) return `À ce rythme, ${end}.`;
  if (forecast.passed) return `${previous[0].toUpperCase()}${previous.slice(1)} est déjà dépassé. À ce rythme, ${end}.`;
  // "30 oct." already ends with its own full stop.
  if (forecast.crossing) return `À ce rythme, ${end} et dépasse ${previous} vers le ${shortDay(forecast.crossing)}`.replace(/\.?$/, ".");
  return `À ce rythme, ${end}, sous ${previous}.`;
}

/**
 * The month's receipts as a segmented bar: collected solid, the forecast
 * hatched up to its month-end value, last month's total as a mark.
 */
export function ForecastBar({ forecast }: { forecast: MonthForecast }) {
  const sentence = forecastSentence(forecast);
  if (forecast.kind !== "forecast") {
    return (
      <section aria-label="Prévision du mois" className="forecast">
        <p className="forecastLine">{sentence}</p>
      </section>
    );
  }
  const scale = Math.max(forecast.projected, forecast.previousTotal, 1);
  const percent = (value: number) => `${Math.min(100, (value / scale) * 100)}%`;
  const remaining = Math.max(0, forecast.projected - forecast.collected);
  const previousName = `${forecast.previousLabel[0].toUpperCase()}${forecast.previousLabel.slice(1)}`;
  // The mark's label sits over the mark, kept inside the card at either end.
  const markAt = (forecast.previousTotal / scale) * 100;
  const markLabelStyle =
    markAt > 70
      ? { right: `${100 - markAt}%` }
      : markAt < 30
        ? { left: `${markAt}%` }
        : { left: `${markAt}%`, transform: "translateX(-50%)" };
  return (
    <section aria-label="Prévision du mois" className="forecast">
      <p className="forecastLine">{sentence}</p>
      <div className="forecastScale">
      {forecast.previousTotal ? (
        <span aria-hidden="true" className="forecastMarkLabel" style={markLabelStyle}>
          {previousName} · {formatCentimes(forecast.previousTotal)}
        </span>
      ) : null}
      <div aria-label={sentence} className="forecastBar" role="img">
        <i data-part="collected" style={{ width: percent(forecast.collected) }} />
        <i data-part="projected" style={{ width: percent(remaining) }} />
        {forecast.previousTotal ? (
          <Tooltip>
            <TooltipTrigger
              render={<span className="forecastMark" style={{ left: percent(forecast.previousTotal) }} />}
            />
            <TooltipContent>
              {previousName} : {formatCentimes(forecast.previousTotal)}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div aria-hidden="true" className="forecastAxis">
        <span>0</span>
        <span>{formatCentimes(scale)}</span>
      </div>
      </div>
      <CategoryRows
        label="Détail de la prévision"
        rows={[
          { key: "collected", mark: <i className="forecastKey" data-part="collected" />, name: `Encaissé en ${forecast.monthLabel}`, value: formatCentimes(forecast.collected) },
          { key: "projected", mark: <i className="forecastKey" data-part="projected" />, name: "Prévision d’ici la fin du mois", value: `+ ${formatCentimes(remaining)}` },
          ...(forecast.previousTotal
            ? [{ key: "previous", mark: <i className="forecastKey" data-part="previous" />, name: `${previousName}, repère`, value: formatCentimes(forecast.previousTotal) }]
            : []),
        ]}
      />
      <p className="forecastNote">
        Prévision linéaire, au rythme des {forecast.daysElapsed} premiers jours de {forecast.monthLabel}.
      </p>
    </section>
  );
}

/** A card's last line: what to know, then its single action as a pill. */
/** The action is optional: a card whose destination another card on the row already offers shows the note alone. */
export function WidgetFooter({ children, action, onAction }: { children?: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div className="widgetFooter">
      <p>{children}</p>
      {action && onAction ? (
        <button className="pillAction" onClick={onAction} type="button">
          {action} <ArrowRight aria-hidden="true" size={13} />
        </button>
      ) : null}
    </div>
  );
}

function speciesGlyph(name: string) {
  const norm = name.toLocaleLowerCase("fr-FR");
  if (norm.includes("chien")) return Dog;
  if (norm.includes("chat")) return Cat;
  if (norm.includes("lapin") || norm.includes("nac") || norm.includes("rongeur")) return Rabbit;
  if (norm.includes("oiseau")) return Bird;
  if (norm.includes("tortue") || norm.includes("reptile")) return Turtle;
  if (norm.includes("cheval")) return Horse;
  return PawPrint;
}

const DONUT = { size: 120, radius: 50, stroke: 14, gap: 3 };

/**
 * Active patients by species: a donut whose centre reads the hovered species,
 * and the category rows beside it, lit together.
 */
export function SpeciesSplit({ split }: { split: { total: number; rows: SpeciesRow[] } }) {
  const [active, setActive] = useState<string | null>(null);
  const circumference = 2 * Math.PI * DONUT.radius;
  const gap = split.rows.length > 1 ? DONUT.gap : 0;
  const lengths = split.rows.map((row) => (row.count / Math.max(1, split.total)) * circumference);
  const arcs = split.rows.map((row, index) => ({
    row,
    index,
    start: lengths.slice(0, index).reduce((sum, length) => sum + length, 0),
    length: Math.max(0.5, lengths[index] - gap),
  }));
  const hot = split.rows.find((row) => row.key === active);
  return (
    <div className="speciesSplit">
      <div className="speciesDonutBox">
      <svg
        aria-label={split.rows.map((row) => `${row.name} : ${row.count} (${row.share} %)`).join(", ")}
        className="speciesDonut"
        height={DONUT.size}
        role="img"
        viewBox={`0 0 ${DONUT.size} ${DONUT.size}`}
        width={DONUT.size}
      >
        <g transform={`rotate(-90 ${DONUT.size / 2} ${DONUT.size / 2})`}>
          <circle className="speciesTrack" cx={DONUT.size / 2} cy={DONUT.size / 2} fill="none" r={DONUT.radius} strokeWidth={DONUT.stroke} />
          {arcs.map(({ row, index, start, length }) => (
            <circle
              className="speciesArc"
              cx={DONUT.size / 2}
              cy={DONUT.size / 2}
              data-active={active === row.key || undefined}
              data-tone={index}
              fill="none"
              key={row.key}
              onPointerEnter={() => setActive(row.key)}
              onPointerLeave={() => setActive(null)}
              r={DONUT.radius}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-start}
              strokeWidth={DONUT.stroke}
            >
              <title>{`${row.name} : ${row.count} (${row.share} %)`}</title>
            </circle>
          ))}
        </g>
      </svg>
      {/* The centre is laid out, not positioned: figure and label can never overlap. */}
      <p aria-hidden="true" className="speciesCenter">
        <strong>{formatNumber(hot ? hot.count : split.total)}</strong>
        <span>{hot ? `${hot.name} · ${hot.share} %` : "actifs"}</span>
      </p>
      </div>
      <CategoryRows
        active={active}
        label="Patients actifs par espèce"
        onActive={setActive}
        rows={split.rows.map((row, index) => {
          const Glyph = speciesGlyph(row.name);
          return {
            key: row.key,
            mark: (
              <span className="speciesMark" data-tone={index}>
                <Glyph size={13} strokeWidth={1.5} />
              </span>
            ),
            name: row.name,
            value: formatNumber(row.count),
            share: row.share,
          };
        })}
      />
    </div>
  );
}
