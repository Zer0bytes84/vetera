import { useEffect, useMemo, useState } from "react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@/lib/hugeicons";
import { CalendarDays } from "@/lib/icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { COMPACT_CALENDAR_CLASS } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APPOINTMENT_TYPE_META, APPOINTMENT_STATUS_META, getAppointmentTypeMeta } from "@/config/status-meta";
import { useNowTick } from "@/hooks/useNowTick";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/db";
import { AgendaMonthCalendar } from "@/modules/agenda/components/agenda-month-calendar";
import { clock, fitHourPx, layoutDayEvents, layoutTimeGrid, visibleHours, type GridBlock } from "@/modules/agenda/model/agenda-layout";

export type CalendarView = "day" | "week" | "month";

/** One pixel row per hour: tall enough that a 20-minute visit still reads on one line. */
const HOUR_PX: Record<"day" | "week", number> = { day: 64, week: 52 };
/** Below this an hour cannot hold a readable block; the page scrolls rather than squeeze further. */
const MIN_HOUR_PX = 40;
/** Air above the first hour and under the last one: the first label sits on its own line like the others. */
const GRID_PAD_TOP = 14;
const GRID_PAD_BOTTOM = 10;
/** What the page keeps for everything around the grid: header, toolbar, legend, day headers. */
const CHROME_PX = 340;
/** A block is never drawn shorter than one full line of text, whatever the visit lasts. */
const MIN_BLOCK_PX = 24;
const TYPES = Object.keys(APPOINTMENT_TYPE_META) as Appointment["type"][];

const PREVIOUS = { day: "Jour précédent", week: "Semaine précédente", month: "Mois précédent" } as const;
const NEXT = { day: "Jour suivant", week: "Semaine suivante", month: "Mois suivant" } as const;

const sameDay = (left: Date, right: Date) => left.toDateString() === right.toDateString();

function shift(view: CalendarView, date: Date, direction: -1 | 1) {
  const next = new Date(date);
  if (view === "day") next.setDate(next.getDate() + direction);
  else if (view === "week") next.setDate(next.getDate() + 7 * direction);
  else {
    next.setDate(1);
    next.setMonth(next.getMonth() + direction);
  }
  return next;
}

function title(view: CalendarView, date: Date, weekDays: Date[]) {
  if (view === "day") return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (view === "month") return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const first = weekDays[0];
  const last = weekDays[weekDays.length - 1];
  const sameMonth = first.getMonth() === last.getMonth();
  const start = first.toLocaleDateString("fr-FR", sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" });
  return `${start} – ${last.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
}

/** The colour key: one swatch per appointment type, so the grid reads without opening a block. */
export function AgendaLegend({ className }: { className?: string }) {
  return (
    <ul aria-label="Types de rendez-vous" className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
      {TYPES.map((type) => (
        <li className="flex items-center gap-1.5 text-muted-foreground text-xs" key={type}>
          <span aria-hidden="true" className={cn("size-2.5 rounded-[3px]", APPOINTMENT_TYPE_META[type].dotClassName)} />
          {type}
        </li>
      ))}
    </ul>
  );
}

function EventBlock({
  block,
  compactWidth,
  patientName,
  selected,
  onSelect,
}: {
  block: GridBlock<Appointment>;
  compactWidth: boolean;
  patientName: string;
  selected: boolean;
  onSelect: (appointment: Appointment) => void;
}) {
  const { item, start, end, column, columns, top, height } = block;
  const meta = getAppointmentTypeMeta(item.type);
  const status = APPOINTMENT_STATUS_META[item.status]?.label;
  const range = `${clock(start)}–${clock(end)}`;
  const cancelled = item.status === "cancelled" || item.status === "no_show";
  // A short block keeps its one full line; room for a second line starts at about 46 px.
  const roomy = height >= 44 && !compactWidth && !block.stacked;
  const label = [`${range}`, patientName, item.type, item.title, status].filter(Boolean).join(", ");
  return (
    <button
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        "absolute overflow-hidden rounded-md border px-2 py-0 text-left text-foreground outline-none ring-1 ring-foreground/10 ring-inset transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
        meta.surfaceClassName,
        selected && "z-10 ring-2 ring-foreground",
        cancelled && "opacity-60"
      )}
      data-type={item.type}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item);
      }}
      style={{
        top,
        height,
        left: `calc(${(column / columns) * 100}% + 2px)`,
        width: `calc(${100 / columns}% - 4px)`,
      }}
      type="button"
    >
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", meta.dotClassName)} />
      <span className={cn("block truncate pl-1.5 font-medium text-[13px] leading-5", cancelled && "line-through")}>
        <span className="tabular-nums">{clock(start)}</span> {patientName}
      </span>
      {roomy ? (
        <span className="-mt-0.5 block truncate pl-1.5 text-muted-foreground text-xs leading-4">
          {range} · {item.type}
          {item.title ? ` · ${item.title}` : ""}
        </span>
      ) : null}
    </button>
  );
}

/**
 * The day or the week as an hour grid, after Outlook: a column per day, each
 * appointment a block from its start to its end coloured by type, overlapping
 * ones side by side, a line at the current time, a click on a free slot to book it.
 */
function TimeGrid({
  days,
  view,
  getAppointmentsForDate,
  getPatientName,
  selectedAppointmentId,
  selectedDate,
  onSelectAppointment,
  onSelectDay,
  onCreateAt,
}: {
  days: Date[];
  view: "day" | "week";
  getAppointmentsForDate: (date: Date) => Appointment[];
  getPatientName: (patientId: string) => string;
  selectedAppointmentId: string | null;
  selectedDate: Date;
  onSelectAppointment: (appointment: Appointment) => void;
  onSelectDay: (date: Date) => void;
  onCreateAt: (date: Date, time: string) => void;
}) {
  const now = useNowTick(60_000);
  const [viewportH, setViewportH] = useState(() => window.innerHeight);
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const maxHourPx = HOUR_PX[view];
  const minutesFor = (hourPx: number) => Math.ceil((MIN_BLOCK_PX / hourPx) * 60);
  const place = (hourPx: number) =>
    days.map((day) => ({ day, placed: layoutDayEvents(getAppointmentsForDate(day), day, minutesFor(hourPx)) }));
  // Every appointment of the days shown sets the hours: the grid runs from the first to the last,
  // and the hour is drawn only as tall as needed for all of them to fit the screen without a scroll.
  const first = useMemo(
    () => visibleHours(place(maxHourPx).flatMap((column) => column.placed)),
    // getAppointmentsForDate changes with the data, which is what must re-place the blocks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, getAppointmentsForDate, maxHourPx]
  );
  const hourPx = fitHourPx(viewportH - CHROME_PX, first.to - first.from, MIN_HOUR_PX, maxHourPx);
  const columns = useMemo(
    () => place(hourPx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, getAppointmentsForDate, hourPx]
  );
  // The taller minimum block can push a late end past the last hour: the grid follows it.
  const { from, to } = visibleHours(columns.flatMap((column) => column.placed));
  const hours = Array.from({ length: to - from }, (_, i) => from + i);
  // The hours grow where appointments crowd them, so every one shows in full; the days share the axis.
  const grid = useMemo(
    () => layoutTimeGrid(columns.map((column) => column.placed), { fromHour: from, toHour: to, hourPx, minBlockPx: MIN_BLOCK_PX, maxLanes: view === "day" ? 3 : 2 }),
    [columns, from, to, hourPx, view]
  );
  const gridHeight = grid.total;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const total = columns.reduce((sum, column) => sum + column.placed.length, 0);

  // The frame is not a .bg-card: the base stylesheet strips border, radius and fill from every
  // .bg-card with !important, which left only the header band rounded.
  return (
    <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-foreground/15">
      <div className="min-w-[640px]" style={{ minWidth: view === "week" ? 760 : 420 }}>
        {/* The column header: a band of its own in the system's selection grey (#F5F5F5, white at 5 % in dark),
            rounded at the top only, at the cards' radius (16 px, less the 1 px rule); square where it meets the grid. Its first cell
            is as wide as the hours column. */}
        <div className="flex min-h-11 rounded-t-[calc(var(--radius-panel)-1px)] border-foreground/15 border-b bg-[#F5F5F5] dark:bg-white/5">
          <div aria-hidden="true" className="w-14 shrink-0 border-foreground/10 border-r" />
          {columns.map(({ day, placed }) => {
            const today = sameDay(day, new Date());
            const picked = sameDay(day, selectedDate);
            return (
              <button
                aria-label={`${day.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}, ${placed.length === 0 ? "aucun rendez-vous" : `${placed.length} rendez-vous`}`}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-2 border-foreground/10 border-r px-2 py-2 outline-none last:border-r-0 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  picked && view === "week" && "bg-muted/60"
                )}
                key={day.toISOString()}
                onClick={() => onSelectDay(day)}
                type="button"
              >
                <span className="text-muted-foreground text-xs capitalize">
                  {day.toLocaleDateString("fr-FR", { weekday: view === "day" ? "long" : "short" })}
                </span>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full font-medium text-sm tabular-nums",
                    today && "bg-foreground text-background"
                  )}
                >
                  {day.getDate()}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">{placed.length > 0 ? `· ${placed.length}` : ""}</span>
              </button>
            );
          })}
        </div>

        <div className="flex" style={{ height: gridHeight + GRID_PAD_TOP + GRID_PAD_BOTTOM }}>
          <div aria-hidden="true" className="relative w-14 shrink-0 border-foreground/10 border-r">
            <div className="absolute inset-x-0" style={{ top: GRID_PAD_TOP, height: gridHeight }}>
              {hours.map((hour, i) => (
                <span
                  className="absolute right-3 -translate-y-1/2 text-muted-foreground text-xs tabular-nums"
                  key={hour}
                  style={{ top: grid.offsets[i] }}
                >
                  {clock(hour * 60)}
                </span>
              ))}
            </div>
          </div>
          {columns.map(({ day }, dayIndex) => {
            const today = sameDay(day, new Date());
            return (
              <div
                className={cn("relative min-w-0 flex-1 border-foreground/10 border-r last:border-r-0", today && "bg-muted/25")}
                key={day.toISOString()}
                onClick={(event) => {
                  const box = event.currentTarget.getBoundingClientRect();
                  // The slot under the click on the elastic axis, to the half hour below it.
                  const raw = Math.floor(grid.minuteAt(event.clientY - box.top - GRID_PAD_TOP) / 30) * 30;
                  onCreateAt(day, clock(Math.max(from * 60, Math.min(to * 60 - 30, raw))));
                }}
                role="presentation"
              >
                <div className="absolute inset-x-0" style={{ top: GRID_PAD_TOP, height: gridHeight }}>
                  {hours.map((hour, i) => (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 border-foreground/10 border-t"
                      key={hour}
                      style={{ top: grid.offsets[i] }}
                    />
                  ))}
                  {grid.days[dayIndex].map((block) => (
                    <EventBlock
                      block={block}
                      compactWidth={view === "week" && block.columns > 2}
                      key={block.item.id}
                      onSelect={onSelectAppointment}
                      patientName={getPatientName(block.item.patientId)}
                      selected={block.item.id === selectedAppointmentId}
                    />
                  ))}
                  {today && nowMinutes >= from * 60 && nowMinutes <= to * 60 ? (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 z-10 border-signal-critical border-t-2"
                      style={{ top: grid.yAt(nowMinutes) }}
                    >
                      <span className="-translate-y-1/2 -ml-1 absolute size-2 rounded-full bg-signal-critical" />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {total === 0 ? (
        <p className="border-border border-t px-4 py-3 text-center text-muted-foreground text-sm">
          {view === "day" ? "Aucun rendez-vous ce jour. Cliquez sur un créneau pour en ajouter un." : "Aucun rendez-vous cette semaine."}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The Agenda's calendar: day in close-up by default, the week, or the month, with
 * one colour per appointment type. A click on a free slot books it, a click on a
 * block selects the appointment, a click on a day header opens that day.
 */
export function AgendaCalendar({
  view,
  onViewChange,
  selectedDate,
  onSelectDate,
  weekDays,
  monthDays,
  getAppointmentsForDate,
  getPatientName,
  selectedAppointmentId,
  onSelectAppointment,
  onCreateAt,
}: {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  weekDays: Date[];
  monthDays: Array<Date | null>;
  getAppointmentsForDate: (date: Date) => Appointment[];
  getPatientName: (patientId: string) => string;
  selectedAppointmentId: string | null;
  onSelectAppointment: (appointment: Appointment) => void;
  onCreateAt: (date: Date, time: string) => void;
}) {
  const isToday = sameDay(selectedDate, new Date());
  const [jumpOpen, setJumpOpen] = useState(false);
  const days = useMemo(() => (view === "day" ? [selectedDate] : weekDays), [view, selectedDate, weekDays]);
  return (
    <section aria-label="Calendrier des rendez-vous" className="surface-card flex min-w-0 flex-col gap-3 rounded-panel border border-border bg-card p-3 sm:p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div aria-label="Navigation" className="flex items-center gap-1" role="group">
            <Button aria-label={PREVIOUS[view]} onClick={() => onSelectDate(shift(view, selectedDate, -1))} size="icon-sm" variant="ghost">
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.5} />
            </Button>
            <Button disabled={isToday && view === "day"} onClick={() => onSelectDate(new Date())} size="sm" variant="outline">
              Aujourd&apos;hui
            </Button>
            <Button aria-label={NEXT[view]} onClick={() => onSelectDate(shift(view, selectedDate, 1))} size="icon-sm" variant="ghost">
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} />
            </Button>
            {/* An icon only: a jump to any date, instead of stepping week by week. */}
            <Popover onOpenChange={setJumpOpen} open={jumpOpen}>
              <PopoverTrigger aria-label="Aller à une date" render={<Button size="icon-sm" type="button" variant="ghost" />}>
                <CalendarDays aria-hidden="true" className="size-4" strokeWidth={1.5} />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-2">
                <Calendar
                  className={COMPACT_CALENDAR_CLASS}
                  defaultMonth={selectedDate}
                  mode="single"
                  onSelect={(date) => {
                    if (!date) return;
                    onSelectDate(date);
                    setJumpOpen(false);
                  }}
                  selected={selectedDate}
                />
              </PopoverContent>
            </Popover>
          </div>
          <h2 className="truncate font-medium text-[18px] capitalize tracking-[-0.02em]">{title(view, selectedDate, weekDays)}</h2>
        </div>
        <Tabs onValueChange={(value) => onViewChange(value as CalendarView)} value={view}>
          <TabsList aria-label="Affichage du calendrier" tabsStyle="segmented">
            <TabsTrigger value="day">Jour</TabsTrigger>
            <TabsTrigger value="week">Semaine</TabsTrigger>
            <TabsTrigger value="month">Mois</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <AgendaLegend />

      {view === "month" ? (
        <AgendaMonthCalendar
          getAppointmentsForDate={getAppointmentsForDate}
          getPatientName={getPatientName}
          monthDays={monthDays}
          onSelectDate={onSelectDate}
          selectedDate={selectedDate}
          showHeader={false}
        />
      ) : (
        <TimeGrid
          days={days}
          getAppointmentsForDate={getAppointmentsForDate}
          getPatientName={getPatientName}
          onCreateAt={onCreateAt}
          onSelectAppointment={onSelectAppointment}
          onSelectDay={(date) => {
            onSelectDate(date);
            onViewChange("day");
          }}
          selectedAppointmentId={selectedAppointmentId}
          selectedDate={selectedDate}
          view={view}
        />
      )}
    </section>
  );
}
