import React from "react"

import { cn } from "@/lib/utils"

type DashboardPageIntroProps = {
  eyebrow: string
  title: string
  subtitle: string
  actions?: React.ReactNode
  className?: string
}

export function DashboardPageIntro({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: DashboardPageIntroProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between",
        className
      )}
    >
      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="text-[28px] font-normal tracking-[-0.04em] text-foreground">
          {title}
        </h1>
        <p className="max-w-[72ch] text-sm text-muted-foreground">
          {subtitle}
        </p>
      </div>

      {actions ? <div className="flex flex-col gap-2 sm:flex-row">{actions}</div> : null}
    </div>
  )
}
