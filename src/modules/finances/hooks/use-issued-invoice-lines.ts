import { useEffect, useState } from "react";
import { billingService, type IssuedInvoiceLine } from "@/services/billingService";

/**
 * The lines of invoices issued between two dates. Null while the range's read
 * is pending (a result kept from another range never shows), "error" when it
 * failed, so a view can say so instead of showing zeros.
 */
export function useIssuedInvoiceLines(from: Date, to: Date): IssuedInvoiceLine[] | "error" | null {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const key = `${fromIso}|${toIso}`;
  const [result, setResult] = useState<{ key: string; lines: IssuedInvoiceLine[] | "error" } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const readKey = `${fromIso}|${toIso}`;
    billingService
      .listIssuedInvoiceLines({ from: new Date(fromIso), to: new Date(toIso) })
      .then((lines) => { if (!cancelled) setResult({ key: readKey, lines }); })
      .catch(() => { if (!cancelled) setResult({ key: readKey, lines: "error" }); });
    return () => { cancelled = true; };
  }, [fromIso, toIso]);

  return result?.key === key ? result.lines : null;
}
