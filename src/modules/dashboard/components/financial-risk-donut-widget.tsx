"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Focus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import type { Invoice, Transaction } from "@/types/db";
import { billingService } from "@/services/billingService";
import { isTauriRuntime } from "@/services/browser-store";
import { FinancialPeriodFilter, financialPeriodRange } from "@/components/financial-period-filter";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface RiskCategoryData {
  id: string;
  label: string;
  subLabel?: string;
  totalValue: number;
  riskValue: number;
  safeValue: number;
  totalCount?: number;
  riskCount?: number;
  safeCount?: number;
  totalFormatted: string;
  riskFormatted: string;
  safeFormatted?: string;
  color: string;
  stripePatternId: string;
  stripeColor: string;
}

export interface FinancialRiskDonutWidgetProps {
  transactions: Transaction[];
  onOpenFinances?: () => void;
  className?: string;
  currency?: string;
  title?: string;
  subtitle?: string;
  initialHighlightRisk?: boolean;
}

function formatDA(val: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(val)) + "\u00a0DA";
}

export function FinancialRiskDonutWidget({
  className,
  transactions,
  onOpenFinances,
  title = "Recettes & règlements",
  subtitle = "Montants encaissés et soldes à recouvrer sur la période.",
  initialHighlightRisk = true,
}: FinancialRiskDonutWidgetProps) {
  const widgetId = useId().replace(/:/g, "");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [highlightHighRisk, setHighlightHighRisk] = useState(initialHighlightRisk);
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receivablesPage, setReceivablesPage] = useState(0);
  const activeSlice = hoveredSlice ?? selectedCategory;

  useEffect(() => {
    let cancelled = false;
    if (!isTauriRuntime()) return;
    void billingService.listInvoices({ documentStatus: "issued" }).then((rows) => {
      if (!cancelled) setInvoices(rows);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [transactions]);

  const [range, setRange] = useState(() => financialPeriodRange("month", new Date()));
  const channels = [...new Set(transactions.filter(t => t.type === "income").map(t => t.category))].sort();

  const filtered = useMemo(() => {
    return transactions.filter(
      t =>
        t.type === "income" &&
        (selectedChannel === "all" || t.category === selectedChannel) &&
        (!range.from || t.date.slice(0, 10) >= range.from) &&
        (!range.to || t.date.slice(0, 10) <= range.to)
    );
  }, [transactions, selectedChannel, range]);

  const filteredInvoices = useMemo(() => invoices.filter((invoice) => {
    const date = (invoice.issuedAt ?? invoice.createdAt ?? "").slice(0, 10);
    return (!range.from || date >= range.from) && (!range.to || date <= range.to);
  }), [invoices, range]);

  const receivables = useMemo(() => filteredInvoices
    .filter(invoice => invoice.balanceAmount > 0)
    .sort((a, b) => b.balanceAmount - a.balanceAmount || a.id.localeCompare(b.id)), [filteredInvoices]);
  const pageSize = 4;
  const pageCount = Math.max(1, Math.ceil(receivables.length / pageSize));
  const currentPage = Math.min(receivablesPage, pageCount - 1);
  const pageStart = currentPage * pageSize;
  const visibleReceivables = receivables.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setReceivablesPage(0);
  }, [range.from, range.to, selectedChannel]);

  useEffect(() => {
    setReceivablesPage(page => Math.min(page, pageCount - 1));
  }, [pageCount]);

  const sum = (billing: boolean, pending = false) =>
    filtered
      .filter(t => Boolean(t.sourceType) === billing && (!pending || t.status === "pending"))
      .reduce((total, t) => total + t.amount / 100, 0);

  const count = (billing: boolean, pending = false) =>
    filtered.filter(t => Boolean(t.sourceType) === billing && (!pending || t.status === "pending")).length;

  const rawData = useMemo(() => {
    const invoiceTotal = filteredInvoices.reduce((total, invoice) => total + invoice.grossAmount / 100, 0);
    const invoiceRisk = filteredInvoices.reduce((total, invoice) => total + Math.max(0, invoice.balanceAmount) / 100, 0);
    const catATotal = isTauriRuntime() ? invoiceTotal : sum(true);
    const catARisk = isTauriRuntime() ? invoiceRisk : sum(true, true);
    const catASafe = catATotal - catARisk;
    const catATotalCount = isTauriRuntime() ? filteredInvoices.length : count(true);
    const catARiskCount = isTauriRuntime() ? filteredInvoices.filter(invoice => invoice.balanceAmount > 0).length : count(true, true);
    const catASafeCount = catATotalCount - catARiskCount;

    const catBTotal = sum(false);
    const catBRisk = sum(false, true);
    const catBSafe = catBTotal - catBRisk;
    const catBTotalCount = count(false);
    const catBRiskCount = count(false, true);
    const catBSafeCount = catBTotalCount - catBRiskCount;

    return {
      catA: {
        total: catATotal,
        risk: catARisk,
        safe: catASafe,
        totalCount: catATotalCount,
        riskCount: catARiskCount,
        safeCount: catASafeCount,
      },
      catB: {
        total: catBTotal,
        risk: catBRisk,
        safe: catBSafe,
        totalCount: catBTotalCount,
        riskCount: catBRiskCount,
        safeCount: catBSafeCount,
      },
    };
  }, [filtered, filteredInvoices]);

  const categories: RiskCategoryData[] = useMemo(() => {
    return [
      {
        id: "catA",
        label: "Facturation",
        subLabel: "Consultations & actes",
        totalValue: rawData.catA.total,
        riskValue: rawData.catA.risk,
        safeValue: rawData.catA.safe,
        totalCount: rawData.catA.totalCount,
        riskCount: rawData.catA.riskCount,
        safeCount: rawData.catA.safeCount,
        totalFormatted: formatDA(rawData.catA.total),
        riskFormatted: formatDA(rawData.catA.risk),
        safeFormatted: formatDA(rawData.catA.safe),
        color: "#FA2C70", // Vivid Outcrowd neon pink
        stripePatternId: `${widgetId}-pink`,
        stripeColor: "#FA2C70",
      },
      {
        id: "catB",
        label: "Écritures manuelles",
        subLabel: "Ventes comptoir & direct",
        totalValue: rawData.catB.total,
        riskValue: rawData.catB.risk,
        safeValue: rawData.catB.safe,
        totalCount: rawData.catB.totalCount,
        riskCount: rawData.catB.riskCount,
        safeCount: rawData.catB.safeCount,
        totalFormatted: formatDA(rawData.catB.total),
        riskFormatted: formatDA(rawData.catB.risk),
        safeFormatted: formatDA(rawData.catB.safe),
        color: "#5B4DFC", // Outcrowd electric indigo/violet
        stripePatternId: `${widgetId}-indigo`,
        stripeColor: "#5B4DFC",
      },
    ];
  }, [rawData, widgetId]);

  // Aggregate totals
  const grandTotal = categories[0].totalValue + categories[1].totalValue;
  const riskTotal = categories[0].riskValue + categories[1].riskValue;
  const safeTotal = grandTotal - riskTotal;
  const totalTransactions = (rawData.catA.totalCount || 0) + (rawData.catB.totalCount || 0);
  const riskTransactions = (rawData.catA.riskCount || 0) + (rawData.catB.riskCount || 0);
  const safeTransactions = totalTransactions - riskTransactions;
  const recoveryRate = grandTotal > 0 ? Math.round((safeTotal / grandTotal) * 100) : 0;

  // Active contextual insight displayed in the central cockpit HUD
  const activeInsight = useMemo(() => {
    if (!activeSlice || grandTotal <= 0) return null;

    if (activeSlice === "catA" || activeSlice === "catA-total") {
      const recPct = rawData.catA.total > 0 ? Math.round((rawData.catA.safe / rawData.catA.total) * 100) : 0;
      return {
        badge: "Facturation",
        badgeSub: "Dossiers cliniques",
        color: "#FA2C70",
        isHatched: false,
        amountFormatted: formatDA(rawData.catA.total),
        sharePct: Math.round((rawData.catA.total / grandTotal) * 100),
        detail: `${rawData.catA.safeCount} soldés • ${rawData.catA.riskCount} en attente`,
        status: recPct === 100 ? "Soldé à 100%" : `${recPct}% encaissé`,
        statusType: recPct === 100 ? "safe" : rawData.catA.risk > 0 ? "risk" : "neutral",
      };
    }
    if (activeSlice === "catA-safe") {
      return {
        badge: "Facturation",
        badgeSub: "Règlements encaissés",
        color: "#FA2C70",
        isHatched: false,
        amountFormatted: formatDA(rawData.catA.safe),
        sharePct: Math.round((rawData.catA.safe / grandTotal) * 100),
        detail: `${rawData.catA.safeCount} acte${rawData.catA.safeCount > 1 ? "s" : ""} réglé${rawData.catA.safeCount > 1 ? "s" : ""}`,
        status: "Sécurisé en caisse",
        statusType: "safe",
      };
    }
    if (activeSlice === "catA-risk") {
      return {
        badge: "Facturation",
        badgeSub: "Créances en attente",
        color: "#FA2C70",
        isHatched: true,
        amountFormatted: formatDA(rawData.catA.risk),
        sharePct: Math.round((rawData.catA.risk / grandTotal) * 100),
        detail: `${rawData.catA.riskCount} dossier${rawData.catA.riskCount > 1 ? "s" : ""} à encaisser`,
        status: "À rapprocher",
        statusType: "risk",
      };
    }
    if (activeSlice === "catB" || activeSlice === "catB-total") {
      const recPct = rawData.catB.total > 0 ? Math.round((rawData.catB.safe / rawData.catB.total) * 100) : 0;
      return {
        badge: "Écritures",
        badgeSub: "Comptoir & Direct",
        color: "#5B4DFC",
        isHatched: false,
        amountFormatted: formatDA(rawData.catB.total),
        sharePct: Math.round((rawData.catB.total / grandTotal) * 100),
        detail: `${rawData.catB.safeCount} soldés • ${rawData.catB.riskCount} en attente`,
        status: recPct === 100 ? "Soldé à 100%" : `${recPct}% encaissé`,
        statusType: recPct === 100 ? "safe" : rawData.catB.risk > 0 ? "risk" : "neutral",
      };
    }
    if (activeSlice === "catB-safe") {
      return {
        badge: "Écritures",
        badgeSub: "Encaissé comptant",
        color: "#5B4DFC",
        isHatched: false,
        amountFormatted: formatDA(rawData.catB.safe),
        sharePct: Math.round((rawData.catB.safe / grandTotal) * 100),
        detail: `${rawData.catB.safeCount} vente${rawData.catB.safeCount > 1 ? "s" : ""} réglée${rawData.catB.safeCount > 1 ? "s" : ""}`,
        status: "Sécurisé en caisse",
        statusType: "safe",
      };
    }
    if (activeSlice === "catB-risk") {
      return {
        badge: "Écritures",
        badgeSub: "En attente / Différé",
        color: "#5B4DFC",
        isHatched: true,
        amountFormatted: formatDA(rawData.catB.risk),
        sharePct: Math.round((rawData.catB.risk / grandTotal) * 100),
        detail: `${rawData.catB.riskCount} paiement${rawData.catB.riskCount > 1 ? "s" : ""} en attente`,
        status: "À rapprocher",
        statusType: "risk",
      };
    }
    return null;
  }, [activeSlice, grandTotal, rawData]);

  interface DonutSlice {
    id: string;
    categoryId: string;
    label: string;
    value: number;
    percentage: number;
    color: string;
    fill: string;
    isHatched: boolean;
    startAngle: number;
    endAngle: number;
  }

  const slices: DonutSlice[] = useMemo(() => {
    if (grandTotal <= 0) return [];

    let currentAngle = 0;
    const result: DonutSlice[] = [];

    if (highlightHighRisk) {
      // 4 slices: CatA Safe, CatA Risk, CatB Safe, CatB Risk
      const sliceDefs = [
        {
          id: "catA-safe",
          categoryId: "catA",
          label: "Facturation - Encaissé",
          value: categories[0].safeValue,
          color: categories[0].color,
          fill: categories[0].color,
          isHatched: false,
        },
        {
          id: "catA-risk",
          categoryId: "catA",
          label: "Facturation - En attente",
          value: categories[0].riskValue,
          color: categories[0].color,
          fill: `url(#${categories[0].stripePatternId})`,
          isHatched: true,
        },
        {
          id: "catB-safe",
          categoryId: "catB",
          label: "Écritures manuelles - Encaissé",
          value: categories[1].safeValue,
          color: categories[1].color,
          fill: categories[1].color,
          isHatched: false,
        },
        {
          id: "catB-risk",
          categoryId: "catB",
          label: "Écritures manuelles - En attente",
          value: categories[1].riskValue,
          color: categories[1].color,
          fill: `url(#${categories[1].stripePatternId})`,
          isHatched: true,
        },
      ];

      for (const item of sliceDefs) {
        const pct = (item.value / grandTotal) * 100;
        const angleSpan = (item.value / grandTotal) * 360;
        result.push({
          ...item,
          percentage: Math.round(pct),
          startAngle: currentAngle,
          endAngle: currentAngle + angleSpan,
        });
        currentAngle += angleSpan;
      }
    } else {
      // 2 merged slices: CatA full, CatB full
      for (const cat of categories) {
        const pct = (cat.totalValue / grandTotal) * 100;
        const angleSpan = (cat.totalValue / grandTotal) * 360;
        result.push({
          id: `${cat.id}-total`,
          categoryId: cat.id,
          label: cat.label,
          value: cat.totalValue,
          percentage: Math.round(pct),
          color: cat.color,
          fill: cat.color,
          isHatched: false,
          startAngle: currentAngle,
          endAngle: currentAngle + angleSpan,
        });
        currentAngle += angleSpan;
      }
    }

    return result;
  }, [categories, grandTotal, highlightHighRisk]);

  // Geometry parameters: calibrated for balance between donut presence, central HUD and callouts
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 100;
  const rInner = 68;
  const paddingAngle = 2.0; // degrees gap between segments

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    // 0 deg at top (12 o'clock)
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const createArcPath = (
    centerX: number,
    centerY: number,
    innerR: number,
    outerR: number,
    startDeg: number,
    endDeg: number
  ) => {
    const gap = Math.min(paddingAngle, (endDeg - startDeg) / 2);
    const start = startDeg + gap;
    const end = endDeg - gap;
    if (end <= start) return "";

    const pStartOuter = polarToCartesian(centerX, centerY, outerR, start);
    const pEndOuter = polarToCartesian(centerX, centerY, outerR, end);
    const pStartInner = polarToCartesian(centerX, centerY, innerR, end);
    const pEndInner = polarToCartesian(centerX, centerY, innerR, start);

    const largeArc = end - start > 180 ? 1 : 0;

    return [
      `M ${pStartOuter.x} ${pStartOuter.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${pEndOuter.x} ${pEndOuter.y}`,
      `L ${pStartInner.x} ${pStartInner.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${pEndInner.x} ${pEndInner.y}`,
      "Z",
    ].join(" ");
  };

  // Pre-calculate callout points and leader lines for each slice
  const calloutData = useMemo(() => {
    return slices.map((slice) => {
      const midAngle = (slice.startAngle + slice.endAngle) / 2;
      const isRightSide = midAngle >= 0 && midAngle < 180;

      // Arc anchor point
      const pArc = polarToCartesian(cx, cy, rOuter + 4, midAngle);
      // Elbow point
      const pElbow = polarToCartesian(cx, cy, rOuter + 22, midAngle);
      // Horizontal terminus for the leader line
      const lineEndX = isRightSide ? pElbow.x + 14 : pElbow.x - 14;
      const lineEndY = pElbow.y;

      return {
        ...slice,
        midAngle,
        isRightSide,
        pArc,
        pElbow,
        lineEndX,
        lineEndY,
        // Positioning coordinates for the floating badge pill
        badgeX: isRightSide ? lineEndX + 4 : lineEndX - 4,
        badgeY: lineEndY,
      };
    });
  }, [slices, cx, cy, rOuter]);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
    <div
      className={cn(
        "@container relative w-full min-w-0 overflow-hidden rounded-[28px] border border-border/70 bg-card text-card-foreground p-5",
        "shadow-[0_16px_50px_-16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.02)]",
        "dark:bg-zinc-900/90 dark:border-white/10 dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)]",
        className
      )}
    >
      {/* Header bar */}
      <div className="flex flex-col items-start gap-1.5 mb-3">
        <div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[10px] font-medium tracking-wide text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Données du cabinet
          </span>
          <h3 className="text-lg font-semibold text-foreground tracking-tight">
            {title}
          </h3>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>

      <FinancialPeriodFilter
        from={range.from}
        to={range.to}
        onChange={(from, to) => setRange({ from, to })}
      />

      {grandTotal === 0 && (
        <p
          role="status"
          className="my-3 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground"
        >
          Aucune recette sur cette période. Choisissez une autre période ou affichez toutes les dates.
        </p>
      )}

      {/* Main interactive stage */}
      <div className="grid grid-cols-1 @min-[560px]:grid-cols-12 gap-4 items-center mt-3">
        {/* Left column: 2 mini metric cards with Claymorphism elevation & micro progress tracks */}
        <div className="min-w-0 @min-[560px]:col-span-6 flex flex-col gap-3 pt-1">
          {categories.map((cat) => {
            const isCatHovered =
              activeSlice === cat.id || (activeSlice && activeSlice.startsWith(cat.id));
            const catRecoveryRate =
              cat.totalValue > 0 ? Math.round((cat.safeValue / cat.totalValue) * 100) : 0;
            const catShare =
              grandTotal > 0 ? Math.round((cat.totalValue / grandTotal) * 100) : 0;

            return (
              <button
                type="button"
                aria-pressed={selectedCategory === cat.id}
                aria-label={`Mettre en évidence ${cat.label}`}
                onClick={() =>
                  setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
                }
                onFocus={() => setHoveredSlice(cat.id)}
                onBlur={() => setHoveredSlice(null)}
                key={cat.id}
                onMouseEnter={() => setHoveredSlice(cat.id)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl p-3.5 md:p-4 text-start transition-all duration-150 motion-reduce:transition-none border cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  "bg-white shadow-[0_6px_22px_-6px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] border-black/[0.04]",
                  "dark:bg-zinc-800/80 dark:border-white/10 dark:shadow-[0_8px_25px_-8px_rgba(0,0,0,0.6)]",
                  isCatHovered && "ring-2 ring-primary/30 border-primary/40 bg-muted/20"
                )}
              >
                {/* Header of mini-card */}
                <div className="flex items-start gap-2 mb-3 pr-4">
                  <span
                    className="mt-1 size-2.5 rounded-[3px] shrink-0"
                    style={{ backgroundColor: cat.color }}
                    aria-hidden="true"
                  />
                  <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                    <span className="text-sm font-semibold leading-5 text-foreground tracking-tight whitespace-normal">
                      {cat.label}
                    </span>
                    <span className="rounded-full bg-muted/70 dark:bg-zinc-700/60 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {catShare}%
                    </span>
                  </div>
                  <Focus
                    aria-hidden="true"
                    className={cn(
                      "absolute right-3 top-4 size-3.5 transition-opacity",
                      selectedCategory === cat.id
                        ? "text-primary opacity-100"
                        : "text-muted-foreground/40 opacity-0 group-hover:opacity-100"
                    )}
                  />
                </div>

                {/* Big primary metric & count */}
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div className="whitespace-nowrap text-[clamp(1.2rem,3.5cqi,1.85rem)] font-semibold tracking-tight text-foreground tabular-nums">
                    {cat.totalFormatted}
                  </div>
                  <span className="whitespace-nowrap text-xs font-medium text-muted-foreground tabular-nums">
                    {cat.totalCount} {cat.id === "catA" ? "facture" : "écriture"}{(cat.totalCount ?? 0) > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Mini completion track */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/60 dark:bg-zinc-700/50">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${catRecoveryRate}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>

                {/* Sub-label breakdown */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>
                      Encaissé : <strong className="whitespace-nowrap font-semibold text-foreground">{formatDA(cat.safeValue)}</strong>
                    </span>
                  </div>

                  {cat.riskValue > 0 ? (
                    <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                      <span
                        className="size-2 rounded-[2px] shrink-0"
                        style={{
                          backgroundImage: `repeating-linear-gradient(45deg, ${cat.stripeColor}, ${cat.stripeColor} 1.5px, transparent 1.5px, transparent 3px)`,
                        }}
                      />
                      <span className="whitespace-nowrap">À recevoir : {formatDA(cat.riskValue)}</span>
                    </div>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                      {cat.totalValue > 0 ? "100% soldé ✓" : "Aucune écriture"}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right column: Segmented patterned Donut & satellite callout pills */}
        <div className="@min-[560px]:col-span-6 flex items-start justify-center relative min-w-0 pt-0">
          <div className="relative w-full max-w-[300px] aspect-square flex items-center justify-center">
            {/* SVG Donut & Guides */}
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-full overflow-visible select-none"
              aria-label="Graphique circulaire de répartition du chiffre d'affaires et des créances"
            >
              <defs>
                {/* 45° Hatched pattern for Pink Risk slice */}
                <pattern
                  id={`${widgetId}-pink`}
                  width="8"
                  height="8"
                  patternTransform="rotate(45 0 0)"
                  patternUnits="userSpaceOnUse"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="8"
                    stroke="#FA2C70"
                    strokeWidth="3"
                    strokeLinecap="square"
                  />
                </pattern>

                {/* 45° Hatched pattern for Indigo Risk slice */}
                <pattern
                  id={`${widgetId}-indigo`}
                  width="8"
                  height="8"
                  patternTransform="rotate(45 0 0)"
                  patternUnits="userSpaceOnUse"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="8"
                    stroke="#5B4DFC"
                    strokeWidth="3"
                    strokeLinecap="square"
                  />
                </pattern>

                {/* Ambient drop shadow for the donut ring */}
                <filter id={`${widgetId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.10" floodColor="#000000" />
                </filter>
              </defs>

              {/* Ghost circle if empty */}
              {grandTotal === 0 && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={(rOuter + rInner) / 2}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={rOuter - rInner}
                  className="text-muted/30"
                  strokeDasharray="4 6"
                />
              )}

              {/* Inner Dial calibration markings (12 subtle chronometer ticks) */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = i * 30;
                const p1 = polarToCartesian(cx, cy, 54, angle);
                const p2 = polarToCartesian(cx, cy, 57, angle);
                return (
                  <line
                    key={`tick-${i}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-border/60 dark:text-white/10"
                  />
                );
              })}

              {/* Inner concentric recessed bezel / Dial groove */}
              <circle
                cx={cx}
                cy={cy}
                r={64}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-border/40 dark:text-white/10"
              />

              {/* Circular Recovery Gauge Arc */}
              {grandTotal > 0 && (
                <g>
                  {/* Gauge background track */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={60}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-muted/40 dark:text-white/5"
                  />
                  {/* Gauge active completion arc */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={60}
                    fill="none"
                    stroke={
                      recoveryRate >= 90
                        ? "#10b981"
                        : recoveryRate >= 75
                        ? "#f59e0b"
                        : "#f43f5e"
                    }
                    strokeWidth="2.5"
                    strokeDasharray={`${(recoveryRate / 100) * (2 * Math.PI * 60)} ${2 * Math.PI * 60}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`}
                    className="transition-all duration-500 ease-out"
                  />
                  {/* Target benchmark marker (95% target) */}
                  {(() => {
                    const pTarget = polarToCartesian(cx, cy, 60, 95 * 3.6);
                    return (
                      <circle
                        cx={pTarget.x}
                        cy={pTarget.y}
                        r="1.8"
                        fill="currentColor"
                        className="text-foreground/80 dark:text-white/80"
                      >
                        <title>Objectif de recouvrement du cabinet : 95%</title>
                      </circle>
                    );
                  })()}
                </g>
              )}

              {/* Outer Donut Ring Slices */}
              <g filter={`url(#${widgetId}-shadow)`}>
                {slices.map((slice) => {
                  const isHovered =
                    activeSlice === slice.id ||
                    (activeSlice && slice.id.startsWith(activeSlice)) ||
                    (activeSlice && slice.categoryId === activeSlice);
                  const path = createArcPath(
                    cx,
                    cy,
                    rInner,
                    isHovered ? rOuter + 4.5 : rOuter,
                    slice.startAngle,
                    slice.endAngle
                  );

                  return (
                    <path
                      key={slice.id}
                      d={path}
                      fill={slice.fill}
                      stroke="var(--card)"
                      strokeWidth={1.5}
                      onMouseEnter={() => setHoveredSlice(slice.id)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      className={cn(
                        "cursor-pointer transition-all duration-150 motion-reduce:transition-none",
                        isHovered && "opacity-95 filter drop-shadow-md"
                      )}
                    >
                      <title>{`${slice.label} : ${formatDA(slice.value)} (${slice.percentage} %)`}</title>
                    </path>
                  );
                })}
              </g>

              {/* Leader connector lines */}
              {calloutData.map((slice) => {
                const isHovered =
                  activeSlice === slice.id ||
                  (activeSlice && slice.id.startsWith(activeSlice)) ||
                  (activeSlice && slice.categoryId === activeSlice);

                return (
                  <g
                    key={`line-${slice.id}`}
                    className={cn(
                      "transition-opacity duration-200 pointer-events-none",
                      isHovered ? "opacity-100" : "opacity-65"
                    )}
                  >
                    <polyline
                      points={`${slice.pArc.x},${slice.pArc.y} ${slice.pElbow.x},${slice.pElbow.y} ${slice.lineEndX},${slice.lineEndY}`}
                      fill="none"
                      stroke={isHovered ? slice.color : "currentColor"}
                      strokeWidth={isHovered ? 1.5 : 1}
                      className={isHovered ? "" : "text-border dark:text-zinc-600"}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Central Cockpit HUD (Interactive Centerpiece) */}
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <div
                className={cn(
                  "flex h-[116px] w-[116px] flex-col items-center justify-center rounded-full p-2 text-center",
                  "bg-card/90 dark:bg-zinc-900/90 backdrop-blur-xs",
                  "ring-1 ring-border/50 dark:ring-white/10",
                  "shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),0_8px_20px_-4px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_25px_rgba(0,0,0,0.45)]",
                  "transition-all duration-200"
                )}
              >
                {activeInsight ? (
                  /* Dynamic Inspection view on Hover */
                  <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-150">
                    <div
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wide border shadow-2xs"
                      style={{
                        backgroundColor: activeInsight.isHatched
                          ? `${activeInsight.color}15`
                          : `${activeInsight.color}20`,
                        borderColor: `${activeInsight.color}40`,
                        color: activeInsight.color,
                      }}
                    >
                      {activeInsight.isHatched ? (
                        <span
                          className="size-1.5 rounded-full shrink-0"
                          style={{
                            backgroundImage: `repeating-linear-gradient(45deg, ${activeInsight.color}, ${activeInsight.color} 1.5px, transparent 1.5px, transparent 3px)`,
                          }}
                        />
                      ) : (
                        <span
                          className="size-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: activeInsight.color }}
                        />
                      )}
                      <span className="truncate max-w-[70px]">{activeInsight.badge}</span>
                    </div>

                    <div className="my-0.5 text-base font-bold tracking-tight text-foreground tabular-nums truncate max-w-[105px]">
                      {activeInsight.amountFormatted}
                    </div>

                    <div className="text-[9.5px] font-semibold text-foreground/80 tabular-nums leading-tight">
                      {activeInsight.sharePct}% du total
                    </div>

                    <span
                      className={cn(
                        "mt-1 text-[8.5px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded-sm",
                        activeInsight.statusType === "risk"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          : activeInsight.statusType === "safe"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {activeInsight.status}
                    </span>
                  </div>
                ) : (
                  /* Default / Global Health view */
                  <div className="flex flex-col items-center justify-center animate-in fade-in duration-200">
                    <div
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium tracking-wide border shadow-2xs",
                        recoveryRate >= 90
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : recoveryRate >= 75
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full shrink-0",
                          recoveryRate >= 90
                            ? "bg-emerald-500"
                            : recoveryRate >= 75
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        )}
                      />
                      <span className="font-semibold">
                        {grandTotal === 0
                          ? "En attente"
                          : recoveryRate >= 90
                          ? "Flux sain"
                          : recoveryRate >= 75
                          ? "Sous suivi"
                          : "Vigilance"}
                      </span>
                    </div>

                    <div className="my-0.5 flex items-baseline justify-center font-sans text-3xl font-bold tracking-tight text-foreground tabular-nums leading-none">
                      <span>{grandTotal > 0 ? recoveryRate : "—"}</span>
                      {grandTotal > 0 && (
                        <span className="ml-0.5 text-base font-semibold text-muted-foreground">
                          %
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-medium text-muted-foreground leading-tight">
                      Taux d'encaissement
                    </span>

                    <div className="mt-1 flex items-center gap-1 rounded-full bg-muted/60 dark:bg-zinc-800 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      <span>{safeTransactions}/{totalTransactions} soldés</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Floating satellite callout badges */}
            {calloutData.map((slice) => {
              const isHovered =
                activeSlice === slice.id ||
                (activeSlice && slice.id.startsWith(activeSlice)) ||
                (activeSlice && slice.categoryId === activeSlice);

              return (
                <div
                  key={`badge-${slice.id}`}
                  onMouseEnter={() => setHoveredSlice(slice.id)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  style={{
                    left: `${(slice.badgeX / size) * 100}%`,
                    top: `${(slice.badgeY / size) * 100}%`,
                    transform: slice.isRightSide
                      ? "translate(0, -50%)"
                      : "translate(-100%, -50%)",
                  }}
                  className={cn(
                    "absolute z-20 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums tracking-tight transition-all duration-150 motion-reduce:transition-none cursor-pointer",
                    "bg-white shadow-[0_4px_14px_-2px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] border border-black/[0.06] text-foreground",
                    "dark:bg-zinc-800 dark:border-white/15 dark:shadow-[0_4px_16px_rgba(0,0,0,0.5)] dark:text-white",
                    isHovered && "ring-2 ring-primary/40 shadow-md scale-105",
                    slice.isHatched && "font-bold text-rose-600 dark:text-rose-400"
                  )}
                  title={`${slice.label}: ${slice.percentage}% (${formatDA(slice.value)})`}
                >
                  {slice.isHatched && (
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{
                        backgroundImage: `repeating-linear-gradient(45deg, ${slice.color}, ${slice.color} 1.5px, transparent 1.5px, transparent 3px)`,
                      }}
                      aria-hidden="true"
                    />
                  )}
                  <span>{slice.percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom section: Filter chips & High-risk toggle */}
      <div className="mt-4 pt-3 border-t border-border/50 flex flex-col gap-3">
        {/* Filter chips / Business unit channel */}
        <div>
          <span className="block text-xs font-medium text-muted-foreground mb-2.5">
            Catégorie de recette
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "Toutes les catégories" },
              ...channels.map((category) => ({
                id: category,
                label: category || "Sans catégorie",
              })),
            ].map((channel) => {
              const isSelected = selectedChannel === channel.id;
              return (
                <button
                  type="button"
                  key={channel.id}
                  onClick={() => {
                    setSelectedChannel(channel.id);
                    setHoveredSlice(null);
                  }}
                  aria-pressed={isSelected}
                  className={cn(
                    "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border",
                    isSelected
                      ? "bg-white text-foreground border-black/[0.08] shadow-xs font-semibold dark:bg-zinc-800 dark:border-white/15 dark:text-white"
                      : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <span>{channel.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* High-risk toggle switch */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-muted/30 border border-border/40">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <label
                htmlFor={`${widgetId}-risk-toggle`}
                className="text-sm font-semibold text-foreground cursor-pointer"
              >
                Distinguer les règlements en attente
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Les hachures indiquent les montants en attente, sans présumer d’un retard de paiement.
            </p>
          </div>

          <Switch
            id={`${widgetId}-risk-toggle`}
            checked={highlightHighRisk}
            onCheckedChange={setHighlightHighRisk}
            aria-label="Distinguer les règlements en attente"
          />
        </div>
      </div>
    </div>
    <section className="flex min-w-0 flex-col rounded-[28px] border border-border/70 bg-card p-5 text-card-foreground">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Sur la période sélectionnée</p>
          <h3 className="text-lg font-semibold tracking-tight">Créances à suivre</h3>
        </div>
        <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-600">{riskTransactions} à recouvrer</span>
      </header>
      <div className="my-5 rounded-2xl bg-rose-500/[0.045] p-4">
        <p className="text-xs text-muted-foreground">Reste à encaisser</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatDA(riskTotal)}</p>
        <div className="mt-4 flex justify-between border-t border-border/50 pt-3 text-xs">
          <span className="text-muted-foreground">Déjà encaissé</span><strong className="tabular-nums text-emerald-600">{formatDA(safeTotal)}</strong>
        </div>
      </div>
      <div className="flex-1">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Soldes les plus importants</p>
        {visibleReceivables.map(invoice => (
          <div key={invoice.id} className="flex items-center justify-between gap-3 border-b border-border/50 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{invoice.number || "Facture"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{invoice.settlementStatus === "overdue" ? "Échéance dépassée" : invoice.completedPaymentAmount > 0 ? "Paiement partiel" : "En attente de règlement"}</p>
            </div>
            <strong className="shrink-0 text-sm tabular-nums">{formatDA(invoice.balanceAmount / 100)}</strong>
          </div>
        ))}
        {receivables.length === 0 && (
          <div className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
            {riskTotal > 0 ? "Des écritures restent en attente. Retrouvez leur détail dans Finances." : "Aucun solde à recouvrer sur cette période."}
          </div>
        )}
      </div>
      {receivables.length > pageSize && (
        <nav aria-label="Pagination des créances" className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-3">
          <span role="status" aria-live="polite" className="text-xs text-muted-foreground tabular-nums">
            {pageStart + 1}–{Math.min(pageStart + pageSize, receivables.length)} sur {receivables.length} créances
          </span>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Page précédente des créances" disabled={currentPage === 0} onClick={() => setReceivablesPage(currentPage - 1)} className="flex size-9 items-center justify-center rounded-lg border border-border/60 hover:bg-muted disabled:opacity-40 disabled:cursor-default">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <span className="px-2 text-xs text-muted-foreground tabular-nums">{currentPage + 1} / {pageCount}</span>
            <button type="button" aria-label="Page suivante des créances" disabled={currentPage === pageCount - 1} onClick={() => setReceivablesPage(currentPage + 1)} className="flex size-9 items-center justify-center rounded-lg border border-border/60 hover:bg-muted disabled:opacity-40 disabled:cursor-default">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
      <button type="button" onClick={onOpenFinances} className="mt-4 flex min-h-10 w-full items-center justify-between rounded-xl bg-muted/50 px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">
        Ouvrir les finances <span aria-hidden="true">↗</span>
      </button>
    </section>
    </div>
  );
}
