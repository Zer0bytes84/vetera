"use client";

import {
  type ComponentProps,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";
import type { TypedDataKey } from "recharts/types/util/typedDataKey";
import {
  type BackgroundVariant,
  ChartBackground,
} from "@/components/evilcharts/ui/background";
import {
  type ChartConfig,
  ChartContainer,
  getColorsCount,
  LoadingIndicator,
} from "@/components/evilcharts/ui/chart";
import { ChartDot, type DotVariant } from "@/components/evilcharts/ui/dot";
import {
  ChartLegend,
  ChartLegendContent,
  type ChartLegendVariant,
} from "@/components/evilcharts/ui/legend";
import {
  ChartTooltip,
  ChartTooltipContent,
  type TooltipRoundness,
  type TooltipVariant,
} from "@/components/evilcharts/ui/tooltip";

// Loading animation constants
const LOADING_POINTS = 6;
const LOADING_ANIMATION_DURATION = 1500;

// Constants
const DEFAULT_FILL_OPACITY = 0.3;

type ChartProps = ComponentProps<typeof RadarChart>;
type RadarProps = ComponentProps<typeof Radar>;
type PolarGridProps = ComponentProps<typeof PolarGrid>;

type RadarVariant = "filled" | "lines";

// Extract only keys from TData where the value is a number
type NumericDataKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

type EvilRadarChartProps<
  TData extends Record<string, unknown>,
  TConfig extends Record<string, ChartConfig[string]>,
> = {
  // Data
  data: TData[];
  dataKey: keyof TData & string; // The key for the angle axis (e.g., "month", "category")
  chartConfig: TConfig;
  className?: string;
  chartProps?: ChartProps;
  radarProps?: Omit<RadarProps, "dataKey">;
  polarGridProps?: PolarGridProps;

  // Variant
  variant?: RadarVariant;
  fillOpacity?: number;

  // Axes
  hideAngleAxis?: boolean;
  hideRadiusAxis?: boolean;
  hideGrid?: boolean;
  gridType?: "polygon" | "circle";

  // Hide Stuffs
  hideTooltip?: boolean;
  hideLegend?: boolean;
  hideDots?: boolean;
  legendVariant?: ChartLegendVariant;
  // Tooltip
  tooltipRoundness?: TooltipRoundness;
  tooltipVariant?: TooltipVariant;
  tooltipDefaultIndex?: number;
  dotVariant?: DotVariant;
  activeDotVariant?: DotVariant;

  // Interactive Stuffs
  isLoading?: boolean;

  // Glow Effects
  glowingRadars?: NumericDataKeys<TData>[];
  // Background
  backgroundVariant?: BackgroundVariant;
};

type EvilRadarChartClickable = {
  isClickable: true;
  onSelectionChange?: (selectedDataKey: string | null) => void;
};

type EvilRadarChartNotClickable = {
  isClickable?: false;
  onSelectionChange?: never;
};

type EvilRadarChartPropsWithCallback<
  TData extends Record<string, unknown>,
  TConfig extends Record<string, ChartConfig[string]>,
> = EvilRadarChartProps<TData, TConfig> &
  (EvilRadarChartClickable | EvilRadarChartNotClickable);

export function EvilRadarChart<
  TData extends Record<string, unknown>,
  TConfig extends Record<string, ChartConfig[string]>,
>({
  data,
  dataKey,
  chartConfig,
  className,
  chartProps,
  radarProps,
  polarGridProps,
  variant = "filled",
  fillOpacity = DEFAULT_FILL_OPACITY,
  hideAngleAxis = false,
  hideRadiusAxis = true,
  hideGrid = false,
  gridType = "polygon",
  hideTooltip = false,
  hideLegend = false,
  hideDots = false,
  legendVariant,
  tooltipRoundness,
  tooltipVariant,
  tooltipDefaultIndex,
  dotVariant,
  activeDotVariant,
  isClickable = false,
  isLoading = false,
  glowingRadars = [],
  onSelectionChange,
  backgroundVariant,
}: EvilRadarChartPropsWithCallback<TData, TConfig>) {
  const [selectedRadar, setSelectedRadar] = useState<string | null>(null);
  const chartId = useId().replace(/:/g, "");
  const loadingData = useLoadingData(isLoading, dataKey);

  // Wrapper function to update state and call parent callback
  const handleSelectionChange = useCallback(
    (newSelectedRadar: string | null) => {
      setSelectedRadar(newSelectedRadar);
      if (isClickable && onSelectionChange) {
        onSelectionChange(newSelectedRadar);
      }
    },
    [onSelectionChange, isClickable]
  );

  // Get radar data keys from chartConfig
  const radarDataKeys = Object.keys(chartConfig);

  return (
    <ChartContainer className={className} config={chartConfig}>
      <LoadingIndicator isLoading={isLoading} />
      <RadarChart
        data={isLoading ? loadingData : data}
        id="evil-charts-radar-chart"
        {...chartProps}
      >
        {backgroundVariant && <ChartBackground variant={backgroundVariant} />}
        {!hideGrid && (
          <PolarGrid
            gridType={gridType}
            stroke="currentColor"
            strokeDasharray="3 4"
            strokeOpacity={0.2}
            {...polarGridProps}
          />
        )}

        {!(hideAngleAxis || isLoading) && (
          <PolarAngleAxis
            dataKey={dataKey as TypedDataKey<TData>}
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={false}
          />
        )}

        {!(hideRadiusAxis || isLoading) && (
          <PolarRadiusAxis
            axisLine={false}
            tick={{ fill: "currentColor", fontSize: 10 }}
            tickLine={false}
          />
        )}

        {!(hideLegend || isLoading) && (
          <ChartLegend
            align="center"
            content={
              <ChartLegendContent
                isClickable={isClickable}
                onSelectChange={handleSelectionChange}
                selected={selectedRadar}
                variant={legendVariant}
              />
            }
            verticalAlign="bottom"
          />
        )}

        {!(hideTooltip || isLoading) && (
          <ChartTooltip
            content={
              <ChartTooltipContent
                roundness={tooltipRoundness}
                selected={selectedRadar}
                variant={tooltipVariant}
              />
            }
            cursor={false}
            defaultIndex={tooltipDefaultIndex}
          />
        )}

        {/* Render radars for each data key in chartConfig */}
        {!isLoading &&
          radarDataKeys.map((radarKey) => {
            const isGlowing = glowingRadars.includes(
              radarKey as NumericDataKeys<TData>
            );
            const isSelected =
              selectedRadar === null || selectedRadar === radarKey;
            const opacity = isClickable && !isSelected ? 0.2 : 1;

            const getFilter = () => {
              if (isGlowing) {
                return `url(#${chartId}-radar-glow-${radarKey})`;
              }
              return;
            };

            const showDots = !hideDots;
            const dot = showDots ? (
              dotVariant ? (
                <ChartDot
                  chartId={chartId}
                  dataKey={radarKey}
                  fillOpacity={opacity}
                  type={dotVariant}
                />
              ) : (
                true
              )
            ) : (
              false
            );
            const activeDot = showDots ? (
              activeDotVariant ? (
                <ChartDot
                  chartId={chartId}
                  dataKey={radarKey}
                  fillOpacity={opacity}
                  type={activeDotVariant}
                />
              ) : undefined
            ) : (
              false
            );

            return (
              <Radar
                {...radarProps}
                activeDot={activeDot}
                className="transition-opacity duration-200"
                dataKey={radarKey}
                dot={dot}
                fill={
                  variant === "filled"
                    ? `url(#${chartId}-radar-fill-${radarKey})`
                    : "none"
                }
                fillOpacity={variant === "filled" ? fillOpacity * opacity : 0}
                filter={getFilter()}
                key={radarKey}
                onClick={() => {
                  if (!isClickable) {
                    return;
                  }
                  handleSelectionChange(
                    selectedRadar === radarKey ? null : radarKey
                  );
                }}
                stroke={`url(#${chartId}-radar-stroke-${radarKey})`}
                strokeOpacity={opacity}
                strokeWidth={1}
                style={isClickable ? { cursor: "pointer" } : undefined}
              />
            );
          })}

        {/* Loading state radar */}
        {isLoading && (
          <Radar
            animationDuration={LOADING_ANIMATION_DURATION}
            animationEasing="ease-in-out"
            dataKey="value"
            dot={false}
            fill="currentColor"
            fillOpacity={0.1}
            isAnimationActive
            stroke="currentColor"
            strokeOpacity={0.3}
            strokeWidth={2}
          />
        )}

        {/* ======== CHART STYLES ======== */}
        <defs>
          {/* Shared horizontal color gradient for dots */}
          <HorizontalColorGradientStyle
            chartConfig={chartConfig}
            chartId={chartId}
          />

          {/* Stroke and fill gradients for each radar */}
          <RadarGradientStyle chartConfig={chartConfig} chartId={chartId} />

          {/* Glow filters */}
          {glowingRadars.length > 0 && (
            <GlowFilterStyle
              chartId={chartId}
              glowingRadars={glowingRadars as string[]}
            />
          )}
        </defs>
      </RadarChart>
    </ChartContainer>
  );
}

// Generate random loading data for radar chart animation
function generateLoadingData(dataKey: string) {
  const categories = ["A", "B", "C", "D", "E", "F"];
  return categories.slice(0, LOADING_POINTS).map((cat) => ({
    [dataKey]: cat,
    value: 30 + Math.random() * 70,
  }));
}

function useLoadingData(isLoading: boolean, dataKey: string) {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, LOADING_ANIMATION_DURATION);

    return () => clearInterval(interval);
  }, [isLoading]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadingData = useMemo(
    () => generateLoadingData(dataKey),
    [dataKey, refreshKey]
  );

  return loadingData;
}

// Create stroke and fill gradients for radar chart paths
const RadarGradientStyle = ({
  chartConfig,
  chartId,
}: {
  chartConfig: ChartConfig;
  chartId: string;
}) => {
  return (
    <>
      {Object.entries(chartConfig).map(([dataKey, config]) => {
        const colorsCount = getColorsCount(config);

        return (
          <g key={dataKey}>
            {/* Stroke gradient */}
            <linearGradient
              id={`${chartId}-radar-stroke-${dataKey}`}
              x1="0"
              x2="1"
              y1="0"
              y2="1"
            >
              {colorsCount === 1 ? (
                <>
                  <stop offset="0%" stopColor={`var(--color-${dataKey}-0)`} />
                  <stop offset="100%" stopColor={`var(--color-${dataKey}-0)`} />
                </>
              ) : (
                Array.from({ length: colorsCount }, (_, index) => (
                  <stop
                    key={index}
                    offset={`${(index / (colorsCount - 1)) * 100}%`}
                    stopColor={`var(--color-${dataKey}-${index}, var(--color-${dataKey}-0))`}
                  />
                ))
              )}
            </linearGradient>

            {/* Fill gradient (radial for better effect) */}
            <radialGradient
              cx="50%"
              cy="50%"
              id={`${chartId}-radar-fill-${dataKey}`}
              r="50%"
            >
              {colorsCount === 1 ? (
                <>
                  <stop
                    offset="0%"
                    stopColor={`var(--color-${dataKey}-0)`}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="100%"
                    stopColor={`var(--color-${dataKey}-0)`}
                    stopOpacity={0.3}
                  />
                </>
              ) : (
                Array.from({ length: colorsCount }, (_, index) => (
                  <stop
                    key={index}
                    offset={`${(index / (colorsCount - 1)) * 100}%`}
                    stopColor={`var(--color-${dataKey}-${index}, var(--color-${dataKey}-0))`}
                    stopOpacity={index === 0 ? 0.8 : 0.3}
                  />
                ))
              )}
            </radialGradient>
          </g>
        );
      })}
    </>
  );
};

// Shared horizontal color gradient (left to right) - used by dots
const HorizontalColorGradientStyle = ({
  chartConfig,
  chartId,
}: {
  chartConfig: ChartConfig;
  chartId: string;
}) => (
  <>
    {Object.entries(chartConfig).map(([dataKey, config]) => {
      const colorsCount = getColorsCount(config);

      return (
        <linearGradient
          id={`${chartId}-colors-${dataKey}`}
          key={`${chartId}-colors-${dataKey}`}
          x1="0"
          x2="1"
          y1="0"
          y2="0"
        >
          {colorsCount === 1 ? (
            <>
              <stop offset="0%" stopColor={`var(--color-${dataKey}-0)`} />
              <stop offset="100%" stopColor={`var(--color-${dataKey}-0)`} />
            </>
          ) : (
            Array.from({ length: colorsCount }, (_, index) => (
              <stop
                key={index}
                offset={`${(index / (colorsCount - 1)) * 100}%`}
                stopColor={`var(--color-${dataKey}-${index}, var(--color-${dataKey}-0))`}
              />
            ))
          )}
        </linearGradient>
      );
    })}
  </>
);

// Apply soft glow filter effect to radar areas using SVG filters
const GlowFilterStyle = ({
  chartId,
  glowingRadars,
}: {
  chartId: string;
  glowingRadars: string[];
}) => (
  <>
    {glowingRadars.map((radarKey) => (
      <filter
        height="200%"
        id={`${chartId}-radar-glow-${radarKey}`}
        key={`${chartId}-radar-glow-${radarKey}`}
        width="200%"
        x="-50%"
        y="-50%"
      >
        <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="4" />
        <feColorMatrix
          in="blur"
          result="glow"
          type="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.6 0"
        />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    ))}
  </>
);
