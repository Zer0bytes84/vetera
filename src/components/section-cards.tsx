"use client";

import { TrendingDown, TrendingUp, Coins, Calendar, Users, ClipboardList } from "lucide-react";
import { useMotionValue, useMotionTemplate, motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GridPattern } from "@/components/GridPattern";
import { cn } from "@/lib/utils";

export interface SectionCardItem {
  badge: string;
  footerDescription: string;
  footerTitle: string;
  title: string;
  trend: "up" | "down" | "neutral";
  value: string;
  icon?: React.ComponentType<any>;
}

function SectionCard({ item, idx }: { item: SectionCardItem; idx: number }) {
  const isUp = item.trend === "up";
  const isDown = item.trend === "down";
  const TrendIcon = isUp
    ? TrendingUp
    : isDown
      ? TrendingDown
      : TrendingUp;

  const icons = [Coins, Calendar, Users, ClipboardList];
  const IconComponent = item.icon || icons[idx] || Coins;

  // Framer Motion cursor tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const maskImage = useMotionTemplate`radial-gradient(180px at ${mouseX}px ${mouseY}px, white, transparent)`;
  const style = { maskImage, WebkitMaskImage: maskImage };

  return (
    <Card
      className={cn(
        "dashboard-kpi-card @container/card group relative flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-md active:scale-[0.995] rounded-[24px] border-transparent",
        idx === 0
          ? "bg-gradient-to-r from-[#D7EDEA]/90 to-[#F4FBDF]/90 dark:from-[#1b3431]/80 dark:to-[#25301a]/80"
          : "bg-white/75 dark:bg-zinc-900/40 backdrop-blur-md"
      )}
      key={idx}
      onMouseMove={onMouseMove}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        {/* Grid pattern layer (Always visible, fades slightly on hover) */}
        <div className="absolute inset-0 rounded-[24px] transition-opacity duration-300 [mask-image:linear-gradient(white,transparent)] group-hover:opacity-50">
          <GridPattern
            width={60}
            height={46}
            x="50%"
            y={-1}
            className="absolute inset-x-0 inset-y-[-30%] h-[160%] w-full skew-y-[-18deg] fill-zinc-900/[0.015] stroke-zinc-900/[0.06] dark:fill-white/[0.03] dark:stroke-white/[0.08]"
          />
        </div>
        {/* Gradient overlay layer (Protocol mouse-tracking glow) */}
        <motion.div
          className="absolute inset-0 rounded-[24px] bg-linear-to-r from-[#D7EDEA] to-[#F4FBDF] dark:from-[#223d3a] dark:to-[#363d27] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={style}
        />
        {/* Grid overlay with mix-blend (Protocol mouse-tracking overlay) */}
        <motion.div
          className="absolute inset-0 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-overlay"
          style={style}
        >
          <GridPattern
            width={60}
            height={46}
            x="50%"
            y={-1}
            className="absolute inset-x-0 inset-y-[-30%] h-[160%] w-full skew-y-[-18deg] fill-zinc-900/8 stroke-zinc-900/12 dark:fill-white/[0.05] dark:stroke-white/[0.18]"
          />
        </motion.div>
      </div>
      <CardHeader className="relative z-10 space-y-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/5 ring-1 ring-zinc-900/15 backdrop-blur-[2px] transition duration-300 group-hover:bg-white/60 group-hover:ring-zinc-900/20 dark:bg-white/7.5 dark:ring-white/10 dark:group-hover:bg-emerald-300/10 dark:group-hover:ring-emerald-400">
          <IconComponent className="h-4.5 w-4.5 text-zinc-600 transition-colors duration-300 group-hover:text-zinc-950 dark:text-zinc-400 dark:group-hover:text-emerald-400" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <CardDescription className="dashboard-kpi-label font-sans font-bold tracking-wider text-[10px] uppercase text-muted-foreground/90 leading-none">
            {item.title}
          </CardDescription>
          <CardTitle className="dashboard-kpi-value font-display font-semibold text-3xl leading-none tracking-tight text-foreground tabular-nums flex items-baseline gap-0.5 mt-1.5">
            {item.value.endsWith("DA") ? (
              <>
                <span className="truncate">{item.value.replace(/\s*DA$/, "")}</span>
                <span className="shrink-0 font-sans text-xs font-semibold text-muted-foreground/80">&nbsp;DA</span>
              </>
            ) : (
              <span className="truncate">{item.value}</span>
            )}
          </CardTitle>
        </div>
        <CardAction>
          <Badge
            className={cn(
              "font-sans font-bold rounded-full px-2.5 py-0.5 border text-[10px] tracking-wide",
              isUp
                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-400 border-emerald-500/20 shadow-[0_2px_8px_rgba(16,185,129,0.08)]"
                : isDown
                  ? "bg-rose-500/10 text-rose-600 dark:bg-rose-500/5 dark:text-rose-400 border-rose-500/20 shadow-[0_2px_8px_rgba(244,63,94,0.08)]"
                  : "bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/5 dark:text-zinc-400 border-zinc-500/20"
            )}
            variant="outline"
          >
            <TrendIcon className="size-3" />
            {item.badge}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="relative z-10 flex-col items-start gap-0.5 mt-auto h-16 justify-center !p-4 !bg-muted/50 border-t">
        <div className="w-full truncate flex items-center gap-1.5 font-semibold text-xs text-foreground tracking-tight">
          {item.footerTitle} <TrendIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </div>
        <div className="w-full truncate text-[11px] text-muted-foreground/80 font-medium">
          {item.footerDescription}
        </div>
      </CardFooter>
    </Card>
  );
}

export function SectionCards({ items }: { items: SectionCardItem[] }) {
  return (
    <div className="dashboard-kpi-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, idx) => (
        <SectionCard key={idx} item={item} idx={idx} />
      ))}
    </div>
  );
}
