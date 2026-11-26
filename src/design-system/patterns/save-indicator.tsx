import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  Refresh01Icon,
} from "@/lib/hugeicons";

function saveText(state: "saving" | "saved" | "error"): string {
  switch (state) {
    case "saving":
      return "Enregistrement…";
    case "error":
      return "Non enregistré";
    default:
      return "Enregistré";
  }
}

function saveIconClass(state: "saving" | "saved" | "error"): string {
  switch (state) {
    case "saving":
      return "animate-spin motion-reduce:animate-none";
    case "error":
      return "text-signal-critical";
    default:
      return "text-signal-positive";
  }
}

function saveIcon(state: "saving" | "saved" | "error") {
  switch (state) {
    case "saving":
      return Refresh01Icon;
    case "error":
      return AlertCircleIcon;
    default:
      return CheckmarkCircle02Icon;
  }
}

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
  const text = saveText(state);
  return (
    <span
      aria-live="polite"
      className="t-12 inline-flex w-[112px] items-center gap-1.5 text-ink-muted"
      role="status"
    >
      <HugeiconsIcon
        className={saveIconClass(state)}
        icon={saveIcon(state)}
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
