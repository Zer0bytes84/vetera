import { ACTIVE_STAY_STATUSES } from "./domain";
import type { Stay, StayLocation } from "./store";

export type OccupancyState = "occupied" | "leaving" | "free";

export interface OccupancyUnit {
  id: string;
  name: string;
  state: OccupancyState;
}

export interface OccupancySummary {
  units: OccupancyUnit[];
  total: number;
  occupied: number;
  free: number;
  /** Said only when planned discharges back it; never guessed. */
  forecast: string | null;
}

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayLabel(date: Date, now: Date) {
  const days = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY);
  if (days === 0) return "aujourd’hui";
  if (days === 1) return "demain";
  return `le ${date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}`;
}

/**
 * Hospital capacity as units: one per active location, occupied when an
 * active stay sits in it, "leaving" when that stay's planned discharge falls
 * within the next 24 hours. The forecast names the next day with planned
 * discharges and the free places it leaves; with none planned, it says nothing.
 */
export function occupancySummary(locations: StayLocation[], stays: Stay[], now: Date): OccupancySummary {
  const active = stays.filter((stay) => ACTIVE_STAY_STATUSES.includes(stay.status));
  const units = locations
    .filter((location) => location.active)
    .map((location): OccupancyUnit => {
      const stay = active.find((candidate) => candidate.location_id === location.id);
      if (!stay) return { id: location.id, name: location.name, state: "free" };
      const discharge = stay.planned_discharge_at ? new Date(stay.planned_discharge_at) : null;
      const leaving = Boolean(discharge && discharge.getTime() >= now.getTime() && discharge.getTime() - now.getTime() <= DAY);
      return { id: location.id, name: location.name, state: leaving ? "leaving" : "occupied" };
    });
  const occupied = units.filter((unit) => unit.state !== "free").length;
  const free = units.length - occupied;

  const unitIds = new Set(units.map((unit) => unit.id));
  const upcoming = active
    .filter((stay) => stay.location_id && unitIds.has(stay.location_id) && stay.planned_discharge_at)
    .map((stay) => new Date(stay.planned_discharge_at as string))
    .filter((date) => date.getTime() >= now.getTime())
    .sort((left, right) => left.getTime() - right.getTime());

  let forecast: string | null = null;
  if (upcoming.length) {
    const first = startOfDay(upcoming[0]).getTime();
    const sameDay = upcoming.filter((date) => startOfDay(date).getTime() === first).length;
    const after = free + sameDay;
    const exits = sameDay === 1 ? "Une sortie prévue" : `${sameDay} sorties prévues`;
    forecast = `${exits} ${dayLabel(upcoming[0], now)} : ${after} place${after > 1 ? "s" : ""} libre${after > 1 ? "s" : ""} sur ${units.length} ensuite.`;
  }

  return { units, total: units.length, occupied, free, forecast };
}
