import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@/lib/hugeicons";
import { focusRing, SkeletonBlock } from "@/design-system/primitives";
import type { Patient } from "@/types/db";

export type WidgetState = {
  loading: boolean;
  skeleton: boolean;
  error?: string | null;
  retry: () => void;
};
export function RowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex h-14 items-center gap-3">
          <SkeletonBlock className="size-9 shrink-0" />
          <div className="flex-1">
            <SkeletonBlock className="h-3 w-1/2" />
            <SkeletonBlock className="mt-2 h-2.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
export function ModuleLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md text-[12px] font-medium text-ink-muted transition-colors duration-150 hover:text-ink ${focusRing}`}
      onClick={onClick}
    >
      {children}
      <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.5} />
    </button>
  );
}
export function PatientPortrait({
  patient,
  name,
}: {
  patient?: Pick<Patient, "avatarUrl" | "name">;
  name?: string;
}) {
  return patient?.avatarUrl ? (
    <img
      src={patient.avatarUrl}
      alt=""
      className="size-9 shrink-0 rounded-control bg-frame object-cover"
    />
  ) : (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-control bg-frame font-display text-[14px] text-ink-muted"
    >
      {(patient?.name ?? name ?? "P").slice(0, 1).toLocaleUpperCase()}
    </span>
  );
}
export function ModuleTotals({
  values,
}: {
  values: {
    label: string;
    value: ReactNode;
    tone?: "positive" | "watch" | "quiet";
  }[];
}) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-3 border-b border-hairline pb-4">
      {values.map((row) => (
        <div key={row.label} className="flex items-baseline gap-2">
          <dd
            className={`font-display text-[20px] font-medium tabular-nums ${row.tone === "positive" ? "text-emerald-700 dark:text-emerald-300" : row.tone === "watch" ? "text-amber-800 dark:text-amber-300" : "text-ink"}`}
          >
            {row.value}
          </dd>
          <dt className="text-[11px] text-ink-muted">{row.label}</dt>
        </div>
      ))}
    </dl>
  );
}
