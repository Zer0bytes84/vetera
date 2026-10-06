"use client";

import { FittedAmount } from "@/shared/ui/fitted-amount";

import type { LucideIcon } from "@/lib/icons";
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
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import "./section-cards.css";

export interface SectionCardItem {
  onClick?: () => void;
  actionLabel?: string;
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
  [/rappel|action/i, ClipboardList],
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
    <section
      className={cn(
        "section-atlas",
        compact && "section-atlas-compact",
        className
      )}
      aria-label="Indicateurs de la rubrique"
    >
      <ul className="section-atlas-grid" data-card-count={items.length}>
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
          const supportingCopy = showDescription ? item.footerDescription : "";
          const Content = item.onClick ? "button" : "div";
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
              <Content className="section-atlas-content" onClick={item.onClick} {...(item.onClick ? { type: "button" as const } : {})}>
                <div className="section-atlas-card-heading">
                  <p className="section-atlas-label">
                    <Icon aria-hidden="true" className="section-atlas-title-icon" size={14} strokeWidth={1.5} />
                    <span>{item.title}</span>
                  </p>
                </div>
                <div className="section-atlas-body">
                  <FittedAmount className="section-atlas-value" value={item.value} maxFontSize={compact ? 28 : 34} />
                  <p className="section-atlas-context">{item.footerTitle}</p>
                  <p
                    className="section-atlas-detail"
                    title={supportingCopy}
                  >
                    {supportingCopy}
                  </p>
                  <span
                    className={cn(
                      "section-atlas-status flex w-fit max-w-full items-center gap-1 rounded-md px-1.5 py-1 font-medium text-[10px] leading-[1.2]",
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
                  {item.onClick && <span className="section-atlas-action">{item.actionLabel || "Ouvrir la rubrique"}<ArrowUpRight size={14} aria-hidden="true" /></span>}
                </div>
              </Content>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
