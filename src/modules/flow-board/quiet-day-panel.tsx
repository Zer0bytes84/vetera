import { ArrowRightIcon, PlusIcon, UserPlusIcon } from "@heroicons/react/16/solid";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useTransactionsRepository } from "@/data/repositories";
import { formatCentimes } from "@/modules/dashboard/v2/model";
import { formatNumber } from "@/utils/display-format";
import { buildQuietDay } from "./quiet-day";

const dayAndTime = (iso: string, today: boolean) => {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (today) return `Aujourd’hui · ${time}`;
  const day = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return `${day[0].toLocaleUpperCase("fr-FR")}${day.slice(1)} · ${time}`;
};

/**
 * La journée n'a aucune visite : à la place de « Prévus aujourd'hui », sur la grille des cinq colonnes, ce qui sert à
 * cette heure-là. Le prochain rendez-vous, le résumé du jour, et les gestes qui existent déjà (arrivée sans
 * rendez-vous, nouveau rendez-vous, agenda). Aucune mécanique nouvelle : les boutons ouvrent ce qu'ouvrent leurs
 * équivalents ailleurs.
 */
export function QuietDayPanel({
  appointments,
  patients,
  vets,
  vetId,
  now,
  onWalkIn,
  onNewAppointment,
  onAgenda,
}: {
  appointments: Parameters<typeof buildQuietDay>[0]["appointments"];
  patients: Parameters<typeof buildQuietDay>[0]["patients"];
  vets: { id: string; name: string }[];
  vetId: string;
  now: Date;
  onWalkIn: () => void;
  onNewAppointment: () => void;
  onAgenda: () => void;
}) {
  const transactions = useTransactionsRepository();
  const day = useMemo(
    () => buildQuietDay({ appointments, patients, vets, transactions: transactions.data, now, vetId }),
    [appointments, patients, vets, transactions.data, now, vetId],
  );
  const vet = vets.find((entry) => entry.id === vetId)?.name;
  return (
    <section aria-label="Journée sans visite" className="flow-quiet">
      <div className="flow-quiet-cell flow-quiet-next">
        <h2 className="flow-quiet-label">Prochain rendez-vous{vet ? ` · ${vet}` : ""}</h2>
        {day.next ? (
          <>
            <p className="flow-quiet-when">{dayAndTime(day.next.startTime, day.next.today)}</p>
            <p className="flow-quiet-what">
              <strong>{day.next.patientName}</strong>
              {day.next.reason ? <span> · {day.next.reason}</span> : null}
            </p>
            {day.next.vetName && !vet ? <p className="flow-quiet-meta">{day.next.vetName}</p> : null}
          </>
        ) : (
          <p className="flow-quiet-when">Aucun rendez-vous à venir</p>
        )}
        <Button className="flow-quiet-link" onClick={onAgenda} size="sm" type="button" variant="ghost">
          Ouvrir l’agenda
          <ArrowRightIcon aria-hidden="true" className="size-3.5" />
        </Button>
      </div>

      <div className="flow-quiet-cell">
        <h2 className="flow-quiet-label">Aujourd’hui</h2>
        <dl className="flow-quiet-facts">
          <div>
            <dt>Visites</dt>
            <dd>0</dd>
          </div>
          <div>
            <dt>Annulés</dt>
            <dd>{formatNumber(day.cancelledToday)}</dd>
          </div>
          <div>
            <dt>Absences</dt>
            <dd>{formatNumber(day.noShowToday)}</dd>
          </div>
          <div>
            <dt>Encaissé</dt>
            <dd>{transactions.loading ? "…" : formatCentimes(day.receiptsToday)}</dd>
          </div>
        </dl>
        <p className="flow-quiet-meta">
          {day.week
            ? `${formatNumber(day.week)} rendez-vous d’ici 7 jours`
            : "Aucun rendez-vous d’ici 7 jours"}
        </p>
      </div>

      <div className="flow-quiet-cell flow-quiet-actions">
        <h2 className="flow-quiet-label">Actions</h2>
        <Button className="justify-start" onClick={onWalkIn} size="sm" type="button">
          <UserPlusIcon aria-hidden="true" className="size-4" />
          Arrivée sans RDV
        </Button>
        <Button className="justify-start" onClick={onNewAppointment} size="sm" type="button" variant="outline">
          <PlusIcon aria-hidden="true" className="size-4" />
          Nouveau rendez-vous
        </Button>
      </div>
    </section>
  );
}
