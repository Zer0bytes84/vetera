import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full resize-none rounded-[18px] border border-border bg-card px-3.5 py-3 text-sm text-foreground transition-all duration-200 ease-out outline-none placeholder:text-muted-foreground/85 hover:border-border/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:shadow-[0_0_0_1px_var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-[var(--color-surface-soft)] dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
