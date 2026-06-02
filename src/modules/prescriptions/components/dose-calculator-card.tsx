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
        "overflow-hidden border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-3 pt-2.5 pb-1.5">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("prescriptions.calculator.computed")}
        </CardTitle>
        {computation.range ? (
          <Badge className="text-[10px]" variant="secondary">
            {t("prescriptions.calculator.range")}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 pb-3 pt-0">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {hasWeight && computation.computedMg != null
              ? `${formatNumber(computation.computedMg)} mg`
              : `${computation.min}${computation.range ? `–${computation.max}` : ""}`}
          </span>
          {computation.unit ? (
            <span className="text-xs text-muted-foreground">
              {computation.unit}
            </span>
          ) : null}
        </div>

        {computation.range ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              {t("prescriptions.calculator.low")} :{" "}
              <span className="font-medium text-foreground/80">
                {formatNumber(computation.min)} {computation.unit}
              </span>
            </span>
            <span>
              {t("prescriptions.calculator.high")} :{" "}
              <span className="font-medium text-foreground/80">
                {formatNumber(computation.max)} {computation.unit}
              </span>
            </span>
          </div>
        ) : null}

        {hasWeight && computation.computedMl != null ? (
          <div className="flex items-center gap-2 rounded-md bg-foreground/5 px-2 py-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("prescriptions.calculator.volume")}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {formatNumber(computation.computedMl)} mL
            </span>
            {hasConcentration ? (
              <span className="ml-auto text-[10px] text-muted-foreground">
                {formatNumber(concentrationMgPerMl)} mg/mL
              </span>
            ) : null}
          </div>
        ) : null}

        {hasWeight && computation.computedMl == null && hasConcentration ? (
          <p className="text-[10px] text-muted-foreground">
            {t("prescriptions.calculator.warning")}
          </p>
        ) : null}

        {!hasWeight ? (
          <p className="text-[10px] text-muted-foreground">
            {t("prescriptions.builder.noWeight")}
          </p>
        ) : null}

        <p className="sr-only">{formatComputedDose(computation)}</p>
      </CardContent>
    </Card>
  );
}
