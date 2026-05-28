"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProductsRepository } from "@/data/repositories";
import { AlertTriangle, Package, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { View } from "@/types";

interface StockAlertsWidgetProps {
  onNavigate?: (view: View) => void;
}

export function StockAlertsWidget({ onNavigate }: StockAlertsWidgetProps) {
  const { data: products } = useProductsRepository();

  // Extract products with critical levels (out of stock or below minimum threshold)
  const stockAlerts = React.useMemo(() => {
    return products
      .filter((p) => Number(p.quantity) <= Number(p.minStock))
      .sort((a, b) => Number(a.quantity) - Number(b.quantity)); // Out of stock first
  }, [products]);

  return (
    <Card className="dashboard-luxe-card group relative flex h-full flex-col overflow-hidden p-6 shadow-none transition-[transform,shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-md hover:shadow-zinc-950/5 dark:hover:shadow-black/20">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl dark:bg-rose-500/5" />
      </div>

      <div className="relative z-10 flex flex-col h-full w-full">

      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-950/10 pb-4 dark:border-white/10">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-400 dark:from-rose-400 dark:to-orange-300">
            Inventaire & Logistique
          </span>
          <h3 className="text-xl font-bold tracking-tight text-foreground mt-1">
            Alertes de Stock
          </h3>
        </div>

        {/* Counter */}
        {stockAlerts.length > 0 ? (
          <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 font-semibold text-xs text-rose-700 border border-rose-500/20 dark:text-rose-300 dark:bg-rose-500/5 dark:border-rose-400/10 shadow-[0_0_8px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="size-3.5" />
            <span className="tabular-nums font-bold">{stockAlerts.length}</span> alerte{stockAlerts.length > 1 ? "s" : ""}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-semibold text-xs text-emerald-700 border border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5" />
            <span>Optimal</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto mt-4 space-y-2.5 max-h-[220px] pr-1">
        {stockAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <span className="text-3xl">📦</span>
            <p className="italic text-sm text-foreground">Tous vos stocks sont au beau fixe</p>
            <p className="text-xs text-muted-foreground">Aucun article ne nécessite d'approvisionnement.</p>
          </div>
        ) : (
          stockAlerts.slice(0, 4).map((product) => {
            const isOut = Number(product.quantity) === 0;
            const ratio = Number(product.minStock) > 0 ? Math.min(Number(product.quantity) / Number(product.minStock), 1) : 0;

            return (
              <div
                key={product.id}
                className="flex flex-col gap-1 rounded-xl p-2.5 border border-transparent hover:bg-zinc-950/5 dark:hover:bg-white/5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-xs text-foreground">
                      {product.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                      Catégorie : {product.category || "Général"}
                    </p>
                  </div>

                  {/* Quantity Badge */}
                  <Badge
                    className={cn(
                      "rounded-full px-2 py-0 border font-semibold text-[10px] tracking-wide shrink-0",
                      isOut
                        ? "bg-rose-500/15 text-rose-700 border-rose-500/20 dark:text-rose-300 dark:border-rose-400/20 shadow-[0_0_6px_rgba(239,68,68,0.15)] font-bold"
                        : "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-400/20 shadow-[0_0_6px_rgba(245,158,11,0.15)] font-bold"
                    )}
                    variant="outline"
                  >
                    {isOut ? "Rupture" : `${product.quantity} ${product.unit || "u"}`}
                  </Badge>
                </div>

                {/* Micro level bar */}
                {!isOut && (
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-950/5 dark:bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.3)]"
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {onNavigate && (
        <div className="mt-auto border-t border-zinc-950/10 pt-4 dark:border-white/10">
          <button
            onClick={() => onNavigate("stock")}
            className="flex w-full items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 font-semibold text-xs text-white transition-[transform,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-zinc-800 hover:scale-[1.01] active:scale-[0.97] hover:shadow-md dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 cursor-pointer"
            type="button"
          >
            Gérer le stock d'inventaire
          </button>
        </div>
      )}
      </div>
    </Card>
  );
}
