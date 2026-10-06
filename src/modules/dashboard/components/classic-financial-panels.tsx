import type { ReactNode } from "react";
import { ArrowUpRight } from "@/lib/icons";
import { FittedAmount } from "@/shared/ui/fitted-amount";
import type { Receivable } from "../v2/financial-model";
import { ReceiptsChart } from "./receipts-chart";
import { ReceivablesBreakdown } from "./receivables-breakdown";
import type { ReceiptsBucket } from "../v2/receipts-series";
import type { RiskCategoryData } from "./financial-risk-donut-widget";

const amountFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});
const amount = (value: number) => `${amountFormatter.format(value)}\u00a0DA`;

export function ClassicFinancialPanels({
  categories,
  series,
  controls,
  receivables,
  onOpenFinances,
  loading,
  error,
  onRetry,
}: {
  categories: RiskCategoryData[];
  series: ReceiptsBucket[];
  controls: ReactNode;
  receivables: Receivable[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onOpenFinances?: () => void;
}) {
  const total = categories.reduce((sum, row) => sum + row.totalValue, 0);
  const pending = categories.reduce((sum, row) => sum + row.riskValue, 0);
  const collected = total - pending;
  const unavailable = loading || Boolean(error);
  return (
    <div className="classic-financial-grid">
      <div className="studio-finish">
      <section
        className="studio-panel classic-receipts finance-signature-card"
        aria-label="Recettes"
        aria-busy={loading}
      >
        <header>
          <div>
            <h2>Recettes</h2>
          </div>
          <div className="classic-finance-controls">{controls}</div>
        </header>
        {error && (
          <div className="classic-finance-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={onRetry}>
              Réessayer
            </button>
          </div>
        )}
        {loading && (
          <p className="classic-finance-loading" role="status">
            Actualisation des factures…
          </p>
        )}
        <ReceiptsChart data={series} total={total} collected={collected} unavailable={unavailable} />
        <footer>
          <span>Par date d’émission</span>
          <button
            type="button"
            className="studio-link"
            onClick={onOpenFinances}
          >
            Finances <ArrowUpRight size={14} />
          </button>
        </footer>
      </section>
      </div>
      <div className="studio-finish">
      <section
        className="studio-panel classic-receivables"
        aria-label="Créances"
      >
        <header>
          <div>
            <h2>Créances</h2>
          </div>
          <span className="studio-count" data-pending={pending > 0}>
            {unavailable ? "—" : receivables.length} {receivables.length === 1 ? "dossier" : "dossiers"}
          </span>
        </header>
        <div className="classic-balance" data-pending={pending > 0}>
          <span>Reste à encaisser</span>
          <FittedAmount
            value={unavailable ? "—" : amount(pending)}
            maxFontSize={34}
          />
          {unavailable && (
            <p>
              {loading
                ? "Actualisation en cours…"
                : "Actualisez les factures pour vérifier les soldes."}
            </p>
          )}
        </div>
        <ReceivablesBreakdown receivables={receivables} total={total} collected={collected} unavailable={unavailable} />
        <footer>
          <button
            type="button"
            className="studio-link"
            onClick={onOpenFinances}
          >
            Voir les créances <ArrowUpRight size={14} />
          </button>
        </footer>
      </section>
      </div>
    </div>
  );
}
