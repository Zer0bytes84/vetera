import { useMemo, useRef, useState } from "react";
import { formatNumber } from "@/utils/display-format";
import {
  buildActivityHeatmap,
  HEATMAP_PERIODS,
  type HeatDay,
  type HeatmapPeriod,
} from "../model/dashboard-widgets";
import { CategoryRows, WidgetFooter } from "./widget-units";
import "./activity-heatmap.css";

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const plural = (count: number, word: string) => `${formatNumber(count)} ${word}${count > 1 && !word.endsWith("s") ? "s" : ""}`;
const longDay = (date: Date) =>
  date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortDay = (date: Date) => date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

/** What a day's tooltip says: done days count visits, later days what is booked. */
function dayCount(day: HeatDay) {
  if (day.future) return day.count ? `${plural(day.count, "rendez-vous")} prévu${day.count > 1 ? "s" : ""}` : "Rien de prévu";
  return day.count ? plural(day.count, "rendez-vous") : "Aucun rendez-vous";
}

function Cell({ day, onHover }: { day: HeatDay | null; onHover: (day: HeatDay | null, el: HTMLElement | null) => void }) {
  if (!day) return <span aria-hidden="true" className="heatCell" data-pad="" />;
  return (
    <span
      aria-hidden="true"
      className="heatCell"
      data-future={day.future || undefined}
      data-level={day.level}
      data-today={day.today || undefined}
      onPointerEnter={(event) => onHover(day, event.currentTarget)}
      onPointerLeave={() => onHover(null, null)}
    >
      <span className="heatCellDay">{day.date.getDate()}</span>
    </span>
  );
}

/**
 * The clinic's appointments per day: one cell per day in steps of the accent,
 * a calendar for a week, a month or a quarter, week columns for a year.
 */
export function ActivityHeatmap({
  appointments,
  now,
  onAgenda,
}: {
  appointments: { startTime?: string | null; status: string }[];
  now: Date;
  onAgenda: () => void;
}) {
  const [period, setPeriod] = useState<HeatmapPeriod>("month");
  const map = useMemo(() => buildActivityHeatmap(appointments, period, now), [appointments, period, now]);
  const boxRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ day: HeatDay; x: number; y: number; align: "start" | "center" | "end" } | null>(null);

  const hover = (day: HeatDay | null, el: HTMLElement | null) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!day || !el || !box) return setTip(null);
    const cell = el.getBoundingClientRect();
    const x = cell.left + cell.width / 2 - box.left;
    // Above the cell, kept inside the grid's width at either end.
    setTip({ day, x, y: cell.top - box.top - 6, align: x > box.width - 90 ? "end" : x < 90 ? "start" : "center" });
  };

  const futureBooked = map.days.filter((day) => day.future).reduce((sum, day) => sum + day.count, 0);
  // « le 1er nov. », as French writes the first of the month.
  const lastDay = `${map.to.getDate() === 1 ? "1er" : map.to.getDate()} ${map.to.toLocaleDateString("fr-FR", { month: "short" })}`;
  const busiestWeekday = map.total ? map.weekdays.indexOf(Math.max(...map.weekdays)) : -1;
  const summary = map.total
    ? `${plural(map.total, "rendez-vous")} sur ${plural(map.activeDays, "jour")} d’activité. Jour le plus chargé : ${longDay(map.busiest!.date)}, ${plural(map.busiest!.count, "rendez-vous")}.`
    : "Aucun rendez-vous sur la période.";
  const layout = period === "year" ? "year" : "calendar";

  return (
    <div className="card frame heatCard">
      <div className="cardHead">
        <div>
          <h2 className="cardTitle">Activité de la clinique</h2>
          <p className="cardNote">Rendez-vous par jour, annulations et absences exclues</p>
        </div>
        <div aria-label="Période de l’activité" className="heatPeriods" data-tabs-style="segmented" role="group">
          {HEATMAP_PERIODS.map((option) => (
            <button
              aria-pressed={period === option.value}
              data-active={period === option.value}
              key={option.value}
              onClick={() => {
                setTip(null);
                setPeriod(option.value);
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="heatBody">
        <div aria-label={summary} className="heatMain" data-layout={layout} data-period={period} ref={boxRef} role="img">
          {layout === "year" ? (
            <div className="heatYear" style={{ gridTemplateColumns: `24px repeat(${map.columns.length}, minmax(0, 1fr))` }}>
              <span aria-hidden="true" />
              {map.columns.map((column) => (
                <span aria-hidden="true" className="heatMonthMark" key={`m${column.key}`}>
                  {column.month ?? ""}
                </span>
              ))}
              {WEEKDAYS.map((name, row) => (
                <div className="heatYearRow" key={name} style={{ display: "contents" }}>
                  <span aria-hidden="true" className="heatWeekday">
                    {row % 2 === 0 ? name.slice(0, 3) : ""}
                  </span>
                  {map.columns.map((column) => (
                    <Cell day={column.days[row]} key={`${column.key}-${row}`} onHover={hover} />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="heatMonths" style={{ gridTemplateColumns: `repeat(${map.months.length}, minmax(0, 1fr))` }}>
              {map.months.map((month) => (
                <section aria-hidden="true" className="heatMonth" key={month.key}>
                  <h3 className="heatMonthLabel">{month.label}</h3>
                  <div className="heatGrid">
                    {WEEKDAYS.map((name) => (
                      <span className="heatWeekday" key={name}>
                        {period === "quarter" ? name[0] : name.slice(0, 3)}
                      </span>
                    ))}
                    {month.weeks.flat().map((day, index) => (
                      <Cell day={day} key={day?.key ?? `pad${index}`} onHover={hover} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {tip ? (
            <div
              aria-hidden="true"
              className="heatTip"
              data-align={tip.align}
              style={{ left: tip.x, top: tip.y }}
            >
              <strong>{dayCount(tip.day)}</strong>
              <span>{longDay(tip.day.date)}</span>
            </div>
          ) : null}
        </div>

        <div className="heatSide">
          <p className="widgetHero">
            <strong>{formatNumber(map.total)}</strong>
            <span>rendez-vous sur la période</span>
          </p>
          <CategoryRows
            label="Repères de la période"
            rows={[
              {
                key: "active",
                mark: null,
                name: "Jours d’activité",
                value: `${formatNumber(map.activeDays)} sur ${formatNumber(map.elapsedDays)}`,
              },
              {
                key: "busiest",
                mark: null,
                name: "Jour le plus chargé",
                value: map.busiest ? `${shortDay(map.busiest.date)} · ${formatNumber(map.busiest.count)}` : "—",
              },
              {
                key: "weekday",
                mark: null,
                name: "Jour de semaine le plus actif",
                value: busiestWeekday >= 0 ? `${WEEKDAYS[busiestWeekday]} · ${formatNumber(map.weekdays[busiestWeekday])}` : "—",
              },
            ]}
          />
          <div className="heatLegend">
            <span>Moins</span>
            {map.legend.map((step) => (
              <i
                className="heatCell"
                data-level={step.level}
                key={step.level}
                title={step.level ? (step.min === step.max ? plural(step.min, "rendez-vous") : `${step.min} à ${step.max} rendez-vous`) : "Aucun rendez-vous"}
              />
            ))}
            <span>Plus</span>
          </div>
        </div>
      </div>

      <WidgetFooter action="Agenda" onAction={onAgenda}>
        {futureBooked
          ? `${plural(futureBooked, "rendez-vous")} déjà prévu${futureBooked > 1 ? "s" : ""} d’ici le ${lastDay}`
          : map.days.some((day) => day.future)
            ? `Rien de prévu d’ici le ${lastDay}`
            : map.total
              ? `Moyenne : ${formatNumber(map.total / Math.max(1, map.activeDays), { maximumFractionDigits: 1 })} par jour d’activité`
              : "Les rendez-vous apparaîtront ici dès leur prise"}
      </WidgetFooter>
    </div>
  );
}
