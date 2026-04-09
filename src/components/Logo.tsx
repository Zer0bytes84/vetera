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
  sm: "!size-7.5",
  md: "!size-8",
  lg: "!size-11",
  xl: "!size-14",
}

const WORDMARK_CLASS_MAP: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-[1.0625rem]",
  md: "text-[1.125rem]",
  lg: "text-[1.5rem]",
  xl: "text-[1.875rem]",
}

function VeteraMark({ iconClassName }: { iconClassName: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={iconClassName}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer large layer - soft and highly translucent glass */}
      <rect 
        x="16" y="2.5" 
        width="18" height="18" rx="4.5" 
        transform="rotate(45 16 2.5)" 
        fill="currentColor" 
        className="opacity-[0.14] dark:opacity-[0.18]" 
      />
      
      {/* Medium center layer - defining the shape */}
      <rect 
        x="16" y="11" 
        width="12" height="12" rx="3" 
        transform="rotate(45 16 11)" 
        fill="currentColor" 
        className="opacity-[0.45] dark:opacity-[0.55]" 
      />
      
      {/* Inner core - sharp, solid apex */}
      <rect 
        x="16" y="19.5" 
        width="6" height="6" rx="1.5" 
        transform="rotate(45 16 19.5)" 
        fill="currentColor" 
        className="opacity-95 dark:opacity-100" 
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
    <div
      className={cn(
        "flex items-center select-none text-current",
        className
      )}
    >
      <div className={cn("flex items-center", collapsed ? "gap-0" : "gap-2")}>
        <VeteraMark iconClassName={cn(iconSizeClass, "shrink-0")} />
        {!collapsed ? (
          <span
            className={cn(
              "-ml-0.5 translate-y-[1px] truncate font-heading font-semibold leading-none tracking-[-0.045em]",
              wordmarkClass
            )}
            style={{ color: "currentColor" }}
          >
            {APP_NAME}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default Logo
