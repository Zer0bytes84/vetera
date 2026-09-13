import type React from "react";
import { cn } from "@/lib/utils";
interface LogoProps {
  className?: string;
  collapsed?: boolean;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  textSize?: "sm" | "md" | "lg" | "xl" | "2xl";
}
const SIZE_PX = { sm: 24, md: 28, lg: 32, xl: 38, "2xl": 44 };
function BrandMark() {
  return <>
    <path fill="#139fdf" fillRule="evenodd" d="M8 4h8v12.1A13 13 0 1 1 8 28V4Zm8 24a5 5 0 1 0 10 0 5 5 0 0 0-10 0Z" />
    <path fill="#66dfd0" d="M25 5h6v5h5v6h-5v5h-6v-5h-5v-6h5Z" />
  </>;
}
const Logo: React.FC<LogoProps> = ({ className = "", collapsed = false, showWordmark = true, size = "lg" }) => {
  const compact = collapsed || !showWordmark;
  const height = collapsed ? 34 : SIZE_PX[size];
  return <div aria-label="Baitari" role="img" className={cn("flex select-none items-center text-current", className)}>
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="shrink-0" style={{height, width: compact ? height : height * 148 / 40}} viewBox={compact ? "0 0 44 44" : "0 0 148 40"}>
      <g transform={compact ? undefined : "translate(-3, -2)"}><BrandMark /></g>
      {!compact && <text className="brand-wordmark fill-zinc-900 dark:fill-white" style={{fontFamily: "var(--app-font-heading, 'Inter Variable', Inter, sans-serif)", fontSize: "21.5px", fontWeight: 700, letterSpacing: "-0.035em"}} x="45" y="26.5">Baitari</text>}
    </svg>
  </div>;
};
export default Logo;
