import { occupancySummary, type OccupancyState } from "./occupancy";
import type { Stay, StayLocation } from "./store";

const STATE_LABEL: Record<OccupancyState, string> = {
  occupied: "Occupée",
  leaving: "Sortie prévue sous 24 h",
  free: "Libre",
};

/**
 * Capacity at a glance: one unit per active location, then the forecast that
 * planned discharges support.
 */
export function OccupancyUnits({ compact = false, locations, stays }: {
  /** Inside another card (the dashboard's Hospitalisés): no card of its own. */
  compact?: boolean;
  locations: StayLocation[];
  stays: Stay[];
}) {
  const summary = occupancySummary(locations, stays, new Date());
  if (!summary.total) return null;
  const states = (["occupied", "leaving", "free"] as const).filter((state) =>
    summary.units.some((unit) => unit.state === state),
  );
  return (
    <section
      aria-label="Capacité d’hospitalisation"
      className={compact ? "stay-occupancy stay-occupancy-compact" : "stay-occupancy"}
    >
      <p className="stay-occupancy-head">
        <strong>{summary.occupied}</strong>
        <span>
          sur {summary.total} place{summary.total > 1 ? "s" : ""} occupée{summary.occupied > 1 ? "s" : ""}
        </span>
      </p>
      <div
        aria-label={`${summary.occupied} place${summary.occupied > 1 ? "s" : ""} occupée${summary.occupied > 1 ? "s" : ""} sur ${summary.total}`}
        className="stay-occupancy-units"
        role="img"
      >
        {summary.units.map((unit) => (
          <span data-state={unit.state} key={unit.id} title={`${unit.name} · ${STATE_LABEL[unit.state]}`} />
        ))}
      </div>
      <ul aria-hidden="true" className="stay-occupancy-legend">
        {states.map((state) => (
          <li data-state={state} key={state}>
            <i />
            {STATE_LABEL[state]}
          </li>
        ))}
      </ul>
      {summary.forecast ? <p className="stay-occupancy-forecast">{summary.forecast}</p> : null}
    </section>
  );
}
