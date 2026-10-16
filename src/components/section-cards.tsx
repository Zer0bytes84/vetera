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
  changeLabel?: string;
  inverse?: boolean;
}

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
  // Case 1: numeric change percentage
  if (item.change !== undefined && item.change !== null) {
    const isZero = item.change === 0;
    const isUp = item.inverse ? item.change < 0 : item.change > 0;
    const dir = isZero ? "flat" : isUp ? "up" : "down";
    const Icon = item.change < 0 ? ArrowDownRight : ArrowUpRight;
    const formattedPercent = `${item.change > 0 ? "+" : ""}${formatNumber(item.change, { maximumFractionDigits: 1 })} %`;
    return (
      <span className="delta" data-dir={dir}>
        {!isZero && <Icon size={13} strokeWidth={1.5} aria-hidden="true" />}
        <span>{formattedPercent}</span>
        <span className="delta-label">
          {item.changeLabel || (item.inverse ? "vs échéances précédentes" : "vs période précédente")}
        </span>
      </span>
    );
  }

  // Case 2: badge text provided
  if (item.badge) {
    const isUp = item.trend === "up" || item.tone === "positive";
    const isDown = item.trend === "down" || item.tone === "critical";
    const dir = isUp ? "up" : isDown ? "down" : "flat";
    const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : null;

    return (
      <span className="delta" data-dir={dir}>
        {Icon && <Icon size={13} strokeWidth={1.5} aria-hidden="true" />}
        <span className="delta-badge-value">{item.badge}</span>
        {item.changeLabel && <span className="delta-label">{item.changeLabel}</span>}
      </span>
    );
  }

  // Case 3: footerTitle as delta label if no detailRow provided
  if (item.footerTitle && !item.detailRow) {
    const isUp = item.trend === "up";
    const isDown = item.trend === "down";
    const dir = isUp ? "up" : isDown ? "down" : "flat";
    const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : null;
    return (
      <span className="delta" data-dir={dir}>
        {Icon && <Icon size={13} strokeWidth={1.5} aria-hidden="true" />}
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
