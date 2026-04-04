import type { HTMLAttributes } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[0.72rem] font-medium tracking-normal transition-colors",
  {
    variants: {
      variant: {
        neutral: "border-[var(--border-color)] bg-[var(--surface-200)] text-[var(--text-secondary)]",
        success: "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        warning: "border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
        danger: "border-transparent bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
        info: "border-transparent bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />
}
