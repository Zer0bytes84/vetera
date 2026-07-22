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
        d="M12.5 6.5V24.8C12.5 31.1 17.4 35.5 23.5 35.5C29.7 35.5 34.5 30.8 34.5 24.7C34.5 18.7 29.8 14 23.7 14C18.5 14 14.2 17.6 13 22.5C13.5 27 16.8 30.2 21.1 30.2C25.5 30.2 28.9 26.8 28.9 22.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.15"
      />
      <circle cx="31.4" cy="8.9" fill="#38B990" r="2.45" />
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
          <div className="flex items-baseline">
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
