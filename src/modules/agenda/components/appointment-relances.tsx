import { PhoneIcon, UserIcon } from "@heroicons/react/16/solid";
import { ClockIcon } from "@heroicons/react/20/solid";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { useOwnersRepository } from "@/data/repositories";
import { isRelanceDue, nextRelanceChange } from "@/lib/appointment-relance";
import { appointmentMessage } from "@/lib/whatsapp";
import type { Appointment, Patient } from "@/types/db";
import { formatPhone } from "@/utils/display-format";

// The clock is read again at least once a minute, in case the computer slept through a planned wake-up.
const LONGEST_WAIT = 60_000;
// A timer may fire a hair before its time: wait just past the boundary.
const PAST_THE_BOUNDARY = 25;

/**
 * The time the reminders are read at. It moves on exactly when a reminder comes up or goes away (and at least once a
 * minute), and when the window comes back into view, so the page never needs reloading.
 */
function useRelanceClock(appointments: readonly Appointment[]): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const next = nextRelanceChange(appointments, now);
    const wait =
      next === null
        ? LONGEST_WAIT
        : Math.min(next + PAST_THE_BOUNDARY, LONGEST_WAIT);
    const timer = window.setTimeout(() => setNow(new Date()), wait);
    return () => window.clearTimeout(timer);
  }, [appointments, now]);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setNow(new Date());
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  return now;
}

const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * « Rendez-vous dans l’heure », at the top of today's reminders: each visit still to come within the hour, with
 * « Relance WhatsApp » when the owner's number makes a link. One click opens WhatsApp with the message ready; the person
 * sends it there. Renders nothing when no appointment is within the hour.
 */
export function AppointmentRelances({
  appointments,
  patients,
  query,
}: {
  appointments: readonly Appointment[];
  patients: readonly Patient[];
  /** The Rappels search: matched against the animal, the owner and the reason. */
  query: string;
}) {
  const owners = useOwnersRepository();
  const now = useRelanceClock(appointments);
  const rows = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("fr-FR");
    return appointments
      .filter((appointment) => isRelanceDue(appointment, now))
      .map((appointment) => {
        const patient = patients.find(
          (entry) => entry.id === appointment.patientId
        );
        const owner = owners.data.find(
          (entry) => entry.id === (patient?.ownerId ?? appointment.ownerId)
        );
        const ownerName = owner
          ? `${owner.firstName} ${owner.lastName}`.trim()
          : "";
        return { appointment, owner, ownerName, patient };
      })
      .filter(
        ({ appointment, ownerName, patient }) =>
          !search ||
          [
            patient?.name,
            ownerName,
            appointment.reason,
            appointment.title,
          ].some((value) => value?.toLocaleLowerCase("fr-FR").includes(search))
      )
      .sort(
        (left, right) =>
          new Date(left.appointment.startTime).getTime() -
          new Date(right.appointment.startTime).getTime()
      );
  }, [appointments, now, owners.data, patients, query]);

  if (!rows.length) {
    return null;
  }

  return (
    <section
      aria-label={`Rendez-vous dans l’heure : ${rows.length}`}
      className="reminder-group clinical-surface divide-y divide-border/70 overflow-hidden"
      data-bucket="relance"
    >
      <h2 className="reminder-group-head">
        Rendez-vous dans l’heure
        <span className="tabular-nums">{rows.length}</span>
      </h2>
      {rows.map(({ appointment, owner, ownerName, patient }) => {
        const start = new Date(appointment.startTime);
        const animal = patient?.name?.trim();
        const phone = formatPhone(owner?.phone);
        return (
          <article
            className="appointment-relance flex flex-col gap-4 bg-sky-500/[0.025] p-4 sm:flex-row sm:items-center sm:p-5"
            data-appointment-id={appointment.id}
            key={appointment.id}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300">
              <ClockIcon aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-sm">
                  {animal || "Patient indisponible"} ·{" "}
                  {timeFormat.format(start)}
                </h3>
                <Badge
                  className="border-sky-500/20 bg-sky-500/8 text-sky-700 dark:text-sky-300"
                  variant="outline"
                >
                  Rendez-vous
                </Badge>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <UserIcon aria-hidden="true" className="size-3.5" />
                  {ownerName || "Propriétaire indisponible"}
                </span>
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <PhoneIcon aria-hidden="true" className="size-3.5" />
                  {phone || "Téléphone non renseigné"}
                </span>
                {appointment.reason ? <span>{appointment.reason}</span> : null}
              </div>
            </div>
            {animal ? (
              <WhatsAppLink
                action="Relance WhatsApp"
                className={buttonVariants({ size: "sm", variant: "outline" })}
                message={appointmentMessage({ animal, start })}
                ownerName={ownerName}
                phone={owner?.phone}
                text="Relance WhatsApp"
              />
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
