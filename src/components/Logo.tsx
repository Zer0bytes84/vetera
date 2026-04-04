import React from "react"

import { APP_NAME } from "@/lib/brand"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  collapsed?: boolean
  isDarkMode?: boolean
  size?: "sm" | "md" | "lg"
}

const SIZE_MAP: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "!size-7.5",
  md: "!size-8",
  lg: "!size-11",
}

const WORDMARK_CLASS_MAP: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-[1.0625rem]",
  md: "text-[1.125rem]",
  lg: "text-[1.5rem]",
}

function VeteraMark({ iconClassName }: { iconClassName: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={iconClassName}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 7H44C52.284 7 59 13.716 59 22V42C59 50.284 52.284 57 44 57H20C11.716 57 5 50.284 5 42V22C5 13.716 11.716 7 20 7Z"
        fill="currentColor"
        fillOpacity="0.04"
      />
      <path
        d="M20 7H44C52.284 7 59 13.716 59 22V42C59 50.284 52.284 57 44 57H20C11.716 57 5 50.284 5 42V22C5 13.716 11.716 7 20 7Z"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        d="M18 20L29.5 45.5C30.399 47.493 33.227 47.493 34.126 45.5L45.5 20"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24.5 31H39.5"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.12"
      />
      <path
        d="M45.5 20V24.25C45.5 27.149 47.851 29.5 50.75 29.5H55"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.22"
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
      <div className={cn("flex items-center", collapsed ? "gap-0" : "gap-3")}>
        <VeteraMark iconClassName={cn(iconSizeClass, "shrink-0")} />
        {!collapsed ? (
          <span
            className={cn(
              "translate-y-[1px] truncate font-heading font-semibold leading-none tracking-[-0.045em]",
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
