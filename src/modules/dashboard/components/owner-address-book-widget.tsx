"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bird,
  Cat,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ContactRound,
  Dog,
  FolderOpen,
  Mail,
  MapPin,
  PawPrint,
  Phone,
  Search,
  UsersRound,
} from "lucide-react";
import { createElement, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Appointment, Owner, Patient } from "@/types/db";

interface OwnerAddressBookWidgetProps {
  appointments: Appointment[];
  className?: string;
  onNavigateToPatient?: (patientId: string) => void;
  onOpenPatients?: () => void;
  owners: Owner[];
  patients: Patient[];
}

type OwnerFilter = "all" | "multi" | "incomplete";
const PAGE_SIZE = 4;

const filterOptions: Array<{ label: string; value: OwnerFilter }> = [
  { label: "Tous", value: "all" },
  { label: "Multi-animaux", value: "multi" },
  { label: "À compléter", value: "incomplete" },
];

function parseDate(value?: string) {
  if (!value) {
    return null;
  }
  const normalized = value.includes(" ") ? value.replace(" ", "T") : value;
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date : null;
}

function getLatestDate(dates: Array<Date | null>) {
  const valid = dates.filter((date): date is Date => Boolean(date));
  if (valid.length === 0) {
    return null;
  }
  return new Date(Math.max(...valid.map((date) => date.getTime())));
}

function getPatientSpeciesIcon(species: string) {
  const normalized = species.toLocaleLowerCase("fr");
  if (normalized.includes("chien")) {
    return Dog;
  }
  if (normalized.includes("chat")) {
    return Cat;
  }
  if (normalized.includes("oiseau")) {
    return Bird;
  }
  return PawPrint;
}

function getPatientStatusTone(status: Patient["status"]) {
  if (status === "sante") {
    return { dot: "bg-emerald-500", label: "En bonne santé" };
  }
  if (status === "traitement") {
    return { dot: "bg-amber-500", label: "En traitement" };
  }
  if (status === "hospitalise") {
    return { dot: "bg-rose-500", label: "Hospitalisé" };
  }
  return { dot: "bg-zinc-400", label: "Décédé" };
}

export function OwnerAddressBookWidget({
  appointments,
  className,
  onNavigateToPatient,
  onOpenPatients,
  owners,
  patients,
}: OwnerAddressBookWidgetProps) {
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<OwnerFilter>("all");
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");

  const directory = useMemo(() => {
    const patientsByOwner = new Map<string, Patient[]>();
    for (const patient of patients) {
      const current = patientsByOwner.get(patient.ownerId) ?? [];
      current.push(patient);
      patientsByOwner.set(patient.ownerId, current);
    }

    const appointmentsByPatient = new Map<string, Appointment[]>();
    for (const appointment of appointments) {
      const current = appointmentsByPatient.get(appointment.patientId) ?? [];
      current.push(appointment);
      appointmentsByPatient.set(appointment.patientId, current);
    }

    return owners
      .map((owner) => {
        const pets = patientsByOwner.get(owner.id) ?? [];
        const latestVisit = getLatestDate(
          pets.flatMap((patient) => [
            parseDate(patient.lastVisit),
            ...(appointmentsByPatient.get(patient.id) ?? []).map(
              (appointment) => parseDate(appointment.startTime)
            ),
          ])
        );
        const isComplete = Boolean(owner.phone && owner.email && owner.address);

        return {
          isComplete,
          latestVisit,
          owner,
          pets,
        };
      })
      .sort((a, b) => {
        const dateDiff =
          (b.latestVisit?.getTime() ?? 0) - (a.latestVisit?.getTime() ?? 0);
        if (dateDiff !== 0) {
          return dateDiff;
        }
        return a.owner.lastName.localeCompare(b.owner.lastName, "fr");
      });
  }, [appointments, owners, patients]);

  const summary = useMemo(
    () => ({
      complete: directory.filter((entry) => entry.isComplete).length,
      multiPet: directory.filter((entry) => entry.pets.length > 1).length,
      owners: directory.length,
      patients: directory.reduce((sum, entry) => sum + entry.pets.length, 0),
    }),
    [directory]
  );

  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    return directory.filter((entry) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "multi" && entry.pets.length > 1) ||
        (filter === "incomplete" && !entry.isComplete);
      if (!matchesFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const searchable = [
        entry.owner.firstName,
        entry.owner.lastName,
        entry.owner.phone,
        entry.owner.email,
        entry.owner.city,
        ...entry.pets.flatMap((patient) => [
          patient.name,
          patient.species,
          patient.breed,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr");
      return searchable.includes(normalizedQuery);
    });
  }, [directory, filter, query]);
  const pageCount = Math.max(1, Math.ceil(visibleEntries.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const paginatedEntries = visibleEntries.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  return (
    <section
      aria-labelledby="owner-directory-title"
      className={cn(
        "flex min-h-[430px] flex-col rounded-[20px] border border-zinc-200/80 bg-zinc-50/50 px-1.5 pt-3 pb-1.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/30",
        className
      )}
    >
      <div className="mb-2 flex min-h-7 items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-teal-500/10 text-teal-700 dark:bg-teal-400/10 dark:text-teal-400">
            <ContactRound className="size-3.5" />
          </span>
          <h2
            className="truncate font-heading font-semibold text-sm text-zinc-800 tracking-[-0.02em] dark:text-zinc-200"
            id="owner-directory-title"
          >
            Carnet des propriétaires
          </h2>
          <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 font-semibold text-[10px] text-zinc-500 tabular-nums dark:bg-zinc-800 dark:text-zinc-400">
            {summary.owners}
          </span>
        </div>
        <button
          className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 font-medium text-[11px] text-zinc-500 outline-none transition-colors hover:bg-white hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          onClick={onOpenPatients}
          type="button"
        >
          Tous les patients
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-[12px] border border-zinc-200/60 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="grid grid-cols-2 divide-x divide-y divide-zinc-100 border-zinc-100 border-b sm:grid-cols-4 sm:divide-y-0 dark:divide-zinc-800 dark:border-zinc-800">
          <DirectoryMetric
            icon={ContactRound}
            label="Propriétaires"
            value={summary.owners}
          />
          <DirectoryMetric
            icon={UsersRound}
            label="Foyers multiples"
            value={summary.multiPet}
          />
          <DirectoryMetric
            icon={PawPrint}
            label="Dossiers liés"
            value={summary.patients}
          />
          <DirectoryMetric
            icon={CheckCircle2}
            label="Fiches complètes"
            value={summary.complete}
          />
        </div>

        <div className="flex flex-col gap-3 border-zinc-100 border-b p-4 lg:flex-row lg:items-center lg:justify-between dark:border-zinc-800">
          <label className="relative block min-w-0 flex-1 lg:max-w-md">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <span className="sr-only">Rechercher un propriétaire</span>
            <input
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pr-3 pl-9 text-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-zinc-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-emerald-700 dark:focus:bg-zinc-950"
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Nom, téléphone, email ou animal…"
              type="search"
              value={query}
            />
          </label>

          <fieldset className="flex w-fit rounded-lg border-0 bg-zinc-100 p-1 dark:bg-zinc-900">
            <legend className="sr-only">Filtrer les propriétaires</legend>
            {filterOptions.map((option) => (
              <button
                aria-pressed={filter === option.value}
                className={cn(
                  "relative min-h-8 rounded-md px-3 font-medium text-[10px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                  filter === option.value
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
                )}
                key={option.value}
                onClick={() => {
                  setFilter(option.value);
                  setPage(0);
                }}
                type="button"
              >
                {filter === option.value && (
                  <motion.span
                    className="absolute inset-0 rounded-md bg-white shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/10"
                    layoutId="owner-directory-filter"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 500, damping: 38 }
                    }
                  />
                )}
                <span className="relative z-10">{option.label}</span>
              </button>
            ))}
          </fieldset>
        </div>

        <div className="hidden grid-cols-[minmax(150px,1fr)_minmax(170px,1.1fr)_minmax(210px,1.35fr)_110px] gap-4 border-zinc-100 border-b bg-zinc-50/60 px-4 py-2.5 font-semibold text-[9px] text-zinc-400 uppercase tracking-[0.1em] md:grid dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-500">
          <span>Propriétaire</span>
          <span>Coordonnées</span>
          <span>Patients liés</span>
          <span>Dernière visite</span>
        </div>

        {visibleEntries.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <Search className="mb-3 size-6 text-zinc-400" />
            <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
              Aucun propriétaire trouvé
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Modifiez la recherche ou le filtre sélectionné.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {paginatedEntries.map((entry, index) => (
              <OwnerRow
                entry={entry}
                index={index}
                key={entry.owner.id}
                onNavigateToPatient={onNavigateToPatient}
                reduceMotion={Boolean(reduceMotion)}
              />
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-zinc-100 border-t px-4 py-3 text-[10px] dark:border-zinc-800">
          <span className="text-zinc-500 dark:text-zinc-400">
            {visibleEntries.length} résultat
            {visibleEntries.length > 1 ? "s" : ""}
          </span>
          {visibleEntries.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
                {currentPage + 1} / {pageCount}
              </span>
              <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  aria-label="Page précédente"
                  className="flex size-7 items-center justify-center rounded-md text-zinc-500 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-35 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  disabled={currentPage === 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  type="button"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <button
                  aria-label="Page suivante"
                  className="flex size-7 items-center justify-center rounded-md text-zinc-500 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-35 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() =>
                    setPage((current) => Math.min(pageCount - 1, current + 1))
                  }
                  type="button"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
          {visibleEntries.length === 0 && (
            <button
              className="font-medium text-zinc-700 outline-none hover:text-zinc-950 focus-visible:underline dark:text-zinc-300 dark:hover:text-white"
              onClick={onOpenPatients}
              type="button"
            >
              Ouvrir les patients
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function DirectoryMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ContactRound;
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-0 p-3.5 sm:px-4">
      <span className="flex min-h-4 items-center gap-1.5 font-semibold text-[10px] text-zinc-400 uppercase tracking-[0.1em] dark:text-zinc-500">
        <Icon className="size-3" />
        {label}
      </span>
      <span className="mt-1 block font-heading font-semibold text-xl text-zinc-900 tabular-nums leading-none tracking-[-0.035em] dark:text-zinc-100">
        {value}
      </span>
    </div>
  );
}

function OwnerRow({
  entry,
  index,
  onNavigateToPatient,
  reduceMotion,
}: {
  entry: {
    isComplete: boolean;
    latestVisit: Date | null;
    owner: Owner;
    pets: Patient[];
  };
  index: number;
  onNavigateToPatient?: (patientId: string) => void;
  reduceMotion: boolean;
}) {
  const ownerName = `${entry.owner.firstName} ${entry.owner.lastName}`.trim();
  const initials =
    `${entry.owner.firstName.charAt(0)}${entry.owner.lastName.charAt(0)}`.toUpperCase();

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-3 px-4 py-3 transition-colors odd:bg-zinc-50/35 hover:bg-emerald-50/35 md:grid-cols-[minmax(150px,1fr)_minmax(170px,1.1fr)_minmax(210px,1.35fr)_110px] md:items-center md:gap-4 dark:hover:bg-emerald-950/10 dark:odd:bg-zinc-900/20"
      initial={reduceMotion ? false : { opacity: 0, y: 5 }}
      transition={{ duration: 0.2, delay: reduceMotion ? 0 : index * 0.025 }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-500/10 font-heading font-semibold text-teal-700 text-xs ring-1 ring-teal-500/10 dark:text-teal-300">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            {ownerName}
          </p>
          <span
            className={cn(
              "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-[9px]",
              entry.isComplete
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {entry.isComplete ? "Fiche complète" : "À compléter"}
          </span>
        </div>
      </div>

      <div className="min-w-0 space-y-1 text-[11px]">
        <a
          className="flex min-w-0 items-center gap-1.5 text-zinc-600 outline-none hover:text-zinc-950 focus-visible:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          href={`tel:${entry.owner.phone}`}
        >
          <Phone className="size-3 shrink-0" />
          <span className="truncate tabular-nums">{entry.owner.phone}</span>
        </a>
        {entry.owner.email ? (
          <a
            className="flex min-w-0 items-center gap-1.5 text-zinc-500 outline-none hover:text-zinc-950 focus-visible:underline dark:text-zinc-500 dark:hover:text-zinc-100"
            href={`mailto:${entry.owner.email}`}
          >
            <Mail className="size-3 shrink-0" />
            <span className="truncate">{entry.owner.email}</span>
          </a>
        ) : (
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Mail className="size-3" />
            Email manquant
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap gap-1.5">
        {entry.pets.length === 0 ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] text-zinc-400">
            <PawPrint className="size-3" />
            Aucun dossier lié
          </span>
        ) : (
          entry.pets
            .slice(0, 3)
            .map((patient) => (
              <PatientChip
                key={patient.id}
                onNavigateToPatient={onNavigateToPatient}
                patient={patient}
              />
            ))
        )}
        {entry.pets.length > 3 && (
          <span className="inline-flex min-h-7 items-center rounded-full bg-zinc-100 px-2 text-[10px] text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            +{entry.pets.length - 3}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 md:justify-end">
        <span className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500 tabular-nums dark:text-zinc-400">
          <MapPin className="size-3 text-zinc-400" />
          {entry.latestVisit
            ? entry.latestVisit.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "2-digit",
              })
            : "Aucune"}
        </span>
        {entry.pets[0] && (
          <button
            aria-label={`Ouvrir le dossier de ${entry.pets[0].name}`}
            className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 outline-none transition-colors hover:border-emerald-200 hover:bg-emerald-500/10 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-emerald-900 dark:hover:text-emerald-400"
            onClick={() => onNavigateToPatient?.(entry.pets[0].id)}
            type="button"
          >
            <FolderOpen className="size-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function PatientChip({
  onNavigateToPatient,
  patient,
}: {
  onNavigateToPatient?: (patientId: string) => void;
  patient: Patient;
}) {
  const speciesIcon = createElement(getPatientSpeciesIcon(patient.species), {
    className: "size-3.5",
  });
  const status = getPatientStatusTone(patient.status);

  return (
    <button
      className="group/pet inline-flex min-h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 font-medium text-[10px] text-zinc-700 shadow-3xs outline-none transition-[border-color,background-color,color] hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400"
      onClick={() => onNavigateToPatient?.(patient.id)}
      title={`${patient.species} · ${status.label}`}
      type="button"
    >
      {speciesIcon}
      {patient.name}
      <span
        className={cn("size-1.5 rounded-full", status.dot)}
        title={status.label}
      />
      <FolderOpen className="size-3 opacity-50 transition-opacity group-hover/pet:opacity-100" />
    </button>
  );
}
