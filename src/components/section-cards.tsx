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
        "dashboard-kpi-card @container/card group relative flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-md active:scale-[0.995]",
        idx === 0
          ? "bg-white dark:bg-zinc-900"
          : "bg-zinc-50 dark:bg-white/2.5"
      )}
      key={idx}
      onMouseMove={onMouseMove}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        {/* Grid pattern layer (Always visible, fades slightly on hover) */}
        <div className="absolute inset-0 rounded-[16px] transition-opacity duration-300 [mask-image:linear-gradient(white,transparent)] group-hover:opacity-50">
          <GridPattern
            width={72}
            height={56}
            x="50%"
            y={-1}
            className="absolute inset-x-0 inset-y-[-30%] h-[160%] w-full skew-y-[-18deg] fill-zinc-900/[0.02] stroke-zinc-900/[0.08] dark:fill-white/[0.04] dark:stroke-white/[0.12]"
          />
        </div>
        {/* Gradient overlay layer (Protocol mouse-tracking glow / default for Revenue) */}
        <motion.div
          className={cn(
            "absolute inset-0 rounded-[16px] bg-linear-to-r from-[#D7EDEA] to-[#F4FBDF] dark:from-[#223d3a] dark:to-[#363d27] transition-opacity duration-300",
            idx === 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          style={idx === 0 ? undefined : style}
        />
        {/* Grid overlay with mix-blend (Protocol mouse-tracking overlay / default for Revenue) */}
        <motion.div
          className={cn(
            "absolute inset-0 rounded-[16px] transition-opacity duration-300 mix-blend-overlay",
            idx === 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          style={idx === 0 ? undefined : style}
        >
          <GridPattern
            width={72}
            height={56}
            x="50%"
            y={-1}
            className="absolute inset-x-0 inset-y-[-30%] h-[160%] w-full skew-y-[-18deg] fill-zinc-900/10 stroke-zinc-900/15 dark:fill-white/[0.07] dark:stroke-white/[0.24]"
          />
        </motion.div>
        {/* Inset ring layer */}
        <div className={cn(
          "absolute inset-0 rounded-[16px] ring-1 ring-inset ring-zinc-900/7.5 dark:ring-white/15 transition-shadow duration-300",
          idx === 0 ? "ring-zinc-900/10 dark:ring-white/30" : "group-hover:ring-zinc-900/10 dark:group-hover:ring-white/30"
        )} />
      </div>
      <CardHeader className="relative z-10 space-y-4">
        <div className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900/5 ring-1 ring-zinc-900/25 backdrop-blur-[2px] transition duration-300 group-hover:bg-white/50 group-hover:ring-zinc-900/25 dark:bg-white/7.5 dark:ring-white/15 dark:group-hover:bg-emerald-300/10 dark:group-hover:ring-emerald-400",
          idx === 0 && "bg-white/50 ring-zinc-900/25 dark:bg-emerald-300/10 dark:ring-emerald-400"
        )}>
          <IconComponent className={cn(
            "h-4 w-4 text-zinc-600 transition-colors duration-300 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-emerald-400",
            idx === 0 && "text-zinc-900 dark:text-emerald-400"
          )} strokeWidth={2} />
        </div>
        <div className="space-y-1">
          <CardDescription className="dashboard-kpi-label">
            {item.title}
          </CardDescription>
          <CardTitle className="dashboard-kpi-value flex items-baseline gap-1 font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {item.value.endsWith("DA") ? (
              <>
                <span className="truncate">{item.value.replace(/\s*DA$/, "")}</span>
                <span className="shrink-0 text-xs text-muted-foreground">&nbsp;DA</span>
              </>
            ) : (
              <span className="truncate">{item.value}</span>
            )}
          </CardTitle>
        </div>
        <CardAction>
          <Badge
            className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-400/20 font-medium"
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
