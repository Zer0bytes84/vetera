import {
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VitalSign } from "./store";
import { referenceRange } from "./vitals-summary";

const metrics = [
  { key: "temperature_c", label: "Température", unit: "°C" },
  { key: "heart_rate", label: "Fréquence cardiaque", unit: "/min" },
  { key: "respiratory_rate", label: "Fréquence respiratoire", unit: "/min" },
  { key: "weight_kg", label: "Poids", unit: "kg" },
] as const;
export function VitalsCurves({
  vitals,
  species = "",
}: {
  vitals: VitalSign[];
  species?: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {metrics.map((metric) => {
        const data = vitals
          .filter((vital) => vital[metric.key] !== null)
          .map((vital) => ({
            time: new Date(vital.recorded_at).getTime(),
            value: vital[metric.key],
          }));
        if (!data.length) {
          return null;
        }
        // The species resting reference, shaded behind the curve when one is recorded.
        const range = referenceRange(species, metric.key);
        return (
          <figure className="min-w-0 rounded-xl border p-4" key={metric.key}>
            <figcaption className="t-13 font-medium">
              {metric.label} ({metric.unit})
              {range && (
                <span className="ml-2 font-normal text-muted-foreground">
                  bande verte : repère de l’espèce
                </span>
              )}
            </figcaption>
            <div
              aria-label={`${metric.label} : ${data.length} mesure(s)`}
              className="mt-3 h-36"
              role="img"
            >
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={data}>
                  <XAxis
                    dataKey="time"
                    minTickGap={30}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(time) =>
                      new Date(time).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 12 }}
                    width={40}
                  />
                  <Tooltip
                    labelFormatter={(time) =>
                      new Date(Number(time)).toLocaleString("fr-FR")
                    }
                  />
                  {range && (
                    <ReferenceArea
                      fill="var(--signal-positive)"
                      fillOpacity={0.08}
                      ifOverflow="extendDomain"
                      stroke="none"
                      y1={range[0]}
                      y2={range[1]}
                    />
                  )}
                  <Line
                    dataKey="value"
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                    name={metric.label}
                    stroke="var(--primary)"
                    strokeWidth={1.5}
                    type="linear"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </figure>
        );
      })}
    </div>
  );
}
