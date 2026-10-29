import { BedDouble, Bell, Package, PawPrint } from "lucide-react";
import type { ReactNode } from "react";

import type { WatchList, WatchRow } from "../model/dashboard-watch";
import type { SpeciesRow } from "../model/dashboard-widgets";
import { SpeciesSplit, WidgetFooter } from "./widget-units";
import "./dashboard-watch.css";
import "./widget-units.css";

interface WatchCardProps {
  /** Shown above the list or the empty sentence (the hospital capacity). */
  aside?: ReactNode;
  emptyText: string;
  error?: string | null;
  icon: ReactNode;
  list: WatchList;
  loading?: boolean;
  moreLabel: string;
  note: string;
  onMore: () => void;
  onRetry?: () => void;
  onRow: (row: WatchRow) => void;
  /** Résumé court affiché à côté du titre (« 2 en retard »). */
  summary?: string | null;
  title: string;
}

function WatchCard({
  aside,
  emptyText,
  error,
  icon,
  list,
  loading,
  moreLabel,
  note,
  onMore,
  onRetry,
  onRow,
  summary,
  title,
}: WatchCardProps) {
  const hidden = list.total - list.rows.length;
  return (
    <section aria-label={title} className="card frame watchCard">
      <div className="cardHead">
        <div>
          <h2 className="cardTitle watchTitle">
            <span aria-hidden="true" className="watchIcon">
              {icon}
            </span>
            {title}
          </h2>
          <p className="cardNote">{note}</p>
        </div>
      </div>
      <div className="cardFlush">
        {aside}
        {error ? (
          <p className="watchEmpty" role="alert">
            {error}{" "}
            {onRetry ? (
              <button className="watchRetry" onClick={onRetry} type="button">
                Réessayer
              </button>
            ) : null}
          </p>
        ) : loading ? (
          <p aria-busy="true" className="watchEmpty">
            Chargement…
          </p>
        ) : list.rows.length === 0 ? (
          <p className="watchEmpty">{emptyText}</p>
        ) : (
          <ul className="watchList">
            {list.rows.map((row) => (
              <li key={row.id}>
                <button className="watchRow" onClick={() => onRow(row)} type="button">
                  <span aria-hidden="true" className="watchDot" data-tone={row.tone} />
                  <span className="watchText">
                    <strong>{row.title}</strong>
                    <span>{row.detail}</span>
                  </span>
                  <span className="watchMeta" data-tone={row.tone}>
                    {row.meta}
                  </span>
                </button>
              </li>
            ))}
            {hidden > 0 ? (
              <li className="watchMore">
                + {hidden} autre{hidden > 1 ? "s" : ""} dans {moreLabel}
              </li>
            ) : null}
          </ul>
        )}
      </div>
      {/* What to know, then the card's single action. */}
      <WidgetFooter action={moreLabel} onAction={onMore}>
        {error || loading ? null : summary ? (
          <span className="watchSummary" data-tone={list.critical ? "critical" : "neutral"}>
            {summary}
          </span>
        ) : (
          "Rien à traiter"
        )}
      </WidgetFooter>
    </section>
  );
}

export interface DashboardWatchProps {
  hospitalized: WatchList;
  /** Places occupied and free, from the same data as the Occupation view. */
  hospitalizedCapacity?: ReactNode;
  onOpenPatient: (patientId: string) => void;
  onReminders: () => void;
  onStays: () => void;
  onStock: () => void;
  reminders: WatchList;
  remindersError?: string | null;
  remindersLoading?: boolean;
  onRemindersRetry?: () => void;
  stock: WatchList;
  /** Active patients by species; omitted while the patients load. */
  species?: { total: number; recent: number; rows: SpeciesRow[] };
  onPatients?: () => void;
}

/** Rangée « À surveiller » : trois listes courtes, issues des vraies données. */
export function DashboardWatch({
  hospitalized,
  hospitalizedCapacity,
  onOpenPatient,
  onReminders,
  onRemindersRetry,
  onStays,
  onStock,
  reminders,
  remindersError,
  remindersLoading,
  stock,
  species,
  onPatients,
}: DashboardWatchProps) {
  return (
    <div className="watchGrid">
      <WatchCard
        emptyText="Aucun rappel dans les 14 prochains jours."
        error={remindersError}
        icon={<Bell size={15} strokeWidth={1.5} />}
        list={reminders}
        loading={remindersLoading}
        moreLabel="Rappels"
        note="En retard et sous 14 jours"
        onMore={onReminders}
        onRetry={onRemindersRetry}
        onRow={(row) => (row.patientId ? onOpenPatient(row.patientId) : onReminders())}
        summary={reminders.critical ? `${reminders.critical} en retard` : null}
        title="Rappels à venir"
      />
      <WatchCard
        emptyText="Stock à jour : aucun seuil atteint ni lot proche de péremption."
        icon={<Package size={15} strokeWidth={1.5} />}
        list={stock}
        moreLabel="Produits"
        note="Seuils et péremptions sous 60 jours"
        onMore={onStock}
        onRow={onStock}
        summary={stock.total ? `${stock.total} à traiter` : null}
        title="Stock à surveiller"
      />
      <WatchCard
        aside={hospitalizedCapacity}
        emptyText="Aucun animal hospitalisé en ce moment."
        icon={<BedDouble size={15} strokeWidth={1.5} />}
        list={hospitalized}
        moreLabel="Soins"
        note="Animaux admis en ce moment"
        onMore={onStays}
        onRow={(row) => (row.patientId ? onOpenPatient(row.patientId) : onStays())}
        summary={hospitalized.total ? `${hospitalized.total} en cours` : null}
        title="Hospitalisés"
      />
      {species ? <SpeciesCard onPatients={onPatients} species={species} /> : null}
    </div>
  );
}

/** Patients par espèce: the donut and its rows, then the plain-language share. */
function SpeciesCard({
  onPatients,
  species,
}: {
  onPatients?: () => void;
  species: { total: number; recent: number; rows: SpeciesRow[] };
}) {
  const first = species.rows[0];
  return (
    <section aria-label="Patients par espèce" className="card frame watchCard speciesCard">
      <div className="cardHead">
        <div>
          <h2 className="cardTitle watchTitle">
            <span aria-hidden="true" className="watchIcon">
              <PawPrint size={15} strokeWidth={1.5} />
            </span>
            Patients par espèce
          </h2>
          <p className="cardNote">
            {species.total} patient{species.total > 1 ? "s" : ""} actif{species.total > 1 ? "s" : ""}, décédés exclus
          </p>
        </div>
      </div>
      <div className="cardFlush">
        {species.total ? <SpeciesSplit split={species} /> : <p className="watchEmpty">Aucun patient actif pour l’instant.</p>}
      </div>
      <WidgetFooter action="Patients" onAction={() => onPatients?.()}>
        {first
          ? `${first.name} : ${first.share} % des patients actifs${species.recent ? ` · ${species.recent} nouveau${species.recent > 1 ? "x" : ""} sur 30 jours` : ""}`
          : null}
      </WidgetFooter>
    </section>
  );
}
