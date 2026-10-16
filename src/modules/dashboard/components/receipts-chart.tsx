import { formatDinars } from "@/utils/display-format";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "framer-motion";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { FittedAmount } from "@/shared/ui/fitted-amount";
import type { ReceiptsBucket } from "../v2/receipts-series";
import { useIsPremium } from "../v2/use-is-premium";
import { SettleMetricFooter } from "../v2/settle-widgets";
import "./receipts-chart.css";

const money = formatDinars;

const config = {
  invoices: { label: "Factures encaissées", color: "var(--receipts-invoices)" },
  manual: { label: "Hors facture encaissée", color: "var(--receipts-manual)" },
};

function RoundedBarShape(props: {
  fill: string;
  isTop?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  const { fill, isTop, x = 0, y = 0, width = 0, height = 0 } = props;
  if (!height || height <= 0 || !width || width <= 0) return null;
  const r = isTop ? Math.min(4, width / 2, height) : 0;
  if (r <= 0) {
    return <rect x={x} y={y} width={width} height={height} fill={fill} />;
  }
  return (
    <path
      d={`M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`}
      fill={fill}
    />
  );
}

export function ReceiptsChart({
  data,
  total,
  collected,
  unavailable,
}: {
  data: ReceiptsBucket[];
  total: number;
  collected: number;
  unavailable: boolean;
}) {
  const isPremium = useIsPremium();
  const reducedMotion = useReducedMotion();

  const invoicesTotal = data.reduce((sum, row) => sum + row.invoices, 0);
  const manualTotal = data.reduce((sum, row) => sum + row.manual, 0);

  const rate =
    total > 0
      ? Math.min(total > collected ? 99 : 100, Math.round((collected / total) * 100))
      : null;

  const maxMonthTotal = Math.max(
    ...data.map((row) => row.invoices + row.manual),
    1000
  );

  if (isPremium) {
    return (
      <div className="flex flex-1 flex-col justify-between">
        {/* Légende interactive Settle & Taux d’encaissement */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-6 items-center gap-1.5 rounded-[7px] px-2 text-[11.5px] bg-black/[0.04] dark:bg-white/[0.06]">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-neutral-600 dark:text-neutral-300">Factures encaissées</span>
              <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 ml-1">
                {unavailable ? "-" : money(invoicesTotal)}
              </span>
            </div>
            <div className="inline-flex h-6 items-center gap-1.5 rounded-[7px] px-2 text-[11.5px] bg-black/[0.04] dark:bg-white/[0.06]">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-neutral-600 dark:text-neutral-300">Hors facture</span>
              <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 ml-1">
                {unavailable ? "-" : money(manualTotal)}
              </span>
            </div>
          </div>
          {rate !== null && !unavailable && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[7px] text-[11.5px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/[0.12] dark:text-emerald-300 tabular-nums">
              {rate} % encaissé
            </span>
          )}
        </div>

        {/* Graphique courbe fluide Settle Area */}
        {unavailable || total <= 0 ? (
          <div className="h-[210px] grid place-items-center text-xs text-neutral-400" role="status">
            {unavailable
              ? "Le graphique sera disponible après actualisation."
              : "Aucune recette sur cette période."}
          </div>
        ) : (
          <div className="w-full h-[230px]">
            <ChartContainer
              config={config}
              className="w-full h-full"
              initialDimension={{ width: 600, height: 230 }}
              aria-label="Évolution des recettes : factures encaissées et recettes hors facture"
            >
              <ComposedChart
                data={data}
                accessibilityLayer
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="settleAreaEmerald" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.22} />
                    <stop offset="55%" stopColor="#10b981" stopOpacity={0.07} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="settleAreaRose" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.12} />
                    <stop offset="55%" stopColor="#fb7185" stopOpacity={0.03} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="currentColor"
                  strokeDasharray="2 4"
                  strokeOpacity={0.12}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "currentColor", fontSize: 11, opacity: 0.55 }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  minTickGap={14}
                  height={26}
                />
                <YAxis
                  tick={{ fill: "currentColor", fontSize: 11, opacity: 0.55 }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={6}
                  width={60}
                  domain={[0, Math.ceil(maxMonthTotal * 1.15)]}
                  tickCount={4}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("fr-FR", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(v)
                  }
                />
                <ChartTooltip
                  cursor={{ stroke: "currentColor", strokeWidth: 1, strokeDasharray: "3 3", strokeOpacity: 0.2 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as ReceiptsBucket;
                    const rowTotal = row.invoices + row.manual;
                    return (
                      <div className="rounded-[10px] border border-black/[0.08] bg-white p-2.5 shadow-md dark:border-white/[0.12] dark:bg-neutral-900 text-xs">
                        <strong className="block text-neutral-900 dark:text-neutral-100 font-semibold mb-1.5">
                          {row.detail}
                        </strong>
                        <div className="flex items-center justify-between gap-4 py-0.5 text-neutral-600 dark:text-neutral-400">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Factures
                          </span>
                          <b className="tabular-nums font-medium text-neutral-900 dark:text-neutral-100">
                            {money(row.invoices)}
                          </b>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-0.5 text-neutral-600 dark:text-neutral-400">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            Hors facture
                          </span>
                          <b className="tabular-nums font-medium text-neutral-900 dark:text-neutral-100">
                            {money(row.manual)}
                          </b>
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-4 font-semibold text-neutral-900 dark:text-neutral-100">
                          <span>Total</span>
                          <b className="tabular-nums">{money(rowTotal)}</b>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="invoices"
                  name="Factures encaissées"
                  stroke="#10b981"
                  fill="url(#settleAreaEmerald)"
                  strokeWidth={1.75}
                  dot={false}
                  activeDot={{ r: 4, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
                  isAnimationActive={!reducedMotion}
                />
                <Area
                  type="monotone"
                  dataKey="manual"
                  name="Hors facture"
                  stroke="#fb7185"
                  fill="url(#settleAreaRose)"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4, fill: "#fb7185", stroke: "#ffffff", strokeWidth: 2 }}
                  isAnimationActive={!reducedMotion}
                />
              </ComposedChart>
            </ChartContainer>
          </div>
        )}

        {/* Pied de métriques Settle à 4 colonnes divisées */}
        <div className="mt-3">
          <SettleMetricFooter
            metrics={[
              {
                label: "Taux encaissé",
                value: unavailable || rate === null ? "-" : `${rate} %`,
                caption: "encaissé ÷ facturé",
              },
              {
                label: "Factures réglées",
                value: unavailable ? "-" : money(invoicesTotal),
                caption: "sur facturation",
              },
              {
                label: "Hors facture",
                value: unavailable ? "-" : money(manualTotal),
                caption: "recettes directes",
              },
              {
                label: "Total net",
                value: unavailable ? "-" : money(total),
                caption: "sur la période",
              },
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="receipts-analytics">
      {/* 1. Header épuré : Recettes nettes et taux d’encaissement */}
      <div className="receipts-hero-zone">
        <div className="receipts-hero-primary">
          <span className="receipts-hero-caption">Recettes nettes</span>
          <div className="receipts-hero-amount-wrapper">
            <FittedAmount
              value={unavailable ? "-" : money(total)}
              maxFontSize={32}
              className="receipts-hero-number"
            />
            {rate !== null && !unavailable && (
              <span className="receipts-rate-pill">{rate} % encaissé</span>
            )}
          </div>
        </div>


      </div>

      {/* 3. Légende discrète sous le Hero */}
      <div className="receipts-subtle-legend" aria-label="Sous-totaux des encaissements">
        <div className="receipts-legend-item">
          <i className="receipts-dot-invoices" aria-hidden="true" />
          <span className="receipts-legend-text">Factures encaissées</span>
          <strong className="receipts-legend-val">
            {unavailable ? "-" : money(invoicesTotal)}
          </strong>
        </div>
        <div className="receipts-legend-item">
          <i className="receipts-dot-manual" aria-hidden="true" />
          <span className="receipts-legend-text">Hors facture</span>
          <strong className="receipts-legend-val">
            {unavailable ? "-" : money(manualTotal)}
          </strong>
        </div>
      </div>

      {/* 4. Graphique en barres verticales à deux tons de bleu contrastés */}
      {unavailable || total <= 0 ? (
        <div className="receipts-chart-empty" role="status">
          {unavailable
            ? "Le graphique sera disponible après actualisation."
            : "Aucune recette sur cette période."}
        </div>
      ) : (
        <ChartContainer
          config={config}
          className="receipts-chart"
          initialDimension={{ width: 600, height: 180 }}
          aria-label="Évolution des recettes : factures encaissées et recettes hors facture"
        >
          {isPremium ? (
            <ComposedChart
              data={data}
              accessibilityLayer
              margin={{ top: 12, right: 12, bottom: 0, left: 2 }}
            >
              <defs>
                <linearGradient id="settleInvoicesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="settleManualFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 5"
                opacity={0.35}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--analysis-muted, #737373)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                minTickGap={14}
                height={26}
              />
              <YAxis
                tick={{ fill: "var(--analysis-muted, #737373)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickMargin={6}
                width={54}
                domain={[0, Math.ceil(maxMonthTotal * 1.15)]}
                tickCount={4}
                tickFormatter={(v) =>
                  new Intl.NumberFormat("fr-FR", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(v)
                }
              />
              <ChartTooltip
                cursor={{ stroke: "rgba(0,0,0,0.12)", strokeWidth: 1, strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as ReceiptsBucket;
                  const rowTotal = row.invoices + row.manual;
                  return (
                    <div className="receipts-tooltip">
                      <strong>{row.detail}</strong>
                      <div className="receipts-tooltip-line">
                        <span>
                          <i style={{ background: "#2563eb" }} />
                          Factures encaissées
                        </span>
                        <b>{money(row.invoices)}</b>
                      </div>
                      <div className="receipts-tooltip-line">
                        <span>
                          <i style={{ background: "#60a5fa" }} />
                          Hors facture
                        </span>
                        <b>{money(row.manual)}</b>
                      </div>
                      <div className="receipts-tooltip-total">
                        <span>Total encaissé</span>
                        <b>{money(rowTotal)}</b>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="invoices"
                name="Factures encaissées"
                stroke="#2563eb"
                fill="url(#settleInvoicesFill)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 2 }}
                isAnimationActive={!reducedMotion}
              />
              <Area
                type="monotone"
                dataKey="manual"
                name="Hors facture"
                stroke="#60a5fa"
                fill="url(#settleManualFill)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#60a5fa", stroke: "#ffffff", strokeWidth: 2 }}
                isAnimationActive={!reducedMotion}
              />
            </ComposedChart>
          ) : (
            <BarChart
              data={data}
              accessibilityLayer
              margin={{ top: 12, right: 12, bottom: 0, left: 2 }}
              barSize={18}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 5"
                opacity={0.6}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--analysis-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickMargin={9}
                minTickGap={12}
                height={30}
              />
              <YAxis
                tick={{ fill: "var(--analysis-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickMargin={6}
                width={54}
                domain={[0, Math.ceil(maxMonthTotal * 1.15)]}
                tickCount={4}
                tickFormatter={(v) =>
                  new Intl.NumberFormat("fr-FR", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(v)
                }
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.18, rx: 4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as ReceiptsBucket;
                  const rowTotal = row.invoices + row.manual;
                  return (
                    <div className="receipts-tooltip">
                      <strong>{row.detail}</strong>
                      <div className="receipts-tooltip-line">
                        <span>
                          <i style={{ background: "var(--receipts-invoices)" }} />
                          Factures encaissées
                        </span>
                        <b>{money(row.invoices)}</b>
                      </div>
                      <div className="receipts-tooltip-line">
                        <span>
                          <i style={{ background: "var(--receipts-manual)" }} />
                          Hors facture
                        </span>
                        <b>{money(row.manual)}</b>
                      </div>
                      <div className="receipts-tooltip-total">
                        <span>Total encaissé</span>
                        <b>{money(rowTotal)}</b>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="invoices"
                name="Factures encaissées"
                stackId="receipts"
                fill="var(--receipts-invoices)"
                shape={(shapeProps: { payload?: ReceiptsBucket; x?: number; y?: number; width?: number; height?: number }) => {
                  const { payload, x, y, width, height } = shapeProps;
                  const isTop = !payload?.manual || payload.manual <= 0;
                  return (
                    <RoundedBarShape
                      fill="var(--receipts-invoices)"
                      isTop={isTop}
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                    />
                  );
                }}
                isAnimationActive={!reducedMotion}
                animationDuration={280}
              />
              <Bar
                dataKey="manual"
                name="Hors facture encaissée"
                stackId="receipts"
                fill="var(--receipts-manual)"
                shape={(shapeProps: { x?: number; y?: number; width?: number; height?: number }) => {
                  const { x, y, width, height } = shapeProps;
                  return (
                    <RoundedBarShape
                      fill="var(--receipts-manual)"
                      isTop={true}
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                    />
                  );
                }}
                isAnimationActive={!reducedMotion}
                animationDuration={280}
              />
            </BarChart>
          )}
        </ChartContainer>

      )}

      {isPremium ? (
        <SettleMetricFooter
          metrics={[
            {
              label: "Taux encaissé",
              value: unavailable || rate === null ? "-" : `${rate} %`,
              caption: "encaissé ÷ facturé",
            },
            {
              label: "Factures réglées",
              value: unavailable ? "-" : money(invoicesTotal),
              caption: "sur facturation",
            },
            {
              label: "Hors facture",
              value: unavailable ? "-" : money(manualTotal),
              caption: "recettes directes",
            },
            {
              label: "Total net",
              value: unavailable ? "-" : money(total),
              caption: "sur la période",
            },
          ]}
        />
      ) : (
        <>
          <dl className="premium-widget-metrics" aria-label="Répartition des encaissements">
            <div><dt><i className="receipts-dot-invoices finder-dot finder-dot-blue" aria-hidden="true" />Factures encaissées</dt><dd>{unavailable ? "-" : money(invoicesTotal)}</dd></div>
            <div><dt><i className="receipts-dot-manual finder-dot finder-dot-orange" aria-hidden="true" />Hors facture</dt><dd>{unavailable ? "-" : money(manualTotal)}</dd></div>
            <div><dt><i className="finder-dot finder-dot-green" aria-hidden="true" />Taux encaissé</dt><dd>{unavailable || rate === null ? "-" : `${rate} %`}</dd></div>
          </dl>
          <div className="receipts-chart-note">
            <span>Montants en DA · Barres empilées par mois</span>
            <span>Survolez une barre pour le détail</span>
          </div>
        </>
      )}
    </div>
  );
}
