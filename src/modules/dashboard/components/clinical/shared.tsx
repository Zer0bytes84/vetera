import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { focusRing, SkeletonBlock } from "@/design-system/primitives";
import { ArrowRight01Icon } from "@/lib/hugeicons";
import type { Patient } from "@/types/db";

export interface WidgetState {
  error?: string | null;
  loading: boolean;
  retry: () => void;
  skeleton: boolean;
}
export function RowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          className="flex h-14 items-center gap-3"
          // biome-ignore lint/suspicious/noArrayIndexKey: cases identiques du squelette de chargement, au nombre fixé par count
          key={index}
        >
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
      className={`t-12 inline-flex shrink-0 items-center gap-1.5 rounded-md font-medium text-ink-muted transition-colors duration-150 hover:text-ink ${focusRing}`}
      onClick={onClick}
      type="button"
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
      alt=""
      className="size-9 shrink-0 rounded-control bg-frame object-cover"
      src={patient.avatarUrl}
    />
  ) : (
    <span
      aria-hidden="true"
      className="t-14 grid size-9 shrink-0 place-items-center rounded-control bg-frame font-display text-ink-muted"
    >
      {(patient?.name ?? name ?? "P").slice(0, 1).toLocaleUpperCase()}
    </span>
  );
}
function rowToneClass(
  tone: "positive" | "watch" | "quiet" | undefined
): string {
  switch (tone) {
    case "positive":
      return "text-[color:var(--premium-green,var(--signal-positive))]";
    case "watch":
      return "text-[color:var(--premium-orange,var(--signal-watch))]";
    default:
      return "text-ink";
  }
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
  const dotColor = (index: number) => {
    switch (index) {
      case 0:
        return "finder-dot-blue";
      case 1:
        return "finder-dot-orange";
      default:
        return "finder-dot-red";
    }
  };
  return (
    <dl className="module-totals-grid flex flex-wrap gap-x-6 gap-y-3 border-hairline border-b pb-4">
      {values.map((row, index) => (
        <div
          className="module-totals-item flex items-baseline gap-2"
          key={row.label}
        >
          <dd
            className={`t-18 font-display font-medium tabular-nums ${rowToneClass(row.tone)}`}
          >
            {row.value}
          </dd>
          <dt className="t-12 flex items-center gap-1.5 text-ink-muted">
            <i aria-hidden="true" className={`finder-dot ${dotColor(index)}`} />
            {row.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}
