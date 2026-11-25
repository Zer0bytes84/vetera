import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  Refresh01Icon,
} from "@/lib/hugeicons";
export function SaveIndicator({
  state,
  onRetry,
}: {
  state: "idle" | "saving" | "saved" | "error";
  onRetry?: () => void;
}) {
  if (state === "idle") {
    return <span aria-hidden="true" className="w-[112px]" />;
  }
  const text =
    state === "saving"
      ? "Enregistrement…"
      : state === "error"
        ? "Non enregistré"
        : "Enregistré";
  return (
    <span
      aria-live="polite"
      className="t-12 inline-flex w-[112px] items-center gap-1.5 text-ink-muted"
      role="status"
    >
      <HugeiconsIcon
        className={
          state === "saving"
            ? "animate-spin motion-reduce:animate-none"
            : state === "error"
              ? "text-signal-critical"
              : "text-signal-positive"
        }
        icon={
          state === "saving"
            ? Refresh01Icon
            : state === "error"
              ? AlertCircleIcon
              : CheckmarkCircle02Icon
        }
        size={13}
        strokeWidth={1.5}
      />
      {state === "error" && onRetry ? (
        <button
          className="underline underline-offset-4"
          onClick={onRetry}
          type="button"
        >
          {text}
        </button>
      ) : (
        text
      )}
    </span>
  );
}
