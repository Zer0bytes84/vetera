import { PhoneIcon, UserIcon } from "@heroicons/react/16/solid";
import { ClockIcon } from "@heroicons/react/20/solid";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { useOwnersRepository } from "@/data/repositories";
import {
  nextRelanceChange,
  type RelanceKind,
  relanceKind,
} from "@/lib/appointment-relance";
import { appointmentMessage, missedAppointmentMessage } from "@/lib/whatsapp";
import type { Appointment, Owner, Patient } from "@/types/db";
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
const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  weekday: "short",
});

interface RelanceRow {
  appointment: Appointment;
  kind: RelanceKind;
  owner?: Owner;
  ownerName: string;
  patient?: Patient;
}

const GROUPS: Record<
  RelanceKind,
  { bucket: string; label: string; message: typeof appointmentMessage }
> = {
  before: {
    bucket: "relance",
    label: "Rendez-vous dans l’heure",
    message: appointmentMessage,
  },
  missed: {
    bucket: "relance-manquee",
    label: "Rendez-vous manqués",
    message: missedAppointmentMessage,
  },
};

/**
 * The appointment relaunches, at the top of today's reminders, each with « Relance WhatsApp » when the owner's number
 * makes a link. One click opens WhatsApp with the message ready; the person sends it there.
 * - « Rendez-vous dans l’heure »: each visit still to come within the hour.
 * - « Rendez-vous manqués »: each visit past its hour and not marked arrived, or marked absent, for 7 days.
 * Renders nothing when there is no relaunch.
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
      .flatMap((appointment): RelanceRow[] => {
        const kind = relanceKind(appointment, now);
        if (!kind) {
          return [];
        }
        const patient = patients.find(
          (entry) => entry.id === appointment.patientId
        );
        const owner = owners.data.find(
          (entry) => entry.id === (patient?.ownerId ?? appointment.ownerId)
        );
        const ownerName = owner
          ? `${owner.firstName} ${owner.lastName}`.trim()
          : "";
        return [{ appointment, kind, owner, ownerName, patient }];
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
      );
  }, [appointments, now, owners.data, patients, query]);

  const byStart = (left: RelanceRow, right: RelanceRow) =>
    new Date(left.appointment.startTime).getTime() -
    new Date(right.appointment.startTime).getTime();
  const before = rows.filter((row) => row.kind === "before").sort(byStart);
  // The most recent missed visit first.
  const missed = rows
    .filter((row) => row.kind === "missed")
    .sort((left, right) => byStart(right, left));

  return (
    <>
      <RelanceGroup kind="before" rows={before} />
      <RelanceGroup kind="missed" rows={missed} />
    </>
  );
}

function badgeLabel(kind: RelanceKind, status: Appointment["status"]) {
  if (kind === "before") {
    return "Rendez-vous";
  }
  return status === "no_show" ? "Absent" : "Non arrivé";
}

function RelanceGroup({
  kind,
  rows,
}: {
  kind: RelanceKind;
  rows: RelanceRow[];
}) {
  if (!rows.length) {
    return null;
  }
  const group = GROUPS[kind];
  return (
    <section
      aria-label={`${group.label} : ${rows.length}`}
      className="reminder-group clinical-surface divide-y divide-border/70 overflow-hidden"
      data-bucket={group.bucket}
    >
      <h2 className="reminder-group-head">
        {group.label}
        <span className="tabular-nums">{rows.length}</span>
      </h2>
      {rows.map(({ appointment, owner, ownerName, patient }) => {
        const start = new Date(appointment.startTime);
        const animal = patient?.name?.trim();
        const phone = formatPhone(owner?.phone);
        const when =
          kind === "missed"
            ? `${dayFormat.format(start)} · ${timeFormat.format(start)}`
            : timeFormat.format(start);
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
                  {animal || "Patient indisponible"} · {when}
                </h3>
                <Badge
                  className="border-sky-500/20 bg-sky-500/8 text-sky-700 dark:text-sky-300"
                  variant="outline"
                >
                  {badgeLabel(kind, appointment.status)}
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
                message={group.message({ animal, start })}
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
