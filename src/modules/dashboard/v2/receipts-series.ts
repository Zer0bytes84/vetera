import { addDays, addMonths, differenceInCalendarDays, differenceInCalendarMonths, format, isValid, parseISO, startOfMonth, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { Invoice, Transaction } from "@/types/db";
import { buildFinancialOverview, type FinancialSource } from "./financial-model";

export interface ReceiptsBucket {
  key: string;
  label: string;
  detail: string;
  invoices: number;
  manual: number;
  pending: number;
}

/** Buckets use document dates and current settlement balances, like the summary. */
export function buildReceiptsSeries(invoices: Invoice[], transactions: Transaction[], range: { from: string; to: string }, source: FinancialSource): ReceiptsBucket[] {
  const dates = [
    ...(source === "manual" ? [] : invoices.filter(i => i.documentStatus === "issued").map(i => (i.issuedAt ?? i.createdAt).slice(0, 10))),
    ...(source === "invoices" ? [] : transactions.filter(t => t.type === "income").map(t => t.date.slice(0, 10))),
  ].filter(d => isValid(parseISO(d))).sort();
  const from = parseISO(range.from || dates[0] || format(new Date(), "yyyy-MM-dd"));
  const to = parseISO(range.to || dates.at(-1) || format(new Date(), "yyyy-MM-dd"));
  if (!isValid(from) || !isValid(to) || from > to) return [];
  const days = differenceInCalendarDays(to, from) + 1;
  const monthly = days > 92;
  const monthStep = Math.max(1, Math.ceil((differenceInCalendarMonths(to, from) + 1) / 12));
  const dayStep = days <= 14 ? 1 : days <= 31 ? 3 : 7;
  const result: ReceiptsBucket[] = [];
  for (let cursor = from; cursor <= to;) {
    const next = monthly ? addMonths(startOfMonth(cursor), monthStep) : addDays(cursor, dayStep);
    const end = subDays(next, 1) < to ? subDays(next, 1) : to;
    const categories = buildFinancialOverview(invoices, transactions, { from: format(cursor, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") }, source).categories;
    result.push({
      key: format(cursor, "yyyy-MM-dd"),
      label: format(cursor, monthly ? "MMM" : "d MMM", { locale: fr }),
      detail: monthly && monthStep === 1 ? format(cursor, "MMMM yyyy", { locale: fr }) : cursor.getTime() === end.getTime() ? format(cursor, "d MMMM yyyy", { locale: fr }) : `${format(cursor, "d MMM yyyy", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })}`,
      invoices: categories.find(c => c.id === "invoices")?.safeValue ?? 0,
      manual: categories.find(c => c.id === "manual")?.safeValue ?? 0,
      pending: categories.reduce((sum, c) => sum + c.riskValue, 0),
    });
    cursor = next;
  }
  return result;
}
