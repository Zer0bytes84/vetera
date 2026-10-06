"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Invoice, Transaction } from "@/types/db";
import { billingService } from "@/services/billingService";
import { isTauriRuntime } from "@/services/browser-store";
import {
  FinancialPeriodFilter,
  financialPeriodRange,
} from "@/components/financial-period-filter";
import {
  buildFinancialOverview,
  type FinancialCategory,
  type FinancialSource,
} from "../v2/financial-model";
import { ListFilter } from "@/components/ui/list-controls";
import { buildReceiptsSeries } from "../v2/receipts-series";
import { ClassicFinancialPanels } from "./classic-financial-panels";

export type RiskCategoryData = FinancialCategory;

export function FinancialRiskDonutWidget({
  transactions,
  onOpenFinances,
}: {
  transactions: Transaction[];
  onOpenFinances?: () => void;
}) {
  const [source, setSource] = useState<FinancialSource>("all");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [range, setRange] = useState(() =>
    financialPeriodRange("year", new Date())
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isTauriRuntime);
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (!isTauriRuntime()) return;
    void Promise.resolve()
      .then(() => {
        if (cancelled) return [];
        setLoading(true);
        return billingService.listInvoices({ documentStatus: "issued" });
      })
      .then((rows) => {
        if (!cancelled) {
          setInvoices(rows);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Les factures n’ont pas pu être chargées. Les montants affichés peuvent être incomplets."
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [transactions, revision]);

  useEffect(() => {
    window.addEventListener("sqlite-data-changed", retry);
    window.addEventListener("focus", retry);
    return () => {
      window.removeEventListener("sqlite-data-changed", retry);
      window.removeEventListener("focus", retry);
    };
  }, [retry]);

  const overview = useMemo(
    () => buildFinancialOverview(invoices, transactions, range, source),
    [invoices, transactions, range, source]
  );
  const series = useMemo(() => buildReceiptsSeries(invoices, transactions, range, source), [invoices, transactions, range, source]);
  return (
    <ClassicFinancialPanels
      categories={overview.categories}
      series={series}
      receivables={overview.receivables}
      onOpenFinances={onOpenFinances}
      loading={source !== "manual" && loading}
      error={source !== "manual" ? error : ""}
      onRetry={retry}
      controls={
        <>
          <FinancialPeriodFilter
            from={range.from}
            to={range.to}
            onChange={(from, to) => {
              setRange({ from, to });
            }}
          />
          <ListFilter
            label="Recettes"
            value={source}
            onValueChange={(value) => {
              setSource(value as FinancialSource);
            }}
            options={[
              { value: "all", label: "Toutes" },
              { value: "invoices", label: "Factures du cabinet" },
              { value: "manual", label: "Hors facture" },
            ]}
          />
        </>
      }
    />
  );
}
