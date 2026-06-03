import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HospitalizationStatus } from "@/types/db";

import {
  HOSPITALIZATION_STATUS_LABELS,
  HOSPITALIZATION_STATUS_TONE,
} from "../lib/format";

type Tone = "info" | "warning" | "success" | "destructive" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  info: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  destructive:
    "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200",
  neutral: "border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
};

export function HospitalizationStatusBadge({
  status,
  className,
}: {
  status: HospitalizationStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  const tone = HOSPITALIZATION_STATUS_TONE[status];
  const label = t(
    `modules.hospitalizations.status.${status}`,
    HOSPITALIZATION_STATUS_LABELS[status]
  );

  return (
    <Badge
      className={cn(
        "border font-medium",
        TONE_CLASSES[tone],
        className
      )}
      variant="outline"
    >
      {label}
    </Badge>
  );
}
