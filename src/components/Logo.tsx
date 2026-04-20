import React from "react"

import { APP_NAME } from "@/lib/brand"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  collapsed?: boolean
  isDarkMode?: boolean
  size?: "sm" | "md" | "lg" | "xl"
}

const SIZE_MAP: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "size-6",
  md: "size-7",
  lg: "size-8",
  xl: "size-9",
}

const WORDMARK_CLASS_MAP: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-[13px] leading-[20px]",
  md: "text-[15px] leading-[22px] font-semibold",
  lg: "text-[18px] leading-[26px] font-semibold",
  xl: "text-[22px] leading-[30px] font-semibold",
}

function VeteraMark({ iconClassName }: { iconClassName: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("text-foreground", iconClassName)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Elegant minimalist 'deformed stroke' SaaS Logo */}
      <path
        d="M 4 18 C 12 2, 20 30, 28 14"
        stroke="currentColor"
        strokeWidth="3.25"
        strokeLinecap="round"
        fill="none"
        className="opacity-95 dark:opacity-100"
        style={{ vectorEffect: "non-scaling-stroke" }}
      />
    </svg>
  )
}

const Logo: React.FC<LogoProps> = ({
  className = "",
  collapsed = false,
  size = "md",
}) => {
  const iconSizeClass = SIZE_MAP[size]
  const wordmarkClass = WORDMARK_CLASS_MAP[size]

  return (
    <div className={cn("flex items-center select-none text-current", className)}>
      <div className={cn("flex items-center", collapsed ? "gap-0" : "gap-2.5")}>
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-accent/50">
          <VeteraMark iconClassName="size-5 shrink-0" />
        </div>
        {!collapsed ? (
          <span
            className={cn(
              "truncate font-semibold tracking-normal font-sans",
              wordmarkClass
            )}
            style={{ color: "currentColor", fontFamily: '"Geist Variable", "Geist", "Geist Fallback", sans-serif' }}
          >
            {APP_NAME}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default Logo
