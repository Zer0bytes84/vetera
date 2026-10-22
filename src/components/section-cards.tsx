"use client";

import { FittedAmount } from "@/shared/ui/fitted-amount";

import type { LucideIcon } from "@/lib/icons";
import {
  Activity,
  AlarmClock,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  ClipboardList,
  Coins,
  PawPrint,
  ReceiptText,
  ShieldAlert,
  Stethoscope,
  Users,
  WalletCards,
} from "@/lib/icons";
import { formatNumber } from "@/utils/display-format";
import { cn } from "@/lib/utils";
import "./section-cards.css";

export interface SectionCardItem {
  onClick?: () => void;
  actionLabel?: string;
  badge?: string;
  footerDescription?: string;
  footerTitle?: string;
  detailRow?: string;
  icon?: LucideIcon;
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

type Sense = "good" | "bad" | "watch" | "neutral";
const toneSense: Record<NonNullable<SectionCardItem["tone"]>, Sense> = {
  positive: "good",
  critical: "bad",
  watch: "watch",
  quiet: "neutral",
};

const iconRules: [pattern: RegExp, icon: LucideIcon][] = [
  [/patient/i, PawPrint],
  [/rendez-vous|créneau|visite/i, Calendar],
  [/consultation|vétérinaire|praticien/i, Stethoscope],
  [/suivi|traitement|activité|terminé/i, Activity],
  [/urgence|relance|rupture|alerte|accès à revoir/i, ShieldAlert],
  [/temps|attente|encours|prochain/i, AlarmClock],
  [/encaissé|solde|revenu|valeur|panier|ca annuel|stock/i, WalletCards],
  [/dépensé|décaissement|écriture|facturé/i, ReceiptText],
  [/équipe|support/i, Users],
  [/rappel|action/i, ClipboardList],
];

function resolveDefaultIcon(title: string, index: number) {
  const matchedRule = iconRules.find(([pattern]) => pattern.test(title));
  if (matchedRule) {
    return matchedRule[1];
  }

  const defaultIcons = [Coins, Calendar, Users, ClipboardList];
  return defaultIcons[index % defaultIcons.length] || Coins;
}

function renderDeltaBadge(item: SectionCardItem) {
  // Numeric change: only a real variation gets an arrow, coloured by meaning.
  if (item.change !== undefined && item.change !== null) {
    const kind = item.changeKind ?? "variation";
    const label = item.changeLabel || (item.inverse ? "vs échéances précédentes" : "vs période précédente");
    if (kind === "count") {
      const sense: Sense = item.tone ? toneSense[item.tone] : item.change === 0 ? "neutral" : item.inverse ? "bad" : "good";
      return (
        <span className="delta" data-sense={sense}>
          <span>{formatNumber(item.change)}</span>
          <span className="delta-label">{label}</span>
        </span>
      );
    }
    // A percentage of nothing says nothing: hide it when the base is zero.
    if (item.changeBase === 0) {
      return item.changeLabel ? (
        <span className="delta" data-sense="neutral">
          <span className="delta-label">{item.changeLabel}</span>
        </span>
      ) : null;
    }
    if (kind === "rate") {
      return (
        <span className="delta" data-sense="neutral">
          <span>{formatNumber(item.change, { maximumFractionDigits: 1 })} %</span>
          <span className="delta-label">{label}</span>
        </span>
      );
    }
    const isZero = item.change === 0;
    const good = item.inverse ? item.change < 0 : item.change > 0;
    const sense: Sense = isZero ? "neutral" : good ? "good" : "bad";
    const Icon = item.change < 0 ? ArrowDownRight : ArrowUpRight;
    const unit = kind === "difference" ? "" : " %";
    const formattedPercent = `${item.change > 0 ? "+" : ""}${formatNumber(item.change, { maximumFractionDigits: 1 })}${unit}`;
    return (
      <span className="delta" data-sense={sense}>
        {!isZero && <Icon size={13} strokeWidth={1.5} aria-hidden="true" />}
        <span>{formattedPercent}</span>
        <span className="delta-label">{label}</span>
      </span>
    );
  }

  // Text badge: a status, never a trend. Colour comes from its tone only.
  if (item.badge) {
    return (
      <span className="delta" data-sense={item.tone ? toneSense[item.tone] : "neutral"}>
        <span className="delta-badge-value">{item.badge}</span>
        {item.changeLabel && <span className="delta-label">{item.changeLabel}</span>}
      </span>
    );
  }

  // Footer title shown as a quiet label when there is no detail row.
  if (item.footerTitle && !item.detailRow) {
    return (
      <span className="delta" data-sense="neutral">
        <span className="delta-label">{item.footerTitle}</span>
      </span>
    );
  }

  return null;
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
      <div
        className="kpis frame section-atlas-grid"
        data-card-count={items.length}
        aria-live="polite"
      >
        {items.map((item, idx) => {
          const Icon = item.icon || resolveDefaultIcon(item.title, idx);
          const Content = item.onClick ? "button" : "div";
          const detailText =
            item.detailRow || (item.badge ? item.footerTitle : item.footerDescription);

          return (
            <Content
              key={item.title}
              className={cn("kpi section-atlas-card group")}
              data-kpi={item.title}
              onClick={item.onClick}
              {...(item.onClick ? { type: "button" as const } : {})}
              aria-label={item.onClick ? `Voir ${item.title}` : undefined}
            >
              <span className="kpiHead">
                <span>
                  <Icon
                    aria-hidden="true"
                    size={16}
                    strokeWidth={1}
                    className="section-atlas-title-icon"
                  />
                  <span>{item.title}</span>
                </span>
                <ArrowRight
                  size={15}
                  strokeWidth={1}
                  className="kpiGo"
                  aria-hidden="true"
                />
              </span>

              <FittedAmount
                className="kpiValue section-atlas-value"
                value={typeof item.value === "number" ? formatNumber(item.value) : item.value}
                maxFontSize={32}
              />

              <span className="kpiSub">
                {renderDeltaBadge(item)}
                {detailText && (
                  <span className="kpiDetailRow section-atlas-context">
                    {detailText}
                  </span>
                )}
              </span>
            </Content>
          );
        })}
      </div>
    </section>
  );
}
