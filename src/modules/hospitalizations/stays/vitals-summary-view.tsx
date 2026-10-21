import type { VitalSign } from "./store";
import { latestReadings, VITAL_METRICS, vitalsByDay, type Verdict } from "./vitals-summary";

const number = (value: number, digits: number) =>
  value.toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
/** "°C" and "kg" take a space, a rate such as "/min" does not. */
const withUnit = (value: string, unit: string) => (unit.startsWith("/") ? `${value}${unit}` : `${value} ${unit}`);
const clock = (value: string) =>
  new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const verdictWords: Record<Verdict, string> = {
  below: "sous le repère",
  within: "dans le repère",
  above: "au-dessus du repère",
};

/** The last value of each measure in words, against the species reference and the reading before. */
export function VitalsLatest({ vitals, species }: { vitals: VitalSign[]; species: string }) {
  const readings = latestReadings(species, vitals);
  if (!readings.length) return null;
  const animal = species ? species.toLocaleLowerCase("fr") : "l’espèce";
  return (
    <div className="vitals-latest">
      <h4 className="t-13 font-medium">Dernières valeurs</h4>
      <ul>
        {readings.map((reading) => (
          <li data-verdict={reading.verdict ?? "none"} key={reading.key}>
            <span className="vitals-latest-label">{reading.label}</span>
            <span className="vitals-latest-value">
              {withUnit(number(reading.value, reading.digits), reading.unit)}
            </span>
            <span className="vitals-latest-words">
              {reading.verdict && reading.range
                ? `${verdictWords[reading.verdict]} du ${animal} (${number(reading.range[0], reading.digits)} à ${withUnit(number(reading.range[1], reading.digits), reading.unit)})`
                : "pas de repère enregistré pour cette mesure"}
              {reading.change !== null && reading.previousAt
                ? reading.change === 0
                  ? ` · stable depuis ${clock(reading.previousAt)}`
                  : ` · ${reading.change > 0 ? "+" : "−"}${number(Math.abs(reading.change), reading.digits)} depuis ${clock(reading.previousAt)}`
                : ""}
              {` · relevé à ${clock(reading.at)}`}
            </span>
          </li>
        ))}
      </ul>
      <p className="t-12 text-muted-foreground">
        Repères au repos de l’adulte, à interpréter selon le contexte clinique.
      </p>
    </div>
  );
}

/** Lowest and highest value of each measure, one row per day. */
export function VitalsByDay({ vitals }: { vitals: VitalSign[] }) {
  const days = vitalsByDay(vitals);
  if (!days.length) return null;
  const metrics = VITAL_METRICS.filter(({ key }) => days.some((day) => day.ranges[key]));
  return (
    <div className="vitals-by-day overflow-x-auto">
      <table>
        <caption className="t-13 font-medium">Par jour, du plus bas au plus haut</caption>
        <thead>
          <tr>
            <th scope="col">Jour</th>
            {metrics.map((metric) => (
              <th key={metric.key} scope="col">
                {metric.label} ({metric.unit})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.day}>
              <td className="vitals-by-day-date">
                {new Date(`${day.day}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                <span>
                  {day.count} relevé{day.count > 1 ? "s" : ""}
                </span>
              </td>
              {metrics.map((metric) => {
                const range = day.ranges[metric.key];
                return (
                  <td key={metric.key}>
                    {range
                      ? range.min === range.max
                        ? number(range.min, metric.digits)
                        : `${number(range.min, metric.digits)} à ${number(range.max, metric.digits)}`
                      : "Non relevé"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
