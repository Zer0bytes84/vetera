import React, { useId } from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  collapsed?: boolean
  isDarkMode?: boolean
  size?: "sm" | "md" | "lg" | "xl"
  flatMark?: boolean
}

const SIZE_MAP: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "size-8",
  md: "size-9",
  lg: "size-10",
  xl: "size-11",
}

const WORDMARK_CLASS_MAP: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-[15px] leading-[20px]",
  md: "text-[19px] leading-[26px]",
  lg: "text-[22px] leading-[30px]",
  xl: "text-[26px] leading-[34px]",
}

function VeteraMark({
  iconClassName,
  flatMark = false,
}: {
  iconClassName: string
  flatMark?: boolean
}) {
  const id = useId().replace(/:/g, "")
  const panelId = `logo-panel-${id}`
  const shadowId = `logo-shadow-${id}`
  const borderOpacity = flatMark ? 0.18 : 0.22

  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={iconClassName}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={panelId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#151c25" />
          <stop offset="100%" stopColor="#101720" />
        </linearGradient>
        <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0f1218" floodOpacity="0.22" />
        </filter>
      </defs>

      <rect
        x="4"
        y="4"
        width="32"
        height="32"
        rx="10"
        fill={`url(#${panelId})`}
        filter={flatMark ? undefined : `url(#${shadowId})`}
      />
      <rect
        x="4"
        y="4"
        width="32"
        height="32"
        rx="10"
        fill="none"
        stroke="#ffffff"
        strokeOpacity={borderOpacity}
        strokeWidth="1.5"
      />
      <path
        d="M15 11.5V28.5"
        stroke="#ffffff"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M15 20C15 16.686 17.686 14 21 14C24.314 14 27 16.686 27 20C27 23.314 24.314 26 21 26C17.686 26 15 23.314 15 20Z"
        stroke="#ffffff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

const Logo: React.FC<LogoProps> = ({
  className = "",
  collapsed = false,
  size = "md",
  isDarkMode = false,
  flatMark = false,
}) => {
  const iconSizeClass = SIZE_MAP[size]
  const wordmarkClass = WORDMARK_CLASS_MAP[size]
  const primaryWordmark = isDarkMode
    ? "#f8fafc"
    : "color-mix(in oklab, currentColor 94%, #0f172a 6%)"
  const secondaryWordmark = isDarkMode
    ? "rgba(248,250,252,0.96)"
    : "color-mix(in oklab, currentColor 82%, #64748b 18%)"

  return (
    <div className={cn("flex items-center select-none text-current", className)}>
      <div className={cn("flex items-center", collapsed ? "gap-0" : "gap-1.5")}>
        <div className="logo-mark-shell flex items-center justify-center">
          <VeteraMark
            iconClassName={cn("shrink-0", iconSizeClass)}
            flatMark={flatMark}
          />
        </div>
        {!collapsed ? (
          <div className="flex items-baseline gap-0 -ms-0.5">
            <span
              className={cn("font-semibold tracking-tight", wordmarkClass)}
              style={{
                color: primaryWordmark,
                fontFamily: '"Geist Variable", "Geist", "Geist Fallback", sans-serif',
                letterSpacing: "-0.045em",
                fontWeight: 650,
              }}
            >
              b
            </span>
            <span
              className={cn("font-medium tracking-tight", wordmarkClass)}
              style={{
                color: secondaryWordmark,
                fontFamily: '"Geist Variable", "Geist", "Geist Fallback", sans-serif',
                letterSpacing: "-0.038em",
                fontWeight: 560,
              }}
            >
              Altari
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default Logo
