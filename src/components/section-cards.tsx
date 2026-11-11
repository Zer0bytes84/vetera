"use client";

import type { ReactNode } from "react";
import { StatGrid, type Stat, type StatIcon, type StatTone } from "@/components/ui/stat-grid";
import {
  BanknotesIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  PlusCircleIcon,
  ReceiptPercentIcon,
  ShieldExclamationIcon,
  Squares2X2Icon,
  UsersIcon,
  WalletIcon,
} from "@heroicons/react/20/solid";
import { formatNumber } from "@/utils/display-format";
import { cn } from "@/lib/utils";

export interface SectionCardItem {
  onClick?: () => void;
  actionLabel?: string;
  badge?: string;
  footerDescription?: string;
  footerTitle?: string;
  detailRow?: string;
  icon?: StatIcon;
  sparkData?: number[];
  title: string;
  tone?: "critical" | "positive" | "quiet" | "watch";
  trend?: "up" | "down" | "neutral";
  value: string | number;
  change?: number | null;
  /**
   * How `change` reads. "variation" (default): percentage vs a previous value,
   * the only kind with a trend arrow. "rate": a share such as a completion rate.
   * "count": a plain number of items. "difference": a signed change in
   * units vs a previous value (e.g. +2 vs hier), shown with an arrow.
   */
  changeKind?: "variation" | "rate" | "count" | "difference";
  /** Previous value (variation) or denominator (rate). Zero hides the percentage. */
  changeBase?: number | null;
  changeLabel?: string;
  /** True when a rise is bad news (overdue items, stock alerts). */
  inverse?: boolean;
}

/*
 * The strip of figures at the top of a page, drawn as the dashboard's « Chiffres clés »: the same frame, the same cards
 * (icon chip, label, figure, badge, one short line). Pages keep passing `SectionCardItem`s; this maps each to a `Stat`.
 */
const TONES: Record<NonNullable<SectionCardItem["tone"]>, StatTone> = {
  positive: "green",
  critical: "rose",
  watch: "amber",
  quiet: "blue",
};

const iconRules: [pattern: RegExp, icon: StatIcon][] = [
  [/patient/i, UsersIcon],
  [/rendez-vous|créneau|visite/i, CalendarDaysIcon],
  [/consultation|vétérinaire|praticien/i, PlusCircleIcon],
  [/suivi|traitement|activité|terminé/i, ChartBarIcon],
  [/urgence|relance|rupture|alerte|accès à revoir/i, ShieldExclamationIcon],
  [/temps|attente|encours|prochain/i, ClockIcon],
  [/encaissé|solde|revenu|valeur|panier|ca annuel|stock/i, WalletIcon],
  [/dépensé|décaissement|écriture|facturé/i, ReceiptPercentIcon],
  [/équipe|support/i, UsersIcon],
  [/rappel|action/i, ClipboardDocumentListIcon],
];

function resolveDefaultIcon(title: string, index: number) {
  const matchedRule = iconRules.find(([pattern]) => pattern.test(title));
  if (matchedRule) {
    return matchedRule[1];
  }

  const defaultIcons = [BanknotesIcon, CalendarDaysIcon, UsersIcon, ClipboardDocumentListIcon];
  return defaultIcons[index % defaultIcons.length] || BanknotesIcon;
}

/** What the card's badge says: a variation, a rate, a count, or a status text; and whether it reads as good news. */
function badgeOf(
  item: SectionCardItem,
): Pick<Stat, "delta" | "deltaText" | "higherIsBetter"> {
  const sense =
    item.tone === "positive" ? 1 : item.tone === "critical" ? -1 : 0;
  if (item.change !== undefined && item.change !== null) {
    const kind = item.changeKind ?? "variation";
    if (kind === "count")
      return { delta: sense, deltaText: formatNumber(item.change) };
    // A percentage of nothing says nothing: hide it when the base is zero.
    if (item.changeBase === 0) return {};
    if (kind === "rate")
      return {
        delta: 0,
        deltaText: `${formatNumber(item.change, { maximumFractionDigits: 1 })} %`,
      };
    const unit = kind === "difference" ? "" : " %";
    return {
      delta: item.change,
      higherIsBetter: !item.inverse,
      deltaText: `${item.change > 0 ? "+" : ""}${formatNumber(item.change, { maximumFractionDigits: 1 })}${unit}`,
    };
  }
  // A text badge is a status, never a trend: its colour comes from the tone only.
  if (item.badge) return { delta: sense, deltaText: item.badge };
  return {};
}

export function SectionCards({
  items,
  compact = false,
  title = "Chiffres clés",
  subtitle,
  icon = Squares2X2Icon,
  actions,
  className,
}: {
  items: SectionCardItem[];
  compact?: boolean;
  /** The band's title, as on the dashboard (« Chiffres clés »), and a few words under it saying what the figures cover. */
  title?: string;
  subtitle?: string;
  /** The band's icon: each page has its own. */
  icon?: StatIcon;
  /** On the right of the band's header: the page's main action, as a pill. */
  actions?: ReactNode;
  className?: string;
}) {
  const stats: Stat[] = items.map((item, idx) => {
    const detail =
      item.detailRow ||
      (item.badge ? item.footerTitle : item.footerDescription) ||
      (!item.badge && item.footerTitle) ||
      undefined;
    return {
      id: item.title,
      label: item.title,
      value:
        typeof item.value === "number" ? formatNumber(item.value) : item.value,
      icon: item.icon || resolveDefaultIcon(item.title, idx),
      tone: TONES[item.tone ?? "quiet"],
      emphasize: item.tone === "critical" && Number(item.value) > 0,
      hint: detail,
      ariaLabel: item.onClick ? `Voir ${item.title}` : undefined,
      ...badgeOf(item),
    };
  });
  const byId = new Map(items.map((item) => [item.title, item]));
  return (
    <section
      aria-label="Indicateurs de la rubrique"
      className={cn(
        "section-atlas",
        compact && "section-atlas-compact",
        className,
      )}
    >
      <StatGrid
        className="max-w-none"
        data={stats}
        goals={false}
        icon={icon}
        layout="row"
        onSelect={
          items.some((item) => item.onClick)
            ? (stat) => byId.get(stat.id)?.onClick?.()
            : undefined
        }
        sparklines={false}
        subtitle={subtitle}
        title={title}
        toolbar={
          actions ? (
            <div className="flex items-center gap-2" data-slot="band-actions">
              {actions}
            </div>
          ) : undefined
        }
      />
    </section>
  );
}
