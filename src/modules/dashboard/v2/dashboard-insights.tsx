import { useId, useState } from "react";
import { ChevronDown, Wallet } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { FittedAmount } from "@/shared/ui/fitted-amount";
import type { DashboardV2Props } from "./types";
import { buildDashboardInsights } from "./insights-model";
import { formatCurrency } from "./model";
import "./dashboard-insights.css";

const CLINICAL_PERIODS = [84, 182, 365] as const;
const periodLabel = (period: number) =>
  period === 84 ? "12 semaines" : period === 182 ? "6 mois" : "1 an";
const TYPE_LABELS: Record<string, string> = {
  Consultation: "Cons.",
  Urgence: "Urg.",
  Vaccin: "Vacc.",
  Contrôle: "Ctrl.",
  Chirurgie: "Chir.",
  "Non renseigné": "Autre",
};
const shortType = (label: string) =>
  TYPE_LABELS[label] ?? (label.length > 6 ? `${label.slice(0, 5)}…` : label);

/** Crisp stacked marks like the reference, with the last mark clipped to the true value. */
function SegmentedBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill = "currentColor",
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
}) {
  const step = 10;
  return (
    <g>
      {Array.from({ length: Math.ceil(height / step) }, (_, index) => {
        const segmentHeight = Math.min(6, height - index * step);
        return (
          <rect
            key={index}
            x={x}
            y={y + height - index * step - segmentHeight}
            width={width}
            height={segmentHeight}
            rx={1.5}
            fill={fill}
          />
        );
      })}
    </g>
  );
}

export function DashboardInsights({
  metrics,
  appointments,
  transactions,
}: Pick<DashboardV2Props, "metrics" | "appointments" | "transactions">) {
  const fillId = `cash-fill-${useId().replace(/:/g, "")}`;
  const [cashPeriod, setCashPeriod] = useState<3 | 6 | 12>(6);
  const [period, setPeriod] = useState<84 | 182 | 365>(182);
  const [selectedSlot, setSelectedSlot] = useState<{
    day: number;
    hour: number;
  } | null>(null);
  const insights = buildDashboardInsights(
    appointments,
    transactions,
    metrics.referenceDate,
    period
  );
  const total = insights.weekdays.reduce((sum, day) => sum + day.count, 0);
  const cashMonths = insights.months.slice(-cashPeriod);
  const cashIn = cashMonths.reduce((sum, month) => sum + month.income, 0);
  const cashOut = cashMonths.reduce((sum, month) => sum + month.expense, 0);
  const slots = insights.hours.flatMap((hour, hourIndex) =>
    hour.counts.map((count, day) => ({ count, day, hour: hourIndex }))
  );
  const peak = slots.reduce(
    (best, slot) => (slot.count > best.count ? slot : best),
    slots[0]
  );
  const selected = selectedSlot
    ? slots.find(
        (slot) =>
          slot.day === selectedSlot.day && slot.hour === selectedSlot.hour
      )
    : peak;
  const maxHour = Math.max(1, peak.count);
  const level = (count: number) =>
    count === 0 ? 0 : Math.max(1, Math.ceil((count / maxHour) * 4));
  const leadingType = insights.types[0];
  // Keep this compact even when custom visit types have been added.
  const chartTypes =
    insights.types.length > 5
      ? [
          ...insights.types.slice(0, 4),
          {
            label: "Autres",
            count: insights.types
              .slice(4)
              .reduce((sum, type) => sum + type.count, 0),
          },
        ]
      : insights.types;
  const cashRange = `${cashMonths[0].fullLabel} — ${cashMonths[cashMonths.length - 1].fullLabel}`;

  const clinicalPeriodSelect = (label: string) => (
    <div className="insight-period">
      <select
        aria-label={label}
        value={period}
        onChange={(event) => {
          setPeriod(Number(event.target.value) as 84 | 182 | 365);
          setSelectedSlot(null);
        }}
      >
        {CLINICAL_PERIODS.map((value) => (
          <option key={value} value={value}>
            {value === 84 ? "12 sem." : periodLabel(value)}
          </option>
        ))}
      </select>
      <ChevronDown size={13} aria-hidden="true" />
    </div>
  );

  return (
    <div className="dashboard-insights">
      <div className="insights-grid">
        <section
          className="studio-panel insight-card insights-cash"
          aria-label="Encaissements et dépenses"
        >
          <div className="insight-surface">
            <header className="insight-heading">
              <h2>Encaissements & dépenses</h2>
              <div className="insight-period">
                <select
                  aria-label="Période des flux financiers"
                  value={cashPeriod}
                  onChange={(event) =>
                    setCashPeriod(Number(event.target.value) as 3 | 6 | 12)
                  }
                >
                  {[3, 6, 12].map((value) => (
                    <option key={value} value={value}>
                      {value} mois
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} aria-hidden="true" />
              </div>
            </header>
            <div className="insight-metric">
              <span className="insight-label">Encaissements</span>
              <FittedAmount
                className="insight-amount"
                value={formatCurrency(cashIn)}
                maxFontSize={36}
              />
              <div className="insight-secondary">
                <span>Dépenses réglées</span>
                <strong>{formatCurrency(cashOut)}</strong>
              </div>
            </div>
            <div className="insight-visual insight-cash-visual">
              <div className="insight-chart-legend">
                <span>
                  <i className="insight-dot" />
                  Encaissements
                </span>
                <span>
                  <i className="insight-dot insight-dot-expense" />
                  Dépenses
                </span>
              </div>
              {cashIn > 0 || cashOut > 0 ? (
                <ChartContainer
                  config={{
                    income: {
                      label: "Encaissements",
                      color: "var(--insight-purple)",
                    },
                    expense: {
                      label: "Dépenses",
                      color: "var(--insight-orange)",
                    },
                  }}
                  className="insight-cash-chart"
                  initialDimension={{ width: 320, height: 180 }}
                >
                  <AreaChart
                    accessibilityLayer
                    data={cashMonths}
                    margin={{ left: 0, right: 8, top: 12, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="var(--color-income)"
                          stopOpacity={0.14}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--color-income)"
                          stopOpacity={0.01}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 5" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      minTickGap={12}
                      height={28}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={36}
                      tickCount={4}
                      tickFormatter={(value) =>
                        value >= 1000
                          ? `${Math.round(value / 1000)}k`
                          : String(value)
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_, payload) =>
                            payload[0]?.payload.fullLabel
                          }
                          formatter={(value, name) => (
                            <span>
                              {name === "income" ? "Encaissements" : "Dépenses"}{" "}
                              : {formatCurrency(Number(value))}
                            </span>
                          )}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="var(--color-income)"
                      strokeWidth={2}
                      fill={`url(#${fillId})`}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      stroke="var(--color-expense)"
                      strokeWidth={2}
                      fill="transparent"
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="insight-cash-empty">
                  <Wallet size={24} strokeWidth={1.5} aria-hidden="true" />
                  <strong>Aucun règlement sur cette période</strong>
                  <span>Les montants réglés apparaîtront ici.</span>
                </div>
              )}
            </div>
            <footer className="insight-footer">
              <span title={cashRange}>
                {cashRange}
                <small>
                  Mois en cours partiel · hors paiements en attente.
                </small>
              </span>
            </footer>
          </div>
        </section>

        <section
          className="studio-panel insight-card insights-affluence"
          aria-label="Affluence des rendez-vous"
        >
          <div className="insight-surface">
            <header className="insight-heading">
              <h2>Affluence des rendez-vous</h2>
              {clinicalPeriodSelect("Période des rendez-vous")}
            </header>
            <div className="insight-metric">
              <span className="insight-label">Rendez-vous enregistrés</span>
              <div className="insight-count">
                <strong>{total.toLocaleString("fr-FR")}</strong>
                <span>sur {period} jours</span>
              </div>
              <div className="insight-secondary">
                <span>Heures de pointe du cabinet</span>
                <span>Jour × heure</span>
              </div>
            </div>
            <div className="insight-visual insight-heatmap-visual">
              <div className="insight-heatmap-scroll">
                <div className="insight-heatmap">
                  <span />
                  {insights.hours.map((hour, index) => (
                    <span
                      className="insight-hour"
                      title={hour.label}
                      key={hour.label}
                    >
                      {index === 0 ? "<8" : index === 11 ? "18+" : index + 7}
                    </span>
                  ))}
                  {insights.weekdays.map((day, dayIndex) => (
                    <div className="insight-heatmap-row" key={day.label}>
                      <span className="insight-day">{day.label}</span>
                      {insights.hours.map((hour, hourIndex) => (
                        <button
                          type="button"
                          key={hour.label}
                          data-level={level(hour.counts[dayIndex])}
                          aria-pressed={
                            selectedSlot?.day === dayIndex &&
                            selectedSlot.hour === hourIndex
                          }
                          title={`${day.label} ${hour.label} : ${hour.counts[dayIndex]} rendez-vous`}
                          aria-label={`${day.label} ${hour.label} : ${hour.counts[dayIndex]} rendez-vous`}
                          onClick={() =>
                            setSelectedSlot({ day: dayIndex, hour: hourIndex })
                          }
                        >
                          <span className="sr-only">
                            {hour.counts[dayIndex]}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="insight-heatmap-legend">
                <span>Moins</span>
                {[0, 1, 2, 3, 4].map((value) => (
                  <i key={value} data-level={value} />
                ))}
                <span>Plus</span>
              </div>
            </div>
            <footer className="insight-footer insight-slot" aria-live="polite">
              {selected && (
                <>
                  <span>
                    {total
                      ? `${insights.weekdays[selected.day].label} · ${insights.hours[selected.hour].label}`
                      : "Aucun rendez-vous"}
                    <small>
                      {selectedSlot
                        ? "Créneau sélectionné"
                        : "Créneau le plus fréquent"}
                    </small>
                  </span>
                  <strong>
                    {selected.count}
                    <small>rendez-vous</small>
                  </strong>
                </>
              )}
            </footer>
          </div>
        </section>

        <section
          className="studio-panel insight-card insights-types"
          aria-label="Répartition des actes"
        >
          <div className="insight-surface">
            <header className="insight-heading">
              <h2>Répartition des actes</h2>
              {clinicalPeriodSelect("Période de la répartition des actes")}
            </header>
            <div className="insight-metric">
              <span className="insight-label">Types de visites</span>
              <div className="insight-count">
                <strong>{total.toLocaleString("fr-FR")}</strong>
                <span>rendez-vous</span>
              </div>
              <div className="insight-secondary">
                <span>Hors annulations et absences</span>
                <span>{periodLabel(period)}</span>
              </div>
            </div>
            <div className="insight-visual insight-types-visual">
              {total > 0 ? (
                <ChartContainer
                  config={{ count: { label: "Rendez-vous", color: "#30c5ea" } }}
                  className="insight-types-chart"
                  initialDimension={{ width: 320, height: 208 }}
                >
                  <BarChart
                    accessibilityLayer
                    data={chartTypes}
                    margin={{ left: -20, right: 2, top: 22, bottom: 0 }}
                    barCategoryGap="24%"
                  >
                    <XAxis
                      type="category"
                      dataKey="label"
                      tickFormatter={shortType}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      tickMargin={12}
                      height={30}
                    />
                    <YAxis
                      type="number"
                      domain={[0, "dataMax"]}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      tickCount={4}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(value) => `${value} rendez-vous`}
                        />
                      }
                    />
                    <Bar
                      dataKey="count"
                      maxBarSize={34}
                      shape={<SegmentedBar />}
                      isAnimationActive={false}
                    >
                      {chartTypes.map((type, index) => (
                        <Cell
                          key={type.label}
                          fill={index === 0 ? "var(--color-count)" : "#8ba4ad"}
                        />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="top"
                        offset={8}
                        className="insight-bar-value"
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="insight-chart-empty">
                  Aucun rendez-vous sur cette période.
                </div>
              )}
            </div>
            <footer className="insight-footer">
              <span>
                {leadingType?.label ?? "Les actes apparaîtront ici"}
                <small>
                  {leadingType
                    ? `${leadingType.count} rendez-vous · type le plus fréquent`
                    : "Même période que l’affluence."}
                </small>
              </span>
              {leadingType && (
                <strong>
                  {Math.round((leadingType.count / total) * 100)}
                  <small>% des visites</small>
                </strong>
              )}
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}
