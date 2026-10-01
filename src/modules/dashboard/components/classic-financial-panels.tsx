import type { ReactNode } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { FittedAmount } from "@/shared/ui/fitted-amount";
import type { Receivable } from "../v2/financial-model";
import type { RiskCategoryData } from "./financial-risk-donut-widget";

const amountFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});
const amount = (value: number) => `${amountFormatter.format(value)}\u00a0DA`;
const palette = ["#7651ed", "#0891b2"];

export function ClassicFinancialPanels({
  categories,
  controls,
  receivables,
  page,
  pageCount,
  onPage,
  onOpenFinances,
  loading,
  error,
  onRetry,
}: {
  categories: RiskCategoryData[];
  controls: ReactNode;
  receivables: Receivable[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  onOpenFinances?: () => void;
}) {
  const total = categories.reduce((sum, row) => sum + row.totalValue, 0);
  const pending = categories.reduce((sum, row) => sum + row.riskValue, 0);
  const collected = total - pending;
  const rate = total
    ? Math.min(pending > 0 ? 99 : 100, Math.round((collected / total) * 100))
    : null;
  const data = [
    { name: "Encaissé", value: collected, fill: "#10b981" },
    { name: "À encaisser", value: pending, fill: "#f59e0b" },
  ].filter((row) => row.value > 0);
  const unavailable = loading || Boolean(error);
  const visible = receivables.slice(page * 4, page * 4 + 4);
  return (
    <div className="classic-financial-grid">
      <div className="studio-finish">
      <section
        className="studio-panel classic-receipts"
        aria-label="Recettes et règlements"
        aria-busy={loading}
      >
        <header>
          <div>
            <h2>Recettes & règlements</h2>
            <p>Factures nettes d’avoirs et recettes hors facture.</p>
          </div>
        </header>
        <div className="classic-finance-controls">{controls}</div>
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
        <div className="classic-finance-totals">
          <div>
            <span>Recettes nettes</span>
            <FittedAmount
              value={unavailable ? "—" : amount(total)}
              maxFontSize={28}
            />
          </div>
          <div className="classic-collected">
            <span>Encaissé</span>
            <FittedAmount
              value={unavailable ? "—" : amount(collected)}
              maxFontSize={28}
            />
          </div>
        </div>
        <div className="classic-finance-distribution">
          <div className="classic-donut">
            {!unavailable && total > 0 ? (
              <ChartContainer
                config={{ value: { label: "Montant" } }}
                className="classic-donut-chart"
                initialDimension={{ width: 200, height: 200 }}
              >
                <PieChart accessibilityLayer>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="72%"
                    outerRadius="94%"
                    paddingAngle={data.length > 1 ? 3 : 0}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {data.map((row) => (
                      <Cell key={row.name} fill={row.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => amount(Number(value))}
                      />
                    }
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="classic-empty-ring" />
            )}
            <div className="classic-donut-label">
              <strong>{unavailable || rate === null ? "—" : `${rate}%`}</strong>
              <span>
                {unavailable
                  ? "Indisponible"
                  : rate === null
                    ? "Aucune recette"
                    : "encaissé"}
              </span>
            </div>
          </div>
          <div className="classic-category-list">
            {categories.map((row) => (
              <div key={row.id}>
                <div className="classic-category-heading">
                  <span>
                    <i
                      style={{
                        background:
                          row.id === "invoices" ? palette[0] : palette[1],
                      }}
                    />
                    {row.label}
                  </span>
                  <strong>{amount(row.totalValue)}</strong>
                </div>
                <div
                  className="classic-category-track"
                  role="img"
                  aria-label={`${row.label} : ${amount(row.safeValue)} encaissés et ${amount(row.riskValue)} en attente`}
                >
                  <span
                    style={{
                      width: `${row.totalValue ? (row.safeValue / row.totalValue) * 100 : 0}%`,
                      background:
                        row.id === "invoices" ? palette[0] : palette[1],
                    }}
                  />
                </div>
                <p>
                  {row.totalCount ?? 0}{" "}
                  {row.id === "invoices" ? "factures" : "écritures"}
                  <span>{amount(row.riskValue)} en attente</span>
                </p>
              </div>
            ))}
          </div>
        </div>
        <footer>
          <span>Période selon la date d’émission ou d’écriture.</span>
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
        aria-label="Créances à suivre"
      >
        <header>
          <div>
            <h2>Créances à suivre</h2>
            <p>Soldes ouverts sur la période sélectionnée.</p>
          </div>
          <span className="studio-count" data-pending={pending > 0}>
            {unavailable ? "—" : receivables.length} à suivre
          </span>
        </header>
        <div className="classic-balance" data-pending={pending > 0}>
          <span>Reste à encaisser</span>
          <FittedAmount
            value={unavailable ? "—" : amount(pending)}
            maxFontSize={34}
          />
          <p>
            {loading
              ? "Actualisation en cours…"
              : error
                ? "Actualisez les factures pour vérifier les soldes."
                : rate === null
                  ? "Aucune recette sur cette période"
                  : pending === 0
                    ? "Tous les règlements de la période sont à jour"
                    : `${receivables.length} ${receivables.length === 1 ? "solde à recouvrer" : "soldes à recouvrer"}`}
          </p>
        </div>
        <div className="classic-debt-list">
          {error && (
            <p className="classic-debt-empty" role="status">
              Soldes indisponibles. Réessayez le chargement des factures.
            </p>
          )}
          {visible.map((receivable) => (
            <button key={receivable.id} type="button" onClick={onOpenFinances}>
              <span>
                <strong>{receivable.label}</strong>
                <small>{receivable.detail}</small>
              </span>
              <strong>{amount(receivable.balance)}</strong>
              <ArrowUpRight size={14} />
            </button>
          ))}
          {!receivables.length && !unavailable && (
            <p className="classic-debt-empty">
              {pending > 0
                ? "Des écritures sont en attente. Leur détail est disponible dans Finances."
                : "Aucun solde à recouvrer sur cette période."}
            </p>
          )}
        </div>
        <footer>
          <button
            type="button"
            className="studio-link"
            onClick={onOpenFinances}
          >
            Voir les règlements <ArrowUpRight size={14} />
          </button>
          {pageCount > 1 && (
            <nav
              className="studio-date-controls"
              aria-label="Pagination des créances"
            >
              <button
                type="button"
                disabled={page === 0}
                aria-label="Page précédente des créances"
                onClick={() => onPage(page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span aria-live="polite">
                {page + 1} / {pageCount}
              </span>
              <button
                type="button"
                disabled={page === pageCount - 1}
                aria-label="Page suivante des créances"
                onClick={() => onPage(page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </footer>
      </section>
      </div>
    </div>
  );
}
