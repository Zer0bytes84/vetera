import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-2xl border border-black/6 bg-white/78 px-3.5 text-foreground text-sm shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] transition-colors placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/8 dark:bg-white/6 dark:shadow-none",
        className
      )}
      data-slot="input"
      {...props}
    />
  );
}
