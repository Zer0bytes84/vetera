import { formatNumber } from "@/utils/display-format";
import { buildActivityHeatmap, buildHourlyActivity, heatLegend, heatLevel, type HeatDay } from "./dashboard-widgets";

/**
 * The clinic's activity as hexagons, in four views: one hexagon per hour of today, a grid of days and hours
 * for the week, one hexagon per day for the month, one per day over three months. Cells, captions and the
 * figures around them, from the same appointments and the same rules as the calendar heatmap this replaces:
 * cancellations and no-shows are not visits, booked hours and days after now are counted and flagged.
 */

export type HexView = "day" | "week" | "month" | "quarter";

export const HEX_VIEWS: { value: HexView; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "quarter", label: "Trimestre" },
];

export interface HexCellData {
  id: string;
  /** Position in the hexagon grid; odd rows sit half a cell to the right. */
  col: number;
  row: number;
  count: number;
  /** 0 for an empty cell, then 1 to 4: the heatmap's own steps. */
  level: number;
  /** Written inside the hexagon: a day number, an hour, a count. */
  label?: string;
  /** What the tooltip names: a day, an hour. */
  title: string;
  /** What the tooltip says about it: « 2 rendez-vous », « Rien de prévu ». */
  detail: string;
  /** After now: what is already booked, not what happened. */
  future: boolean;
  today: boolean;
}

export interface HexCaption {
  at: number;
  text: string;
}

export interface HexActivity {
  view: HexView;
  cells: HexCellData[];
  cols: number;
  rows: number;
  columnCaptions: HexCaption[];
  rowCaptions: HexCaption[];
  total: number;
  /** « rendez-vous sur la période » */
  heroCaption: string;
  stats: { key: string; name: string; value: string }[];
  legend: ReturnType<typeof heatLegend>;
  footer: string;
  peak: number;
}

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const plural = (count: number, word: string) => `${formatNumber(count)} ${word}${count > 1 && !word.endsWith("s") ? "s" : ""}`;
const hh = (hour: number) => String(hour).padStart(2, "0");
const longDay = (date: Date) => date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortDay = (date: Date) => date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

/** What a cell's tooltip says: done cells count visits, later ones what is booked. */
export function slotDetail(count: number, future: boolean) {
  if (future) return count ? `${plural(count, "rendez-vous")} prévu${count > 1 ? "s" : ""}` : "Rien de prévu";
  return count ? plural(count, "rendez-vous") : "Aucun rendez-vous";
}

const WEEKDAY_SHORT = WEEKDAYS.map((name) => name.slice(0, 3));

/** The figures under a calendar view, worded as the heatmap always worded them. */
function periodFigures(map: ReturnType<typeof buildActivityHeatmap>) {
  const futureBooked = map.days.filter((day) => day.future).reduce((sum, day) => sum + day.count, 0);
  const lastDay = `${map.to.getDate() === 1 ? "1er" : map.to.getDate()} ${map.to.toLocaleDateString("fr-FR", { month: "short" })}`;
  const busiestWeekday = map.total ? map.weekdays.indexOf(Math.max(...map.weekdays)) : -1;
  return {
    stats: [
      { key: "active", name: "Jours d’activité", value: `${formatNumber(map.activeDays)} sur ${formatNumber(map.elapsedDays)}` },
      { key: "busiest", name: "Jour le plus chargé", value: map.busiest ? `${shortDay(map.busiest.date)} · ${formatNumber(map.busiest.count)}` : "—" },
      { key: "weekday", name: "Jour de semaine le plus actif", value: busiestWeekday >= 0 ? `${WEEKDAYS[busiestWeekday]} · ${formatNumber(map.weekdays[busiestWeekday])}` : "—" },
    ],
    footer: futureBooked
      ? `${plural(futureBooked, "rendez-vous")} déjà prévu${futureBooked > 1 ? "s" : ""} d’ici le ${lastDay}`
      : map.days.some((day) => day.future)
        ? `Rien de prévu d’ici le ${lastDay}`
        : map.total
          ? `Moyenne : ${formatNumber(map.total / Math.max(1, map.activeDays), { maximumFractionDigits: 1 })} par jour d’activité`
          : "Les rendez-vous apparaîtront ici dès leur prise",
  };
}

const dayCell = (day: HeatDay, col: number, row: number): HexCellData => ({
  id: day.key,
  col,
  row,
  count: day.count,
  level: day.level,
  label: String(day.date.getDate()),
  title: longDay(day.date),
  detail: slotDetail(day.count, day.future),
  future: day.future,
  today: day.today,
});

export function buildHexActivity(view: HexView, appointments: { startTime?: string | null; status: string }[], now: Date): HexActivity {
  if (view === "day") {
    const { today } = buildHourlyActivity(appointments, now);
    const max = Math.max(0, ...today);
    const hour = now.getHours();
    const cells: HexCellData[] = today.map((count, h) => ({
      id: `h${h}`,
      col: h % 12,
      row: h < 12 ? 0 : 1,
      count,
      level: heatLevel(count, max),
      label: hh(h),
      title: `${hh(h)} h – ${hh((h + 1) % 24)} h`,
      detail: slotDetail(count, h > hour),
      future: h > hour,
      today: h === hour,
    }));
    const total = today.reduce((sum, count) => sum + count, 0);
    const active = today.filter((count) => count > 0).length;
    const busiest = max ? today.indexOf(max) : -1;
    const morning = today.slice(0, 12).reduce((sum, count) => sum + count, 0);
    const futureBooked = today.slice(hour + 1).reduce((sum, count) => sum + count, 0);
    return {
      view,
      cells,
      cols: 12,
      rows: 2,
      columnCaptions: [],
      rowCaptions: [{ at: 0, text: "0–11 h" }, { at: 1, text: "12–23 h" }],
      total,
      heroCaption: "rendez-vous aujourd’hui",
      stats: [
        { key: "active", name: "Heures d’activité", value: `${formatNumber(active)} sur ${formatNumber(hour + 1)}` },
        { key: "busiest", name: "Heure la plus chargée", value: busiest >= 0 ? `${hh(busiest)} h · ${formatNumber(max)}` : "—" },
        { key: "halves", name: "Matin · après-midi", value: `${formatNumber(morning)} · ${formatNumber(total - morning)}` },
      ],
      legend: heatLegend(max),
      footer: futureBooked
        ? `${plural(futureBooked, "rendez-vous")} déjà prévu${futureBooked > 1 ? "s" : ""} d’ici ce soir`
        : hour < 23
          ? "Rien de prévu d’ici ce soir"
          : total
            ? `Moyenne : ${formatNumber(total / Math.max(1, active), { maximumFractionDigits: 1 })} par heure d’activité`
            : "Les rendez-vous apparaîtront ici dès leur prise",
      peak: max,
    };
  }

  if (view === "week") {
    const { weekFrom, week } = buildHourlyActivity(appointments, now);
    const map = buildActivityHeatmap(appointments, "week", now);
    const used = week.flatMap((day) => day.map((count, h) => (count ? h : -1))).filter((h) => h >= 0);
    // The working day by default, stretched to hold any appointment before or after it.
    const first = Math.min(8, ...used);
    const last = Math.max(19, ...used);
    const max = Math.max(0, ...week.flat());
    const cells: HexCellData[] = [];
    for (let d = 0; d < 7; d += 1) {
      const date = new Date(weekFrom.getFullYear(), weekFrom.getMonth(), weekFrom.getDate() + d);
      for (let h = first; h <= last; h += 1) {
        const count = week[d][h];
        const slot = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h);
        const future = slot > now;
        cells.push({
          id: `d${d}h${h}`,
          col: d,
          row: h - first,
          count,
          level: heatLevel(count, max),
          label: count ? String(count) : undefined,
          title: `${shortDay(date)} · ${hh(h)} h`,
          detail: slotDetail(count, future),
          future,
          today: date.toDateString() === now.toDateString() && h === now.getHours(),
        });
      }
    }
    const figures = periodFigures(map);
    return {
      view,
      cells,
      cols: 7,
      rows: last - first + 1,
      columnCaptions: WEEKDAY_SHORT.map((text, at) => ({ at, text })),
      rowCaptions: Array.from({ length: last - first + 1 }, (_, at) => ({ at, text: `${hh(first + at)} h` })),
      total: map.total,
      heroCaption: "rendez-vous sur la période",
      stats: figures.stats,
      legend: heatLegend(max),
      footer: figures.footer,
      peak: max,
    };
  }

  const map = buildActivityHeatmap(appointments, view, now);
  const cells: HexCellData[] = [];
  const columnCaptions: HexCaption[] = [];
  map.months.forEach((month, block) => {
    const offset = block * 8;
    if (view === "quarter") columnCaptions.push({ at: offset, text: month.label });
    month.weeks.forEach((week, row) => week.forEach((day, col) => day && cells.push(dayCell(day, offset + col, row))));
  });
  if (view === "month") WEEKDAY_SHORT.forEach((text, at) => columnCaptions.push({ at, text }));
  const figures = periodFigures(map);
  return {
    view,
    cells,
    cols: map.months.length * 8 - 1,
    rows: Math.max(...map.months.map((month) => month.weeks.length)),
    columnCaptions,
    rowCaptions: [],
    total: map.total,
    heroCaption: "rendez-vous sur la période",
    stats: figures.stats,
    legend: map.legend,
    footer: figures.footer,
    peak: map.max,
  };
}
