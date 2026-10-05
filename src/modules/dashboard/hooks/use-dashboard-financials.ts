import { useCallback, useEffect, useState } from "react";
import { billingService } from "@/services/billingService";
import { isTauriRuntime } from "@/services/browser-store";
import type { Invoice } from "@/types/db";
let cached: Invoice[] | undefined;
let pending: Promise<Invoice[]> | undefined;
function readInvoices() {
  if (!pending)
    pending = billingService
      .listInvoices({ documentStatus: "issued" })
      .then((rows) => {
        cached = rows;
        return rows;
      })
      .finally(() => {
        pending = undefined;
      });
  return pending;
}
export function useDashboardFinancials() {
  const [invoices, setInvoices] = useState<Invoice[]>(cached ?? []);
  const [loading, setLoading] = useState(() => isTauriRuntime() && !cached);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!isTauriRuntime()) return;
    try {
      setInvoices(await readInvoices());
      setError(null);
    } catch {
      setError("Les factures n’ont pas pu être chargées.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    if (isTauriRuntime())
      void readInvoices()
        .then((rows) => {
          if (active) {
            setInvoices(rows);
            setError(null);
          }
        })
        .catch(() => {
          if (active) setError("Les factures n’ont pas pu être chargées.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    const changed = (event: Event) => {
      const table = (event as CustomEvent<{ tableName?: string }>).detail
        ?.tableName;
      if (
        [
          "transactions",
          "invoices",
          "invoice_payments",
          "credit_notes",
        ].includes(table ?? "")
      )
        void refresh();
    };
    window.addEventListener("sqlite-data-changed", changed);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("sqlite-data-changed", changed);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);
  return { invoices, loading, error, refresh };
}
