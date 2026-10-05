import type { ReactNode } from "react";
import { ActionButton, SkeletonBlock } from "@/design-system/primitives";
import { cn } from "@/lib/utils";
import type { WidgetState } from "./clinical/shared";

/** Keep ready classic widgets mounted while another dependency is pending. */
export function ClassicWidgetState({
  state,
  label,
  children,
  skeleton,
  placeholderClassName,
}: {
  state?: WidgetState;
  label: string;
  children: ReactNode;
  skeleton?: ReactNode;
  placeholderClassName?: string;
}) {
  if (state?.loading || state?.skeleton) {
    return (
      <div
        role="status"
        aria-label={`Chargement : ${label}`}
        aria-busy="true"
        className={placeholderClassName}
      >
        <div
          aria-hidden="true"
          className={cn("min-h-[200px]", !state.skeleton && "invisible")}
        >
          {skeleton ?? (
            <div className="space-y-4 p-5">
              <SkeletonBlock className="h-8 w-1/3" />
              <SkeletonBlock className="h-4 w-2/3" />
              <SkeletonBlock className="h-24 w-full" />
            </div>
          )}
        </div>
      </div>
    );
  }
  if (state?.error) {
    return (
      <div
        role="alert"
        aria-label={`Indisponible : ${label}`}
        className={placeholderClassName}
      >
        <div className="space-y-3 p-5">
          <p className="font-display text-[14px] font-medium">{label}</p>
          <p className="text-[13px] text-ink-muted">{state.error}</p>
          <ActionButton quiet onClick={state.retry}>
            Réessayer
          </ActionButton>
        </div>
      </div>
    );
  }
  return children;
}
