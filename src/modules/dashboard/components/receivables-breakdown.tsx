import { useId, useState, type PointerEvent, type KeyboardEvent } from "react";
import { FittedAmount } from "@/shared/ui/fitted-amount";
import { collectionProgress } from "../v2/financial-model";
import type { Receivable } from "../v2/financial-model";

const money = (value: number) => `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DA`;
const groups = [
  { key: "overdue", label: "En retard", color: "var(--debt-overdue)" },
  { key: "partial", label: "Partiels", color: "var(--debt-partial)" },
  { key: "awaiting", label: "À régler", color: "var(--debt-awaiting)" },
] as const;

/** Progress toward collecting the net receipts in the selected period. */
export function ReceivablesBreakdown({ receivables, total, collected, unavailable }: { receivables: Receivable[]; total: number; collected: number; unavailable: boolean }) {
  const tooltipId = useId();
  const [segment, setSegment] = useState<number | null>(null);
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
  const inspect = (event: PointerEvent<HTMLDivElement>) => {
    if (unavailable || total <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setSegment(Math.max(0, Math.min(39, Math.floor((event.clientX - rect.left) / rect.width * 40))));
  };
  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (unavailable || total <= 0) return;
    if (!["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Escape") setSegment(null);
    else setSegment(event.key === "Home" ? 0 : event.key === "End" ? 39 : Math.max(0, Math.min(39, (segment ?? 0) + (event.key === "ArrowRight" ? 1 : -1))));
  };
  const inspectingCollected = segment !== null && segment < progress.filledSegments;

  return <div className="receivables-breakdown">
    <div className="debt-breakdown-heading"><span>Objectif d’encaissement</span><small>{unavailable || ratio === null ? "—" : `${ratio} %`}</small></div>
    <div className="debt-pile-scale"><span>{unavailable ? "—" : money(collected)}</span><span>Objectif · {unavailable ? "—" : money(total)}</span></div>
    <div className="debt-pile-interaction">
    <div className="debt-segment-bar" role="img" tabIndex={unavailable || total <= 0 ? -1 : 0} aria-describedby={segment !== null ? tooltipId : undefined} onPointerMove={inspect} onPointerDown={inspect} onPointerLeave={e => { if (e.pointerType !== "touch") setSegment(null); }} onFocus={() => { if (!unavailable && total > 0) setSegment(current => current ?? 0); }} onBlur={() => setSegment(null)} onKeyDown={navigate} aria-label={unavailable ? "Soldes indisponibles" : `Encaissé : ${money(collected)} ; ${rows.map(r => `${r.label} : ${money(r.amount)}, ${r.count} dossiers`).join(" ; ")}`}>
      {Array.from({ length: 40 }, (_, n) => {
        const filled = !unavailable && n < progress.filledSegments;
        const mix = Math.round(100 - n / 39 * 70);
        return <i key={n} data-filled={filled || undefined} data-active={segment === n || undefined} style={{ background: filled ? `color-mix(in srgb, var(--debt-collected) ${mix}%, var(--debt-collected-light))` : undefined }} />;
      })}
    </div>
    {segment !== null && !unavailable && total > 0 && <div id={tooltipId} className="debt-pile-tooltip" role="tooltip" style={{ left: `clamp(90px, ${(segment + .5) / 40 * 100}%, calc(100% - 90px))` }}>
      <span><i data-collected={inspectingCollected || undefined} />{inspectingCollected ? "Encaissé" : "Reste à encaisser"}</span>
      <strong>{money(inspectingCollected ? collected : total - collected)}</strong>
      <small>{inspectingCollected ? `${ratio} % de l’objectif atteint` : "Solde à régler pour atteindre 100 %"}</small>
    </div>}
    </div>
    <div className="debt-status-grid">{rows.map((r, i) => <div key={r.key} tabIndex={0} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} aria-label={`${r.label} : ${unavailable ? "indisponible" : money(r.amount)}, ${r.count} dossiers`}><span><i style={{ background: r.color }} />{r.label}</span><FittedAmount className="debt-status-amount" value={unavailable ? "—" : money(r.amount)} maxFontSize={19} /><small>{unavailable ? "—" : `${r.count} ${r.count === 1 ? "dossier" : "dossiers"}`}</small></div>)}</div>
    <p className="debt-breakdown-detail" aria-live="polite">{unavailable ? "Actualisation des soldes…" : selected ? `${selected.label} · ${selected.count} ${selected.count === 1 ? "dossier" : "dossiers"} · ${money(selected.amount)}` : total > 0 ? `${money(total - collected)} restent à encaisser pour atteindre 100 %` : "Aucune recette sur la période sélectionnée"}</p>
  </div>;
}
