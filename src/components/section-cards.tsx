"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlarmClock,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ClipboardList,
  Coins,
  Minus,
  PawPrint,
  ReceiptText,
  ShieldAlert,
  Stethoscope,
  TriangleAlert,
  Users,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionCardItem {
  badge: string;
  footerDescription: string;
  footerTitle: string;
  icon?: LucideIcon;
  sparkData?: number[];
  title: string;
  tone?: "critical" | "positive" | "quiet" | "watch";
  trend: "up" | "down" | "neutral";
  value: string;
}

const iconRules: [pattern: RegExp, icon: LucideIcon][] = [
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

const CRITICAL_SIGNAL_PATTERN = /urgence|rupture|relance|accès à revoir|alerte/;
const POSITIVE_SIGNAL_PATTERN = /terminé|encaissé|équipe active/;
const WATCH_SIGNAL_PATTERN = /stock bas|en attente|suivi clinique|encours/;

function resolveDefaultIcon(title: string, index: number) {
  const matchedRule = iconRules.find(([pattern]) => pattern.test(title));
  if (matchedRule) {
    return matchedRule[1];
  }

  const defaultIcons = [Coins, Calendar, Users, ClipboardList];
  return defaultIcons[index % defaultIcons.length] || Coins;
}

type SignalTone = "critical" | "positive" | "quiet" | "watch";

const signalToneStyles: Record<
  SignalTone,
  { dot: string; icon: string; status: string }
> = {
  critical: {
    dot: "bg-rose-500",
    icon: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
    status:
      "bg-rose-50 text-rose-700 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-300/10",
  },
  positive: {
    dot: "bg-emerald-500",
    icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    status:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-300/10",
  },
  quiet: {
    dot: "bg-zinc-400 dark:bg-zinc-500",
    icon: "bg-zinc-100 text-zinc-600 dark:bg-white/7 dark:text-zinc-300",
    status:
      "bg-zinc-100 text-zinc-600 ring-zinc-950/5 dark:bg-white/7 dark:text-zinc-300 dark:ring-white/8",
  },
  watch: {
    dot: "bg-amber-500",
    icon: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    status:
      "bg-amber-50 text-amber-800 ring-amber-600/10 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-300/10",
  },
};

function hasPositiveCount(value: string) {
  const parsedValue = Number.parseFloat(
    value.replace(/[^\d.,-]/g, "").replace(",", ".")
  );
  return Number.isFinite(parsedValue) && parsedValue > 0;
}

function resolveSignalTone(item: SectionCardItem): SignalTone {
  if (item.tone) {
    return item.tone;
  }

  const title = item.title.toLowerCase();
  const isActiveSignal = hasPositiveCount(item.value);

  if (isActiveSignal && CRITICAL_SIGNAL_PATTERN.test(title)) {
    return "critical";
  }

  if (isActiveSignal && WATCH_SIGNAL_PATTERN.test(title)) {
    return "watch";
  }

  if (POSITIVE_SIGNAL_PATTERN.test(title)) {
    return item.trend === "down" ? "watch" : "positive";
  }

  return "quiet";
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
  return (
    <ul
      className={cn(
        "grid list-none grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4",
        className
      )}
    >
      {items.map((item, idx) => {
        const Icon = item.icon || resolveDefaultIcon(item.title, idx);
        const isUp = item.trend === "up";
        const isDown = item.trend === "down";
        const signalTone = resolveSignalTone(item);
        const tone = signalToneStyles[signalTone];
        const showDescription =
          item.footerDescription &&
          item.footerDescription.toLowerCase() !==
            item.footerTitle.toLowerCase();
        const supportingCopy = showDescription
          ? `${item.footerTitle} · ${item.footerDescription}`
          : item.footerTitle;
        let TrendIcon = Minus;
        if (signalTone === "critical" || signalTone === "watch") {
          TrendIcon = TriangleAlert;
        } else if (isUp) {
          TrendIcon = ArrowUpRight;
        } else if (isDown) {
          TrendIcon = ArrowDownRight;
        }

        return (
          <li
            className={cn(
              "section-card-motion group relative rounded-[16px] border border-border/80 bg-card",
              "hover:border-foreground/15 hover:bg-muted/10 dark:hover:border-white/15 dark:hover:bg-white/[0.025]",
              compact ? "min-h-[148px] p-4" : "min-h-[164px] p-5"
            )}
            key={item.title}
          >
            <div className="grid h-full grid-rows-[auto_1fr_auto]">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-[10px]",
                    tone.icon
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={1.8}
                  />
                </span>
                <span className="line-clamp-2 min-w-0 font-medium text-[13px] text-foreground/80 leading-4">
                  {item.title}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "ml-auto size-1.5 shrink-0 rounded-full",
                    tone.dot
                  )}
                />
              </div>

              <div
                className={cn(
                  "flex min-w-0 flex-wrap items-end justify-between gap-3",
                  "py-3"
                )}
              >
                <span
                  className={cn(
                    "min-w-0 break-words font-semibold text-foreground leading-none tracking-[-0.035em] [font-variant-numeric:tabular-nums] [overflow-wrap:anywhere]",
                    compact
                      ? "text-[clamp(1.6rem,2vw,1.9rem)]"
                      : "text-[clamp(1.75rem,2.1vw,2.1rem)]"
                  )}
                  title={item.value}
                >
                  {item.value}
                </span>
                <span
                  className={cn(
                    "flex max-w-[56%] shrink-0 items-center gap-1 rounded-full px-2 py-1 text-right font-medium text-[10px] leading-[1.2] ring-1 ring-inset",
                    tone.status
                  )}
                  title={item.badge}
                >
                  <TrendIcon
                    aria-hidden="true"
                    className="size-3"
                    strokeWidth={2}
                  />
                  {item.badge}
                </span>
              </div>

              <div className="min-h-[38px] min-w-0 border-border/60 border-t pt-3">
                <p
                  className="text-[11px] text-muted-foreground leading-4"
                  title={supportingCopy}
                >
                  {supportingCopy}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
