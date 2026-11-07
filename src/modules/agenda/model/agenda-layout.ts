/**
 * Where each appointment of a day sits on a time grid, as Outlook places them:
 * a block from its start to its end, and appointments that overlap side by side
 * in columns shared by the whole group of overlapping ones.
 */

export interface TimedItem {
  id: string;
  startTime: string;
  endTime?: string | null;
}

export interface PlacedEvent<T extends TimedItem> {
  item: T;
  /** Minutes from the day's midnight, kept inside 0–1440. */
  start: number;
  /** The end used to group appointments: at least a minimal block after the start. */
  end: number;
  /** The real end, for display: what the appointment says, or a default length when it says nothing usable. */
  realEnd: number;
  /** Column of the block within its group of overlapping appointments. */
  column: number;
  /** How many columns that group holds. */
  columns: number;
  /** Index of the group of overlapping appointments, in order of time. */
  group: number;
}

/** A block never gets shorter than this, so a 5-minute visit stays a block one can read and click. */
export const MIN_BLOCK_MINUTES = 20;
const DAY_MINUTES = 24 * 60;

function minutesFrom(day: Date, value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  const midnight = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  // Calendar minutes, not elapsed ones: a day of 23 or 25 hours at the clock change still ends at 24:00.
  const date = new Date(time);
  const sameDay = date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate();
  if (sameDay) return date.getHours() * 60 + date.getMinutes();
  return time < midnight ? 0 : DAY_MINUTES;
}

/**
 * Places the appointments that touch `day`. Those with an unreadable start are left out;
 * a missing or inverted end falls back to the minimum block; one running past midnight
 * is cut at 24:00. `minBlockMinutes` is the shortest block the grid draws: appointments are
 * grouped by the space their block really takes, so a short one that is drawn over its
 * neighbour is placed beside it.
 */
export function layoutDayEvents<T extends TimedItem>(items: T[], day: Date, minBlockMinutes: number = MIN_BLOCK_MINUTES): PlacedEvent<T>[] {
  const timed = items.flatMap((item) => {
    const start = minutesFrom(day, item.startTime);
    if (start === null) return [];
    const rawEnd = minutesFrom(day, item.endTime);
    // An appointment that starts at 24:00 (the next day) is not on this day.
    if (start >= DAY_MINUTES) return [];
    const end = Math.min(DAY_MINUTES, Math.max(rawEnd ?? 0, start + minBlockMinutes));
    const realEnd = rawEnd !== null && rawEnd > start ? Math.min(DAY_MINUTES, rawEnd) : Math.min(DAY_MINUTES, start + MIN_BLOCK_MINUTES);
    return [{ item, start, end, realEnd }];
  });
  timed.sort((a, b) => a.start - b.start || b.end - a.end || a.item.id.localeCompare(b.item.id));

  const placed: PlacedEvent<T>[] = [];
  let group: PlacedEvent<T>[] = [];
  let groupEnd = -1;
  let columnEnds: number[] = [];
  let groupIndex = 0;
  const closeGroup = () => {
    for (const event of group) event.columns = columnEnds.length;
    if (group.length) groupIndex += 1;
    group = [];
    columnEnds = [];
    groupEnd = -1;
  };

  for (const entry of timed) {
    if (group.length && entry.start >= groupEnd) closeGroup();
    let column = columnEnds.findIndex((end) => end <= entry.start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(entry.end);
    } else {
      columnEnds[column] = entry.end;
    }
    const event: PlacedEvent<T> = { ...entry, column, columns: 1, group: groupIndex };
    group.push(event);
    placed.push(event);
    groupEnd = Math.max(groupEnd, entry.end);
  }
  closeGroup();
  return placed;
}

/**
 * The hours the grid shows: the working day by default, stretched to hold any
 * appointment before or after it, so none is ever hidden off the grid.
 */
export function visibleHours(
  placed: { start: number; end: number }[],
  working: { from: number; to: number } = { from: 7, to: 20 }
) {
  let from = working.from;
  let to = working.to;
  for (const event of placed) {
    from = Math.min(from, Math.floor(event.start / 60));
    to = Math.max(to, Math.ceil(event.end / 60));
  }
  return { from: Math.max(0, from), to: Math.min(24, Math.max(to, from + 1)) };
}

/** « 09:30 » for minutes from midnight; 1440 reads « 24:00 ». */
export function clock(minutes: number) {
  const m = Math.max(0, Math.min(DAY_MINUTES, Math.round(minutes)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** The slot under a click: minutes from midnight, snapped down to `step`, kept on the grid. */
export function slotAt(offsetPx: number, hourPx: number, fromHour: number, toHour: number, step = 30) {
  const raw = fromHour * 60 + (offsetPx / hourPx) * 60;
  const snapped = Math.floor(raw / step) * step;
  return Math.max(fromHour * 60, Math.min(toHour * 60 - step, snapped));
}

/**
 * The height of an hour so that every shown hour fits in `availablePx`, kept between a
 * floor that still leaves room to read a block and the comfortable height of a lighter day.
 */
export function fitHourPx(availablePx: number, hours: number, min: number, max: number) {
  if (hours <= 0) return max;
  return Math.max(min, Math.min(max, Math.floor(availablePx / hours)));
}

/* ------------------------------------------------------------ Elastic time axis */

export interface GridBlock<T extends TimedItem> {
  item: T;
  start: number;
  /** The real end of the appointment, not the grouping one. */
  end: number;
  /** Pixels from the top of the grid. */
  top: number;
  height: number;
  column: number;
  columns: number;
  /** True when the block is one of a crowded group, stacked one line under the other. */
  stacked: boolean;
}

export interface TimeGridLayout<T extends TimedItem> {
  /** Height of each shown hour: the base, grown where appointments crowd it. */
  heights: number[];
  /** Top of each shown hour, then the bottom of the last one. */
  offsets: number[];
  total: number;
  /** The blocks of each day, in the order of the days given. */
  days: GridBlock<T>[][];
  /** Pixels from the top of the grid for minutes from midnight. */
  yAt: (minutes: number) => number;
  /** Minutes from midnight at a pixel offset from the top of the grid. */
  minuteAt: (px: number) => number;
}

/** A crowded group, drawn one line per appointment: the line and its gap. */
export const ROW_PX = 28;
/** Past this many side-by-side columns a group is stacked instead, so no block is squeezed. */
export const MAX_LANES = 2;

/**
 * Lays the days out on one shared time axis. A group of overlapping appointments with at
 * most `maxLanes` columns stays side by side. A more crowded group is stacked, one full
 * line each, and the hours it covers grow to hold the stack: ten appointments between
 * 13:00 and 14:00 make that hour tall enough for the ten, and the other days of a week
 * share that taller hour. Nothing is hidden, clipped or squeezed.
 */
export function layoutTimeGrid<T extends TimedItem>(
  days: PlacedEvent<T>[][],
  options: { fromHour: number; toHour: number; hourPx: number; rowPx?: number; minBlockPx?: number; maxLanes?: number }
): TimeGridLayout<T> {
  const { fromHour, toHour, hourPx } = options;
  const rowPx = options.rowPx ?? ROW_PX;
  const minBlockPx = options.minBlockPx ?? 24;
  const maxLanes = options.maxLanes ?? MAX_LANES;
  const count = Math.max(1, toHour - fromHour);
  const heights = Array.from({ length: count }, () => hourPx);

  const offsetsOf = () => {
    const out = [0];
    for (const h of heights) out.push(out[out.length - 1] + h);
    return out;
  };
  const yWith = (offsets: number[], minutes: number) => {
    const rel = Math.max(0, Math.min(count, minutes / 60 - fromHour));
    const i = Math.min(count - 1, Math.floor(rel));
    return offsets[i] + (rel - i) * heights[i];
  };

  // The crowded groups of every day, with the room their stack needs.
  const crowded: { start: number; end: number; needed: number }[] = [];
  for (const placed of days) {
    const byGroup = new Map<number, PlacedEvent<T>[]>();
    for (const event of placed) byGroup.set(event.group, [...(byGroup.get(event.group) ?? []), event]);
    for (const group of byGroup.values()) {
      if (group[0].columns <= maxLanes) continue;
      crowded.push({
        start: Math.min(...group.map((e) => e.start)),
        end: Math.max(...group.map((e) => e.end)),
        needed: group.length * rowPx,
      });
    }
  }
  // Growing hours only widens the span of every other group, so one pass settles them all.
  for (const group of crowded.sort((a, b) => a.start - b.start)) {
    const offsets = offsetsOf();
    const shortage = group.needed - (yWith(offsets, group.end) - yWith(offsets, group.start));
    if (shortage <= 0) continue;
    const grow = (shortage * 60) / (group.end - group.start);
    const first = Math.max(0, Math.floor(group.start / 60) - fromHour);
    const last = Math.min(count - 1, Math.ceil(group.end / 60) - 1 - fromHour);
    for (let h = first; h <= last; h += 1) heights[h] += grow;
  }

  const offsets = offsetsOf();
  const yAt = (minutes: number) => yWith(offsets, minutes);
  const blocks = days.map((placed) => {
    const byGroup = new Map<number, PlacedEvent<T>[]>();
    for (const event of placed) byGroup.set(event.group, [...(byGroup.get(event.group) ?? []), event]);
    const out: GridBlock<T>[] = [];
    for (const group of byGroup.values()) {
      if (group[0].columns > maxLanes) {
        const groupStart = Math.min(...group.map((e) => e.start));
        const ordered = [...group].sort((a, b) => a.start - b.start || a.item.id.localeCompare(b.item.id));
        ordered.forEach((event, i) =>
          out.push({ item: event.item, start: event.start, end: event.realEnd, top: yAt(groupStart) + i * rowPx, height: rowPx - 2, column: 0, columns: 1, stacked: true })
        );
      } else {
        for (const event of group) {
          const top = yAt(event.start);
          out.push({ item: event.item, start: event.start, end: event.realEnd, top, height: Math.max(yAt(event.realEnd) - top, minBlockPx) - 2, column: event.column, columns: event.columns, stacked: false });
        }
      }
    }
    return out;
  });

  const minuteAt = (px: number) => {
    const y = Math.max(0, Math.min(offsets[count], px));
    let i = 0;
    while (i < count - 1 && y >= offsets[i + 1]) i += 1;
    return (fromHour + i) * 60 + ((y - offsets[i]) / heights[i]) * 60;
  };
  return { heights, offsets, total: offsets[count], days: blocks, yAt, minuteAt };
}
