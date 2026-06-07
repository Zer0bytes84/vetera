import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        <CardContent className="px-3 py-2.5 text-xs text-muted-foreground">
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
        "relative overflow-hidden border-transparent bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-sm transition-all duration-300 hover:shadow-md",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-overlay">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
      </div>
      <CardHeader className="relative z-10 flex flex-row items-center justify-between gap-2 space-y-0 px-4 pt-3 pb-2">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400/80">
          {t("prescriptions.calculator.computed")}
        </CardTitle>
        {computation.range ? (
          <Badge className="text-[10px] bg-background/50 backdrop-blur-sm border-emerald-500/20 text-emerald-600 dark:text-emerald-400" variant="outline">
            {t("prescriptions.calculator.range")}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="relative z-10 space-y-2 px-4 pb-4 pt-0">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums tracking-tighter text-foreground/90">
            {hasWeight && computation.computedMg != null
              ? `${formatNumber(computation.computedMg)} mg`
              : `${computation.min}${computation.range ? `–${computation.max}` : ""}`}
          </span>
          {computation.unit ? (
            <span className="text-sm font-semibold text-muted-foreground/70">
              {computation.unit}
            </span>
          ) : null}
        </div>

        {computation.range ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-muted-foreground/70 border-t border-border/40 pt-2 mt-2">
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
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-emerald-500/10 bg-emerald-50/50 dark:bg-emerald-500/5 px-3 py-2 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 dark:text-emerald-400/70">
              {t("prescriptions.calculator.volume")}
            </span>
            <span className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatNumber(computation.computedMl)} mL
            </span>
            {hasConcentration ? (
              <span className="ml-auto text-[10px] font-medium text-emerald-600/60 dark:text-emerald-400/60">
                {formatNumber(concentrationMgPerMl)} mg/mL
              </span>
            ) : null}
          </div>
        ) : null}

        {hasWeight && computation.computedMl == null && hasConcentration ? (
          <p className="text-[10px] font-medium text-amber-600/80 dark:text-amber-400/80 mt-2">
            {t("prescriptions.calculator.warning")}
          </p>
        ) : null}

        {!hasWeight ? (
          <p className="text-[10px] font-medium text-muted-foreground/60 mt-2">
            {t("prescriptions.builder.noWeight")}
          </p>
        ) : null}

        <p className="sr-only">{formatComputedDose(computation)}</p>
      </CardContent>
    </Card>
  );
}
