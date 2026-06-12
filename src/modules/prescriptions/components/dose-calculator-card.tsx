import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  type DoseComputation,
  formatComputedDose,
  formatNumber,
} from "../lib/dose-calculator";

interface DoseCalculatorCardProps {
  className?: string;
  computation?: DoseComputation | null;
  /** Concentration de la spécialité (mg/mL), pour conversion mL. */
  concentrationMgPerMl?: number;
  weightKg?: number;
}

/**
 * Carte "live" qui affiche la dose calculée (mg) et le volume (mL)
 * en fonction du poids et de la concentration.
 *
 * Le composant est volontairement compact et information-dense : il vit
 * dans la colonne droite du PrescriptionBuilder, à côté de chaque item.
 */
export function DoseCalculatorCard({
  className,
  computation,
  concentrationMgPerMl,
  weightKg,
}: DoseCalculatorCardProps) {
  const { t } = useTranslation();

  if (!computation) {
    return (
      <Card className={cn("border-dashed bg-muted/30", className)}>
        <CardContent className="px-3 py-2.5 text-muted-foreground text-xs">
          {t("prescriptions.builder.noWeight")}
        </CardContent>
      </Card>
    );
  }

  const hasWeight = weightKg && weightKg > 0;
  const hasConcentration =
    concentrationMgPerMl != null && concentrationMgPerMl > 0;

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-transparent bg-white/60 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md dark:bg-zinc-900/60",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-0 opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
      </div>
      <CardHeader className="relative z-10 flex flex-row items-center justify-between gap-2 space-y-0 px-4 pt-3 pb-2">
        <CardTitle className="font-bold text-[10px] text-emerald-600/80 uppercase tracking-widest dark:text-emerald-400/80">
          {t("prescriptions.calculator.computed")}
        </CardTitle>
        {computation.range ? (
          <Badge
            className="border-emerald-500/20 bg-background/50 text-[10px] text-emerald-600 backdrop-blur-sm dark:text-emerald-400"
            variant="outline"
          >
            {t("prescriptions.calculator.range")}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="relative z-10 space-y-2 px-4 pt-0 pb-4">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-3xl text-foreground/90 tabular-nums tracking-tighter">
            {hasWeight && computation.computedMg != null
              ? `${formatNumber(computation.computedMg)} mg`
              : `${computation.min}${computation.range ? `–${computation.max}` : ""}`}
          </span>
          {computation.unit ? (
            <span className="font-semibold text-muted-foreground/70 text-sm">
              {computation.unit}
            </span>
          ) : null}
        </div>

        {computation.range ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-border/40 border-t pt-2 font-medium text-[11px] text-muted-foreground/70">
            <span>
              {t("prescriptions.calculator.low")} :{" "}
              <span className="font-bold text-foreground/80">
                {formatNumber(computation.min)} {computation.unit}
              </span>
            </span>
            <span>
              {t("prescriptions.calculator.high")} :{" "}
              <span className="font-bold text-foreground/80">
                {formatNumber(computation.max)} {computation.unit}
              </span>
            </span>
          </div>
        ) : null}

        {hasWeight && computation.computedMl != null ? (
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-emerald-500/10 bg-emerald-50/50 px-3 py-2 shadow-sm dark:bg-emerald-500/5">
            <span className="font-bold text-[10px] text-emerald-600/70 uppercase tracking-widest dark:text-emerald-400/70">
              {t("prescriptions.calculator.volume")}
            </span>
            <span className="font-bold text-base text-emerald-700 tabular-nums dark:text-emerald-300">
              {formatNumber(computation.computedMl)} mL
            </span>
            {hasConcentration ? (
              <span className="ml-auto font-medium text-[10px] text-emerald-600/60 dark:text-emerald-400/60">
                {formatNumber(concentrationMgPerMl)} mg/mL
              </span>
            ) : null}
          </div>
        ) : null}

        {hasWeight && computation.computedMl == null && hasConcentration ? (
          <p className="mt-2 font-medium text-[10px] text-amber-600/80 dark:text-amber-400/80">
            {t("prescriptions.calculator.warning")}
          </p>
        ) : null}

        {hasWeight ? null : (
          <p className="mt-2 font-medium text-[10px] text-muted-foreground/60">
            {t("prescriptions.builder.noWeight")}
          </p>
        )}

        <p className="sr-only">{formatComputedDose(computation)}</p>
      </CardContent>
    </Card>
  );
}
