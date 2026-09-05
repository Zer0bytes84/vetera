import type React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  collapsed?: boolean;
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

function BaitariMark({ sizePx }: { sizePx: number }) {
  return (
    <svg
      aria-hidden="true"
      className="overflow-visible"
      style={{ width: sizePx, height: sizePx, flexShrink: 0 }}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11.25 4.75V23.25C11.25 30.1 16.35 35.25 23.15 35.25C29.9 35.25 35 30.05 35 23.25C35 16.45 29.85 11.25 23.1 11.25C17.1 11.25 12.25 15.3 11.35 21.15"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4.6"
      />
      <path
        d="M5.75 23.2H13.45L16.65 17.6L20.45 28.35L24.05 21.15L26.3 23.2H35.15"
        fill="none"
        stroke="#20B486"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.8"
      />
    </svg>
  );
}

const Logo: React.FC<LogoProps> = ({
  className = "",
  collapsed = false,
  size = "md",
  textSize = "md",
}) => {
  const sizePx = collapsed ? 32 : SIZE_PX[size];
  const wordmarkClass = WORDMARK_CLASS_MAP[textSize];
  return (
    <div
      className={cn("flex select-none items-center text-current", className)}
    >
      <div className={cn("flex items-center", collapsed ? "gap-0" : "gap-2")}>
        <div className="flex items-center justify-center text-[#191c20] dark:text-[#f5f6f4]">
          <BaitariMark sizePx={sizePx} />
        </div>
        {collapsed ? null : (
          <div className="flex items-center">
            <span
              className={cn(
                "font-heading font-semibold text-zinc-900 dark:text-white",
                wordmarkClass
              )}
              style={{ letterSpacing: "-0.045em" }}
            >
              Baitari
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Logo;
