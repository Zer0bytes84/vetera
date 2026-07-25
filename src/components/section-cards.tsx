"use client";

import {
  Activity,
  AlarmClock,
  Calendar,
  ClipboardList,
  Coins,
  Minus,
  PawPrint,
  ReceiptText,
  ShieldAlert,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

export interface SectionCardItem {
  badge: string;
  footerDescription: string;
  footerTitle: string;
  icon?: React.ComponentType<any>;
  sparkData?: number[];
  title: string;
  trend: "up" | "down" | "neutral";
  value: string;
}

const iconRules: Array<[
  pattern: RegExp,
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>,
]> = [
  [/patient/i, PawPrint],
  [/rendez-vous|créneau|visite/i, Calendar],
  [/consultation|vétérinaire|praticien/i, Stethoscope],
  [/suivi|traitement|activité|terminé/i, Activity],
  [/urgence|relance|rupture|alerte|accès à revoir/i, ShieldAlert],
  [/temps|attente|encours|prochain/i, AlarmClock],
  [/encaissé|solde|revenu|valeur|panier|ca annuel/i, WalletCards],
  [/dépensé|décaissement|écriture/i, ReceiptText],
  [/équipe|support/i, Users],
];

function resolveDefaultIcon(title: string, index: number) {
  const matchedRule = iconRules.find(([pattern]) => pattern.test(title));
  if (matchedRule) {
    return matchedRule[1];
  }

  const defaultIcons = [Coins, Calendar, Users, ClipboardList];
  return defaultIcons[index % defaultIcons.length] || Coins;
}

export function SectionCards({
  items,
  compact = false,
  className,
}: {
  items: SectionCardItem[];
  compact?: boolean;
  className?: string;
}) {
  const toneStyles = [
    {
      accent: "from-blue-500/80 via-sky-400/65 to-transparent",
      glow: "bg-blue-500/8 dark:bg-blue-400/6",
      icon: "bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300",
    },
    {
      accent: "from-rose-500/80 via-orange-400/65 to-transparent",
      glow: "bg-rose-500/8 dark:bg-rose-400/6",
      icon: "bg-rose-500/10 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
    },
    {
      accent: "from-emerald-500/80 via-teal-400/65 to-transparent",
      glow: "bg-emerald-500/8 dark:bg-emerald-400/6",
      icon: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
    },
    {
      accent: "from-amber-500/80 via-yellow-400/65 to-transparent",
      glow: "bg-amber-500/8 dark:bg-amber-400/6",
      icon: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300",
    },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4",
        className
      )}
    >
      {items.map((item, idx) => {
        const Icon = item.icon || resolveDefaultIcon(item.title, idx);
        const isUp = item.trend === "up";
        const isDown = item.trend === "down";
        const tone = toneStyles[idx % toneStyles.length] ?? toneStyles[0];
        const showDescription =
          item.footerDescription &&
          item.footerDescription.toLowerCase() !==
            item.footerTitle.toLowerCase();

        return (
          <div
            className={cn(
              "group relative grid overflow-hidden rounded-[20px] border border-border/80 bg-card/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-[transform,border-color,box-shadow] duration-300 ease-out",
              "hover:-translate-y-0.5 hover:border-foreground/12 hover:shadow-[0_12px_30px_rgba(15,23,42,0.07)] dark:bg-card/70 dark:hover:border-white/15 dark:hover:shadow-[0_14px_34px_rgba(0,0,0,0.2)]",
              compact ? "min-h-[148px] p-4" : "min-h-[174px] p-5"
            )}
            key={`${item.title}-${idx}`}
          >
            <div
              aria-hidden="true"
              className={cn(
                "absolute inset-x-0 top-0 h-px bg-gradient-to-r",
                tone.accent
              )}
            />
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute top-0 right-0 size-32 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100",
                tone.glow
              )}
            />

            <div className="relative z-10 grid h-full grid-rows-[auto_1fr_auto]">
              <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-[1.04]",
                      tone.icon
                    )}
                  >
                    <Icon className="size-[17px]" strokeWidth={1.8} />
                  </span>
                  <span className="line-clamp-2 font-semibold text-[11px] text-muted-foreground uppercase leading-[1.25] tracking-[0.08em]">
                    {item.title}
                  </span>
              </div>

              <div
                className={cn(
                  "flex min-w-0 items-center justify-between gap-3",
                  compact
                    ? "py-3"
                    : "py-4"
                )}
              >
                <span
                  className={cn(
                    "min-w-0 truncate font-semibold text-foreground leading-none tracking-[-0.045em] [font-variant-numeric:tabular-nums]",
                    compact
                      ? "text-[clamp(1.65rem,2.2vw,2rem)]"
                      : "text-[clamp(1.85rem,2.5vw,2.35rem)]"
                  )}
                >
                  {item.value}
                </span>
                <span className="max-w-[48%] shrink-0 truncate rounded-full border border-border/70 bg-muted/45 px-2.5 py-1 font-medium text-[10px] text-muted-foreground leading-none">
                  {item.badge}
                </span>
              </div>

              <div className="flex min-w-0 items-end justify-between gap-3 border-border/60 border-t pt-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground/85 text-xs">
                    {item.footerTitle}
                  </p>
                  {showDescription ? (
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground/80 leading-4">
                      {item.footerDescription}
                    </p>
                  ) : null}
                </div>
                <span
                  aria-label={
                    isUp
                      ? "Tendance en hausse"
                      : isDown
                        ? "Tendance en baisse"
                        : "Tendance stable"
                  }
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border",
                    isUp
                      ? "border-emerald-500/15 bg-emerald-500/8 text-emerald-600 dark:text-emerald-300"
                      : isDown
                        ? "border-rose-500/15 bg-rose-500/8 text-rose-600 dark:text-rose-300"
                        : "border-border/70 bg-muted/40 text-muted-foreground"
                  )}
                >
                  {isUp ? (
                    <TrendingUp className="size-3.5" strokeWidth={2} />
                  ) : isDown ? (
                    <TrendingDown className="size-3.5" strokeWidth={2} />
                  ) : (
                    <Minus className="size-3.5" strokeWidth={2} />
                  )}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
