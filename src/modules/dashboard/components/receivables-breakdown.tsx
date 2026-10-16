import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { formatDinars, formatNumber } from "@/utils/display-format";
import { FittedAmount } from "@/shared/ui/fitted-amount";
import { collectionProgress } from "../v2/financial-model";
import type { Receivable } from "../v2/financial-model";

const money = formatDinars;
const groups = [
  { key: "overdue", label: "En retard", color: "var(--debt-overdue)" },
  { key: "partial", label: "Partiels", color: "var(--debt-partial)" },
  { key: "awaiting", label: "À régler", color: "var(--debt-awaiting)" },
] as const;

/** Progress toward collecting the net receipts in the selected period. */
export function ReceivablesBreakdown({ receivables, total, collected, unavailable }: { receivables: Receivable[]; total: number; collected: number; unavailable: boolean }) {
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const rows = groups.map(group => ({ ...group, amount: 0, count: 0 }));
  for (const item of receivables) {
    const index = item.detail === "Échéance dépassée" ? 0 : item.detail === "Règlement partiel" ? 1 : 2;
    rows[index].amount += item.balance;
    rows[index].count++;
  }
  const progress = collectionProgress(total, collected);
  const ratio = progress.percentage;
  const selected = active === null ? null : rows[active];

  return <div className="receivables-breakdown">
    <div className="debt-circular-summary">
      <div className="debt-gauge" role="img" aria-label={unavailable || ratio === null ? "Taux d’encaissement indisponible" : `${ratio} % encaissé, ${money(collected)} sur ${money(total)}`}>
        <svg viewBox="0 0 128 128" aria-hidden="true">
          <circle cx="64" cy="64" r="52" fill="none" stroke="var(--border)" strokeWidth="10" />
          <motion.circle cx="64" cy="64" r="52" fill="none" stroke="var(--debt-collected)" strokeWidth="10" strokeLinecap="round" transform="rotate(-90 64 64)" initial={reducedMotion ? false : { pathLength: 0 }} animate={{ pathLength: unavailable || ratio === null ? 0 : Math.min(1, Math.max(0, ratio / 100)) }} transition={{ duration: reducedMotion ? 0 : .8, ease: "easeOut" }} />
        </svg>
        <div><strong>{unavailable || ratio === null ? "-" : `${ratio} %`}</strong><span>encaissé</span></div>
      </div>
      <div className="debt-gauge-legend"><span>Objectif d’encaissement</span><strong>{unavailable ? "-" : money(total)}</strong><span>Déjà encaissé</span><strong>{unavailable ? "-" : money(collected)}</strong></div>
    </div>
    <div className="debt-status-grid">{rows.map((r, i) => <div key={r.key} data-empty={r.count === 0 || undefined} data-selected={active === i || undefined} tabIndex={0} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} aria-label={`${r.label} : ${unavailable ? "indisponible" : money(r.amount)}, ${r.count} dossiers`}><span><i className="finder-dot" style={{ background: r.color }} />{r.label}</span><FittedAmount className="debt-status-amount" value={unavailable ? "-" : money(r.amount)} maxFontSize={19} /><small>{unavailable ? "-" : `${r.count} ${r.count === 1 ? "dossier" : "dossiers"}`}</small></div>)}</div>
    <p className="debt-breakdown-detail" aria-live="polite">{unavailable ? "Actualisation des soldes…" : selected ? `${selected.label} · ${formatNumber(selected.count)} ${selected.count === 1 ? "dossier" : "dossiers"} · ${money(selected.amount)}` : total > 0 ? "" : "Aucune recette sur la période sélectionnée"}</p>
  </div>;
}
