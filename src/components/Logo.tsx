import { type FC, useId } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  collapsed?: boolean;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  textSize?: "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "original" | "refined";
}
const SIZE_PX = { sm: 24, md: 28, lg: 32, xl: 38, "2xl": 44 };
function BrandMark() {
  return (
    <>
      <path
        d="M8 4h8v12.1A13 13 0 1 1 8 28V4Zm8 24a5 5 0 1 0 10 0 5 5 0 0 0-10 0Z"
        fill="#139fdf"
        fillRule="evenodd"
      />
      <path d="M25 5h6v5h5v6h-5v5h-6v-5h-5v-6h5Z" fill="#66dfd0" />
    </>
  );
}
const Logo: FC<LogoProps> = ({
  className = "",
  collapsed = false,
  showWordmark = true,
  size = "lg",
  variant = "original",
}) => {
  const gradientId = `baitari-mark-${useId().replace(/:/g, "")}`;
  const compact = collapsed || !showWordmark;
  const height = collapsed ? 34 : SIZE_PX[size];
  if (variant === "refined") {
    return (
      <div
        aria-label="Baitari"
        className={cn(
          "flex select-none items-center gap-2.5 text-current",
          className
        )}
        role="img"
      >
        <svg
          aria-hidden="true"
          className="shrink-0"
          focusable="false"
          height={height}
          viewBox="0 0 44 44"
          width={height}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id={gradientId}
              x1="8"
              x2="35"
              y1="6"
              y2="38"
            >
              <stop stopColor="#087e9c" />
              <stop offset="1" stopColor="#17adbf" />
            </linearGradient>
          </defs>
          <path
            d="M12 7v21a10 10 0 1 0 10-10 10 10 0 0 0-10 10"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="7"
          />
          <path
            d="M29 5v12M23 11h12"
            fill="none"
            stroke="#63cfc0"
            strokeLinecap="round"
            strokeWidth="5"
          />
        </svg>
        {!compact && (
          <span className="t-18 font-semibold text-sidebar-foreground leading-none tracking-[-0.035em]">
            Baitari
          </span>
        )}
      </div>
    );
  }
  return (
    <div
      aria-label="Baitari"
      className={cn("flex select-none items-center text-current", className)}
      role="img"
    >
      <svg
        aria-hidden="true"
        className="shrink-0"
        style={{ height, width: compact ? height : (height * 148) / 40 }}
        viewBox={compact ? "0 0 44 44" : "0 0 148 40"}
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform={compact ? undefined : "translate(-3, -2)"}>
          <BrandMark />
        </g>
        {!compact && (
          <text
            className="brand-wordmark fill-zinc-900 dark:fill-white"
            style={{
              fontFamily:
                "var(--app-font-heading, 'Inter Variable', Inter, sans-serif)",
              fontSize: "21.5px",
              fontWeight: 700,
              letterSpacing: "-0.035em",
            }}
            x="45"
            y="26.5"
          >
            Baitari
          </text>
        )}
      </svg>
    </div>
  );
};
export default Logo;
