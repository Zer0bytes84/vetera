"use client";

import { FloralArtwork } from "@/components/FloralArtwork";
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
import { useFloralBackground } from "@/lib/floral-background";
import "./section-cards.css";

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
  const [background] = useFloralBackground();
  return (
    <section
      className={cn(
        "section-atlas",
        compact && "section-atlas-compact",
        className
      )}
      aria-label="Indicateurs de la rubrique"
    >
      <FloralArtwork className="section-atlas-art" scene={background} />
      <div className="section-atlas-caption">
        <PawPrint size={14} aria-hidden="true" />
        Votre cabinet, en un regard
      </div>
      <ul className={cn("section-atlas-grid")}>
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
              data-signal-tone={signalTone}
              className={cn("section-atlas-card group")}
              key={item.title}
            >
              {/* Liquid glass specular sheen and reflection (no checkers) */}
              <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[18px]">
                {/* Specular glass reflection sweep on hover */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-transparent dark:from-white/10" />
                <div
                  className="absolute -inset-full bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.45)_0%,transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.12)_0%,transparent_60%)]"
                />
                {/* Subtle chromatic / liquid tint on hover */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
                {/* Specular ring */}
                <div className="absolute inset-0 rounded-[18px] ring-1 ring-inset ring-white/60 transition-all duration-300 group-hover:ring-white/90 dark:ring-white/10 dark:group-hover:ring-white/25" />
              </div>

              <div className="relative z-10 flex h-full min-w-0 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "signal-icon flex size-10 shrink-0 items-center justify-center rounded-xl",
                      tone.icon
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-5"
                      strokeWidth={1.8}
                    />
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn("mt-2 size-1.5 rounded-full", tone.dot)}
                  />
                </div>
                <p className="section-atlas-label">{item.title}</p>
                <p
                  className={cn(
                    "section-atlas-value",
                    compact ? "text-[28px]" : "text-[32px]"
                  )}
                  title={item.value}
                >
                  {item.value}
                </p>
                <div className="section-atlas-footer">
                  <p
                    className="min-w-0 text-[11px] text-muted-foreground leading-4"
                    title={supportingCopy}
                  >
                    {supportingCopy}
                  </p>
                  <span
                    className={cn(
                      "flex max-w-[48%] shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-right font-medium text-[10px] leading-[1.2]",
                      tone.status
                    )}
                    title={item.badge}
                  >
                    <TrendIcon
                      aria-hidden="true"
                      className="size-3 shrink-0"
                      strokeWidth={2}
                    />
                    {item.badge}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
