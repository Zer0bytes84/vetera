import type React from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  flatMark?: boolean;
  isDarkMode?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  textSize?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const SIZE_PX: Record<NonNullable<LogoProps["size"]>, number> = {
  sm: 24,
  md: 28,
  lg: 32,
  xl: 36,
  "2xl": 42,
};

const WORDMARK_CLASS_MAP: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-[15px] leading-[20px]",
  md: "text-[19px] leading-[26px]",
  lg: "text-[22px] leading-[30px]",
  xl: "text-[26px] leading-[34px]",
  "2xl": "text-[28px] leading-[36px]",
};

function BaitariMark({
  sizePx,
  flatMark = false,
}: {
  sizePx: number;
  flatMark?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const panelId = `logo-panel-${id}`;

  return (
    <svg
      aria-hidden="true"
      style={{ width: sizePx, height: sizePx, flexShrink: 0 }}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={panelId} x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#151c25" />
          <stop offset="100%" stopColor="#101720" />
        </linearGradient>
      </defs>

      <rect
        fill={`url(#${panelId})`}
        height="32"
        rx="10"
        width="32"
        x="4"
        y="4"
      />
      <path
        d="M15 11.5V28.5"
        fill="none"
        stroke="#ffffff"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
      <path
        d="M15 20C15 16.686 17.686 14 21 14C24.314 14 27 16.686 27 20C27 23.314 24.314 26 21 26C17.686 26 15 23.314 15 20Z"
        fill="none"
        stroke="#ffffff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.2"
      />
    </svg>
  );
}

const Logo: React.FC<LogoProps> = ({
  className = "",
  collapsed = false,
  size = "md",
  textSize = "md",
  isDarkMode = false,
  flatMark = false,
}) => {
  const sizePx = collapsed ? 32 : SIZE_PX[size];
  const wordmarkClass = WORDMARK_CLASS_MAP[textSize];
  return (
    <div
      className={cn("flex select-none items-center text-current", className)}
    >
      <div className={cn("flex items-center", collapsed ? "gap-0" : "gap-0")}>
        <div className="logo-mark-shell z-10 flex items-center justify-center">
          <BaitariMark flatMark={flatMark} sizePx={sizePx} />
        </div>
        {collapsed ? null : (
          <div className="z-0 -ml-1 flex items-baseline gap-0">
            <span
              className={cn(
                "text-zinc-900 tracking-tight dark:text-white",
                wordmarkClass
              )}
              style={{
                fontFamily: "'Inter Variable', 'Inter', sans-serif",
              }}
            >
              <span style={{ fontWeight: 800, letterSpacing: "-0.05em" }}>
                AI
              </span>
              <span style={{ fontWeight: 500, letterSpacing: "-0.04em" }}>
                tari
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Logo;
