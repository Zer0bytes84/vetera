import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/utils/display-format";
import { formatCentimes } from "../v2/model";
import type { DayUnit, DayUnitState, MonthForecast } from "../model/dashboard-widgets";
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

export function CategoryRows({ rows, label }: { rows: CategoryRow[]; label: string }) {
  return (
    <ul aria-label={label} className="widgetRows">
      {rows.map((row) => (
        <li key={row.key}>
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
  return (
    <section aria-label="Prévision du mois" className="forecast">
      <p className="forecastLine">{sentence}</p>
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
