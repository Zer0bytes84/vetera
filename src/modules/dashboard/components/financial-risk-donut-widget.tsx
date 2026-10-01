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
  const [page, setPage] = useState(0);
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
  const pageCount = Math.max(1, Math.ceil(overview.receivables.length / 4));
  return (
    <ClassicFinancialPanels
      categories={overview.categories}
      receivables={overview.receivables}
      page={Math.min(page, pageCount - 1)}
      pageCount={pageCount}
      onPage={setPage}
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
              setPage(0);
            }}
          />
          <label className="classic-category-select">
            <span className="sr-only">Origine des recettes</span>
            <select
              value={source}
              onChange={(event) => {
                setSource(event.target.value as FinancialSource);
                setPage(0);
              }}
            >
              <option value="all">Toutes les recettes</option>
              <option value="invoices">Factures du cabinet</option>
              <option value="manual">Recettes hors facture</option>
            </select>
          </label>
        </>
      }
    />
  );
}
