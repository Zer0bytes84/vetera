"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { useProductsRepository } from "@/data/repositories";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Package2,
  Pill,
  ShoppingCart,
  Syringe,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { View } from "@/types";

interface StockAlertsWidgetProps {
  onNavigate?: (view: View) => void;
}

function categoryIcon(category?: string) {
  const c = (category || "").toLowerCase();
  if (/(vaccin|sérum|serum|injection)/.test(c)) return Syringe;
  if (/(médicament|medicament|comprim|pilule|pill)/.test(c)) return Pill;
  return Package2;
}

export function StockAlertsWidget({ onNavigate }: StockAlertsWidgetProps) {
  const { data: products } = useProductsRepository();

  const stockAlerts = React.useMemo(() => {
    return products
      .filter((p) => Number(p.quantity) <= Number(p.minStock))
      .sort((a, b) => Number(a.quantity) - Number(b.quantity));
  }, [products]);

  const stats = React.useMemo(() => {
    const total = products.length;
    const outOfStock = stockAlerts.filter((p) => Number(p.quantity) === 0).length;
    const low = stockAlerts.length - outOfStock;
    const ok = total - stockAlerts.length;
    return { total, outOfStock, low, ok };
  }, [products, stockAlerts]);

  const healthRatio = stats.total > 0 ? stats.ok / stats.total : 1;

  return (
    <Card className="dashboard-luxe-card group relative flex h-full flex-col overflow-hidden shadow-none !border-zinc-200 dark:!border-white/10 transition-[transform,shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-zinc-950/5 dark:hover:shadow-black/20">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-rose-500/10 blur-3xl dark:bg-rose-500/5" />
        <div className="absolute -left-10 -bottom-12 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-500/5" />
      </div>

      <div className="relative z-10 flex h-full flex-col p-6">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-950/10 pb-4 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/15 to-orange-500/10 ring-1 ring-rose-500/15 dark:ring-rose-400/15">
                <Package2
                  className="h-3.5 w-3.5 text-rose-700 dark:text-rose-300"
                  strokeWidth={2.2}
                />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-400 dark:from-rose-400 dark:to-orange-300 font-sans">
                Inventaire &amp; Logistique
              </span>
            </div>
            <h3 className="mt-2 truncate font-display text-xl font-semibold tracking-tight text-foreground">
              Alertes de Stock
            </h3>
          </div>

          {stockAlerts.length > 0 ? (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-700 shadow-[0_0_10px_rgba(244,63,94,0.15)] dark:text-rose-300 dark:bg-rose-500/5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="tabular-nums">{stockAlerts.length}</span>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>OK</span>
            </div>
          )}
        </div>

        {/* ── Stock Health bar ────────────────────────────────── */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Santé d'inventaire</span>
            <span className="tabular-nums text-foreground">
              {Math.round(healthRatio * 100)}%
            </span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-950/5 dark:bg-white/5">
            {stats.ok > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${(stats.ok / stats.total) * 100}%` }}
                title={`${stats.ok} en stock`}
              />
            )}
            {stats.low > 0 && (
              <div
                className="h-full bg-amber-500 transition-all duration-700"
                style={{ width: `${(stats.low / stats.total) * 100}%` }}
                title={`${stats.low} bas`}
              />
            )}
            {stats.outOfStock > 0 && (
              <div
                className="h-full bg-rose-500 shadow-[0_0_8px_#f43f5e] transition-all duration-700"
                style={{ width: `${(stats.outOfStock / stats.total) * 100}%` }}
                title={`${stats.outOfStock} en rupture`}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
            <LegendDot color="bg-emerald-500" label={`${stats.ok} OK`} />
            <LegendDot color="bg-amber-500" label={`${stats.low} bas`} />
            <LegendDot color="bg-rose-500" label={`${stats.outOfStock} rupture`} />
          </div>
        </div>

        {/* ── Alert List ──────────────────────────────────────── */}
        <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {stockAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-foreground">
                Stocks au beau fixe
              </p>
              <p className="text-xs text-muted-foreground">
                Aucun article ne nécessite d'approvisionnement
              </p>
            </div>
          ) : (
            stockAlerts.slice(0, 4).map((product) => {
              const isOut = Number(product.quantity) === 0;
              const minStock = Math.max(1, Number(product.minStock));
              const ratio = Math.min(1, Number(product.quantity) / minStock);
              const Icon = categoryIcon(product.category);

              return (
                <div
                  key={product.id}
                  className={cn(
                    "group/row relative rounded-2xl border border-transparent p-3 transition-all hover:bg-white/60 hover:border-zinc-200/60 hover:shadow-xs dark:hover:bg-white/[0.04] dark:hover:border-white/10",
                    isOut &&
                      "bg-rose-500/[0.025] border-rose-500/10 dark:bg-rose-400/[0.02] dark:border-rose-400/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
                        isOut
                          ? "bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-300 dark:ring-rose-400/20"
                          : "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-300 dark:ring-amber-400/20"
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className="truncate text-sm font-bold text-foreground"
                          title={product.name}
                        >
                          {product.name}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2 py-0 text-[10px] font-bold tracking-wide",
                            isOut
                              ? "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.2)]"
                              : "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300"
                          )}
                        >
                          {isOut ? (
                            <span className="flex items-center gap-1">
                              <TrendingDown className="h-2.5 w-2.5" />
                              Rupture
                            </span>
                          ) : (
                            <span className="tabular-nums">
                              {product.quantity} {product.unit || "u"}
                            </span>
                          )}
                        </span>
                      </div>
                      <p
                        className="mt-0.5 truncate text-[11px] text-muted-foreground"
                        title={product.category || "Général"}
                      >
                        {product.category || "Général"} • Seuil min :{" "}
                        <span className="font-bold text-foreground tabular-nums">
                          {product.minStock}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Level bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-950/5 dark:bg-white/5">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          isOut
                            ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                            : "bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500"
                        )}
                        style={{ width: `${Math.max(isOut ? 100 : 8, ratio * 100)}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[10px] font-bold tabular-nums",
                        isOut
                          ? "text-rose-700 dark:text-rose-300"
                          : "text-amber-700 dark:text-amber-300"
                      )}
                    >
                      {Math.round(ratio * 100)}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        {onNavigate && (
          <div className="mt-4 border-t border-zinc-950/10 pt-4 dark:border-white/10">
            <button
              type="button"
              onClick={() => onNavigate("stock")}
              className="group/btn flex w-full items-center justify-center gap-1.5 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-zinc-800 hover:shadow-md active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Gérer le stock d'inventaire
              <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold">
      <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
      {label}
    </span>
  );
}
