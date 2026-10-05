import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  Refresh01Icon,
  AlertCircleIcon,
} from "@/lib/hugeicons";
export function SaveIndicator({
  state,
  onRetry,
}: {
  state: "idle" | "saving" | "saved" | "error";
  onRetry?: () => void;
}) {
  if (state === "idle")
    return <span className="w-[112px]" aria-hidden="true" />;
  const text =
    state === "saving"
      ? "Enregistrement…"
      : state === "error"
        ? "Non enregistré"
        : "Enregistré";
  return (
    <span
      className="inline-flex w-[112px] items-center gap-1.5 text-[11px] text-ink-muted"
      role="status"
      aria-live="polite"
    >
      <HugeiconsIcon
        icon={
          state === "saving"
            ? Refresh01Icon
            : state === "error"
              ? AlertCircleIcon
              : CheckmarkCircle02Icon
        }
        strokeWidth={1.5}
        size={13}
        className={
          state === "saving"
            ? "animate-spin motion-reduce:animate-none"
            : state === "error"
              ? "text-signal-critical"
              : "text-signal-positive"
        }
      />
      {state === "error" && onRetry ? (
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={onRetry}
        >
          {text}
        </button>
      ) : (
        text
      )}
    </span>
  );
}
