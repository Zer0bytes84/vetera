import { ArrowRight, BedDouble, Bell, Package } from "lucide-react";
import type { ReactNode } from "react";

import type { WatchList, WatchRow } from "../model/dashboard-watch";
import { formatTime } from "../v2/model";
import "./dashboard-watch.css";

interface WatchCardProps {
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
  updatedAt?: Date;
}

function WatchCard({
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
  updatedAt,
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
            {summary ? (
              <span className="watchSummary" data-tone={list.critical ? "critical" : "neutral"}>
                {summary}
              </span>
            ) : null}
          </h2>
          <p className="cardNote">
            {note}
            {updatedAt ? (
              <>
                {" · "}
                <span className="watchUpdated">Mis à jour à {formatTime(updatedAt)}</span>
              </>
            ) : null}
          </p>
        </div>
        <button className="moreLink" onClick={onMore} type="button">
          {moreLabel} <ArrowRight aria-hidden="true" size={13} />
        </button>
      </div>
      <div className="cardFlush">
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
                <button onClick={onMore} type="button">
                  + {hidden} autre{hidden > 1 ? "s" : ""}
                </button>
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </section>
  );
}

export interface DashboardWatchProps {
  hospitalized: WatchList;
  onOpenPatient: (patientId: string) => void;
  onReminders: () => void;
  onStays: () => void;
  onStock: () => void;
  reminders: WatchList;
  remindersError?: string | null;
  remindersLoading?: boolean;
  onRemindersRetry?: () => void;
  stock: WatchList;
  /** When the lists were computed, shown in each card's note. */
  updatedAt?: Date;
}

/** Rangée « À surveiller » : trois listes courtes, issues des vraies données. */
export function DashboardWatch({
  hospitalized,
  onOpenPatient,
  onReminders,
  onRemindersRetry,
  onStays,
  onStock,
  reminders,
  remindersError,
  remindersLoading,
  stock,
  updatedAt,
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
        updatedAt={updatedAt}
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
        updatedAt={updatedAt}
      />
      <WatchCard
        emptyText="Aucun animal hospitalisé en ce moment."
        icon={<BedDouble size={15} strokeWidth={1.5} />}
        list={hospitalized}
        moreLabel="Soins"
        note="Animaux admis en ce moment"
        onMore={onStays}
        onRow={(row) => (row.patientId ? onOpenPatient(row.patientId) : onStays())}
        summary={hospitalized.total ? `${hospitalized.total} en cours` : null}
        title="Hospitalisés"
        updatedAt={updatedAt}
      />
    </div>
  );
}
