"use client";
/* eslint-disable react-hooks/purity */

import {
  BookOpenTextIcon,
  Calendar01Icon,
  CalendarAdd01Icon,
  ClinicIcon,
  DashboardSquare01Icon,
  FileSearchIcon,
  HospitalBed01Icon,
  MedicalFileIcon,
  Package02Icon,
  PillIcon,
  Settings02Icon,
  StethoscopeIcon,
  Task01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  VaccineIcon,
  WalletIcon,
} from "@/lib/hugeicons";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Locale } from "date-fns";
import { format } from "date-fns";
import { ar, de, enUS, es, fr, pt } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import {
  useAppointmentsRepository,
  usePatientsRepository,
} from "@/data/repositories";
import type { View } from "@/types";
import type { Appointment, Patient } from "@/types/db";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
  onNavigateToPatient: (patientId: string) => void;
}

const localeByLanguage: Record<string, Locale> = {
  fr,
  en: enUS,
  ar,
  es,
  pt,
  de,
};

const RECENTS_KEY = "vetera:palette-recents";
const RECENTS_MAX = 5;

type RecentKind = "patient" | "view";

interface RecentEntry {
  at: number;
  id: string;
  kind: RecentKind;
  label: string;
  sub?: string;
}

const loadRecents = (): RecentEntry[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (e): e is RecentEntry =>
        typeof e === "object" &&
        e !== null &&
        "kind" in e &&
        "id" in e &&
        "label" in e &&
        "at" in e &&
        typeof e.id === "string" &&
        typeof e.label === "string" &&
        typeof e.at === "number" &&
        (e.kind === "patient" || e.kind === "view")
    );
  } catch {
    return [];
  }
};

const saveRecents = (entries: RecentEntry[]) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
};

const pushRecent = (entry: RecentEntry) => {
  const all = loadRecents().filter((e) => e.id !== entry.id);
  all.unshift(entry);
  saveRecents(all.slice(0, RECENTS_MAX));
};

interface NavAction {
  category: string;
  icon: IconSvgElement;
  id: View;
  label: string;
  sub: string;
}

const normalizeSearch = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/**
 * cmdk's default scorer is intentionally English-centric. The palette is
 * localized and also searches clinical data, so use one accent-insensitive
 * scorer for every item instead of letting navigation and records disagree.
 */
const commandFilter = (
  value: string,
  search: string,
  keywords?: string[]
) => {
  const normalizedSearch = normalizeSearch(search);
  if (!normalizedSearch) {
    return 1;
  }

  const haystack = normalizeSearch(
    `${value} ${(keywords ?? []).join(" ")}`
  );
  if (haystack === normalizedSearch) {
    return 1;
  }
  if (haystack.startsWith(normalizedSearch)) {
    return 0.95;
  }
  if (haystack.includes(normalizedSearch)) {
    return 0.8;
  }

  const tokens = normalizedSearch.split(/\s+/).filter(Boolean);
  const matchedTokens = tokens.filter((token) => haystack.includes(token));
  return matchedTokens.length === tokens.length ? 0.65 : 0;
};

const matchesSearch = (value: string, search: string) => {
  const normalizedValue = normalizeSearch(value);
  const tokens = normalizeSearch(search).split(/\s+/).filter(Boolean);
  return tokens.every((token) => normalizedValue.includes(token));
};

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onNavigateToPatient,
}: CommandPaletteProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "fr";
  const dateLocale = localeByLanguage[lang] ?? fr;

  const { data: patients, loading: patientsLoading } =
    usePatientsRepository();
  const { data: appointments, loading: appointmentsLoading } =
    useAppointmentsRepository();

  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      setRecents(loadRecents());
      setQuery("");

      // Base UI restores focus to the dialog, not necessarily the command
      // field. Focus the actual input after the portal has mounted so typing
      // can start immediately with ⌘K or a header click.
      const frame = window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLInputElement>("[data-command-palette-input]")
          ?.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }
    setQuery("");
  }, [isOpen]);

  const navigationActions: NavAction[] = useMemo(
    () => [
      {
        id: "dashboard",
        label: t("commandPalette.nav.dashboard"),
        sub: t("commandPalette.nav.dashboardSub"),
        icon: DashboardSquare01Icon,
        category: t("commandPalette.category.pilotage"),
      },
      {
        id: "agenda",
        label: t("commandPalette.nav.agenda"),
        sub: t("commandPalette.nav.agendaSub"),
        icon: Calendar01Icon,
        category: t("commandPalette.category.pilotage"),
      },
      {
        id: "taches",
        label: t("commandPalette.nav.tasks"),
        sub: t("commandPalette.nav.tasksSub"),
        icon: Task01Icon,
        category: t("commandPalette.category.pilotage"),
      },
      {
        id: "patients",
        label: t("commandPalette.nav.patients"),
        sub: t("commandPalette.nav.patientsSub"),
        icon: StethoscopeIcon,
        category: t("commandPalette.category.parcours"),
      },
      {
        id: "clinique",
        label: t("commandPalette.nav.clinique"),
        sub: t("commandPalette.nav.cliniqueSub"),
        icon: ClinicIcon,
        category: t("commandPalette.category.parcours"),
      },
      {
        id: "notes",
        label: t("commandPalette.nav.notes"),
        sub: t("commandPalette.nav.notesSub"),
        icon: BookOpenTextIcon,
        category: t("commandPalette.category.parcours"),
      },
      {
        id: "stock",
        label: t("commandPalette.nav.stock"),
        sub: t("commandPalette.nav.stockSub"),
        icon: Package02Icon,
        category: t("commandPalette.category.exploitation"),
      },
      {
        id: "finances",
        label: t("commandPalette.nav.finances"),
        sub: t("commandPalette.nav.financesSub"),
        icon: WalletIcon,
        category: t("commandPalette.category.exploitation"),
      },
      {
        id: "equipe",
        label: t("commandPalette.nav.team"),
        sub: t("commandPalette.nav.teamSub"),
        icon: UserGroupIcon,
        category: t("commandPalette.category.exploitation"),
      },
      {
        id: "parametres",
        label: t("commandPalette.nav.settings"),
        sub: t("commandPalette.nav.settingsSub"),
        icon: Settings02Icon,
        category: t("commandPalette.category.configuration"),
      },
    ],
    [t]
  );

  const q = normalizeSearch(query);

  const patientsById = useMemo(() => {
    const map = new Map<string, Patient>();
    for (const p of patients) {
      map.set(p.id, p);
    }
    return map;
  }, [patients]);

  const matchedPatients = useMemo<Patient[]>(() => {
    if (!q) {
      return [];
    }
    return patients
      .filter((p) => {
        return matchesSearch(
          `${p.name} ${p.species} ${p.breed ?? ""}`,
          q
        );
      })
      .slice(0, 5);
  }, [patients, q]);

  const matchedAppointments = useMemo<Appointment[]>(() => {
    if (!q) {
      return [];
    }
    return appointments
      .filter((a) => {
        const patient = patientsById.get(a.patientId);
        return matchesSearch(
          `${a.title} ${a.type} ${a.notes ?? ""} ${patient?.name ?? ""}`,
          q
        );
      })
      .sort(
        (a, b) =>
          Math.abs(new Date(a.startTime).getTime() - Date.now()) -
          Math.abs(new Date(b.startTime).getTime() - Date.now())
      )
      .slice(0, 5);
  }, [appointments, patientsById, q]);

  const handleSelectNav = (action: NavAction) => {
    pushRecent({
      kind: "view",
      id: action.id,
      label: action.label,
      sub: action.sub,
      at: Date.now(),
    });
    onNavigate(action.id);
    onClose();
  };

  const handleSelectPatient = (patient: Patient) => {
    pushRecent({
      kind: "patient",
      id: patient.id,
      label: patient.name,
      sub: `${patient.species}${patient.breed ? ` · ${patient.breed}` : ""}`,
      at: Date.now(),
    });
    onNavigateToPatient(patient.id);
    onClose();
  };

  const handleSelectAppointment = (appt: Appointment) => {
    const patient = patientsById.get(appt.patientId);
    if (patient) {
      pushRecent({
        kind: "patient",
        id: patient.id,
        label: patient.name,
        sub: `${patient.species}${patient.breed ? ` · ${patient.breed}` : ""}`,
        at: Date.now(),
      });
      onNavigateToPatient(patient.id);
    } else {
      onNavigate("agenda");
    }
    onClose();
  };

  const handleSelectRecent = (entry: RecentEntry) => {
    pushRecent({ ...entry, at: Date.now() });
    if (entry.kind === "patient") {
      onNavigateToPatient(entry.id);
    } else {
      onNavigate(entry.id as View);
    }
    onClose();
  };

  const commandItemClassName =
    "!transition-none data-[selected=true]:!bg-muted data-[selected=true]:!text-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-border/80";

  const fireAction = (view: View, event: string) => {
    onNavigate(view);
    onClose();
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(event));
    }, 120);
  };

  const categories: string[] = useMemo(
    () => [
      t("commandPalette.category.pilotage"),
      t("commandPalette.category.parcours"),
      t("commandPalette.category.exploitation"),
      t("commandPalette.category.configuration"),
    ],
    [t]
  );

  return (
    <CommandDialog
      className="!max-w-[720px] rounded-[24px]! border-border/70 bg-popover/96 p-0 shadow-[0_28px_80px_-24px_rgba(15,23,42,0.28)] data-closed:!animate-none data-open:!animate-none dark:shadow-[0_28px_90px_-24px_rgba(0,0,0,0.72)]"
      onOpenChange={(open) => !open && onClose()}
      open={isOpen}
      overlayClassName="data-closed:!animate-none data-open:!animate-none"
    >
      <Command
        className="max-h-[min(720px,calc(100dvh-2rem))] rounded-[24px]! bg-popover text-popover-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        filter={commandFilter}
        label={t("commandPalette.title", {
          defaultValue: "Recherche globale",
        })}
        loop
      >
        <CommandInput
          aria-label={t("commandPalette.placeholder")}
          autoFocus={isOpen}
          data-command-palette-input="true"
          onValueChange={setQuery}
          placeholder={t("commandPalette.placeholder")}
          value={query}
        />
        <CommandList className="!max-h-[min(520px,calc(100dvh-12rem))] px-2 pb-2">
          <CommandEmpty>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/70 text-muted-foreground">
                <HugeiconsIcon
                  className="size-5"
                  icon={FileSearchIcon}
                  strokeWidth={1.7}
                />
              </span>
              <div className="space-y-1">
                <span className="block font-medium text-foreground text-sm">
                  {q && (patientsLoading || appointmentsLoading)
                    ? t("commandPalette.empty.loading", {
                        defaultValue: "Recherche dans vos données…",
                      })
                    : t("commandPalette.empty.title")}
                </span>
                <span className="block max-w-[34ch] text-muted-foreground text-xs">
                  {t("commandPalette.empty.hint")}
                </span>
              </div>
            </div>
          </CommandEmpty>

          {/* Recents (only when no query) */}
          {!q && recents.length > 0 && (
            <CommandGroup heading={t("commandPalette.group.recents")}>
              {recents.map((entry) => {
                const Icon =
                  entry.kind === "patient"
                    ? MedicalFileIcon
                    : (navigationActions.find((action) => action.id === entry.id)
                        ?.icon ?? DashboardSquare01Icon);
                return (
                  <CommandItem
                    key={`${entry.kind}-${entry.id}`}
                    className={commandItemClassName}
                    keywords={[entry.sub ?? ""]}
                    onSelect={() => handleSelectRecent(entry)}
                    value={`recent:${entry.kind}:${entry.id} ${entry.label} ${entry.sub ?? ""}`}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/70 text-muted-foreground">
                      <HugeiconsIcon
                        className="size-4 text-zinc-700 dark:text-zinc-300"
                        icon={Icon}
                        strokeWidth={2}
                      />
                    </div>
                    <div className="ml-2 flex flex-col items-start justify-center gap-0.5">
                      <span className="font-medium text-foreground text-sm leading-none">
                        {entry.label}
                      </span>
                      {entry.sub && (
                      <span className="font-medium text-[11px] text-muted-foreground leading-none">
                          {entry.sub}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Patient results */}
          {matchedPatients.length > 0 && (
            <CommandGroup heading={t("commandPalette.group.patients")}>
              {matchedPatients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  className={commandItemClassName}
                  keywords={[patient.species, patient.breed ?? ""]}
                  onSelect={() => handleSelectPatient(patient)}
                  value={`patient:${patient.id} ${patient.name} ${patient.species} ${patient.breed ?? ""}`}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200/50 bg-gradient-to-b from-emerald-50 to-white shadow-[0_2px_4px_rgba(0,0,0,0.02)] dark:border-emerald-900/30 dark:from-emerald-950/40 dark:to-zinc-900">
                    <HugeiconsIcon
                      className="size-4 text-emerald-700 dark:text-emerald-400"
                      icon={MedicalFileIcon}
                      strokeWidth={1.8}
                    />
                  </div>
                  <div className="ml-2 flex flex-col items-start justify-center gap-0.5">
                    <span className="font-medium text-foreground text-sm leading-none">
                      {patient.name}
                    </span>
                    <span className="font-medium text-[11px] text-muted-foreground leading-none">
                      {patient.species}
                      {patient.breed ? ` · ${patient.breed}` : ""}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Appointment results */}
          {matchedAppointments.length > 0 && (
            <CommandGroup heading={t("commandPalette.group.appointments")}>
              {matchedAppointments.map((appt) => {
                const patient = patientsById.get(appt.patientId);
                return (
                  <CommandItem
                    key={appt.id}
                    className={commandItemClassName}
                    keywords={[
                      appt.type,
                      appt.notes ?? "",
                      patient?.name ?? "",
                    ]}
                    onSelect={() => handleSelectAppointment(appt)}
                    value={`appointment:${appt.id} ${appt.title} ${appt.type} ${patient?.name ?? ""}`}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-sky-200/50 bg-gradient-to-b from-sky-50 to-white shadow-[0_2px_4px_rgba(0,0,0,0.02)] dark:border-sky-900/30 dark:from-sky-950/40 dark:to-zinc-900">
                      <HugeiconsIcon
                        className="size-4 text-sky-700 dark:text-sky-400"
                        icon={Calendar01Icon}
                        strokeWidth={2}
                      />
                    </div>
                    <div className="ml-2 flex flex-col items-start justify-center gap-0.5">
                      <span className="font-medium text-foreground text-sm leading-none">
                        {appt.title}
                      </span>
                      <span className="font-medium text-[11px] text-muted-foreground leading-none">
                        {patient?.name ?? t("commandPalette.unlinkedPatient")}
                        {" · "}
                        {format(new Date(appt.startTime), "PPP HH:mm", {
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Navigation categories */}
          {categories.map((category) => {
            const items = navigationActions.filter(
              (a) => a.category === category
            );
            if (items.length === 0) {
              return null;
            }
            return (
              <CommandGroup heading={category} key={category}>
                {items.map((action) => (
                  <CommandItem
                    key={action.id}
                    className={commandItemClassName}
                    keywords={[action.id, action.category]}
                    onSelect={() => handleSelectNav(action)}
                    value={`navigation:${action.id} ${action.label} ${action.sub}`}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/70 text-muted-foreground">
                      <HugeiconsIcon
                        className="size-4 text-zinc-700 dark:text-zinc-300"
                        icon={action.icon}
                        strokeWidth={2}
                      />
                    </div>
                    <div className="ml-2 flex flex-col items-start justify-center gap-0.5">
                      <span className="font-medium text-foreground text-sm leading-none">
                        {action.label}
                      </span>
                      <span className="font-medium text-[11px] text-muted-foreground leading-none">
                        {action.sub}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}

          {/* Quick actions */}
          <CommandSeparator />
          <CommandGroup heading={t("commandPalette.group.actions")}>
            <CommandItem
              className={commandItemClassName}
              keywords={[t("commandPalette.action.newPatient"), "patients"]}
              onSelect={() => fireAction("patients", "vetera:new-patient")}
              value="action:new-patient"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200/50 bg-emerald-50/80 text-emerald-700 shadow-[0_2px_4px_rgba(0,0,0,0.02)] dark:border-emerald-900/30 dark:bg-emerald-950/40 dark:text-emerald-400">
                <HugeiconsIcon
                  className="size-4"
                  icon={UserAdd01Icon}
                  strokeWidth={2}
                />
              </div>
              <span className="ml-2 font-medium">
                {t("commandPalette.action.newPatient")}
              </span>
              <Kbd className="ml-auto">⌘N</Kbd>
            </CommandItem>
            <CommandItem
              className={commandItemClassName}
              keywords={[t("commandPalette.action.newAppointment"), "agenda"]}
              onSelect={() => fireAction("agenda", "vetera:new-appointment")}
              value="action:new-appointment"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-sky-200/50 bg-sky-50/80 text-sky-700 shadow-[0_2px_4px_rgba(0,0,0,0.02)] dark:border-sky-900/30 dark:bg-sky-950/40 dark:text-sky-400">
                <HugeiconsIcon
                  className="size-4"
                  icon={CalendarAdd01Icon}
                  strokeWidth={2}
                />
              </div>
              <span className="ml-2 font-medium">
                {t("commandPalette.action.newAppointment")}
              </span>
              <Kbd className="ml-auto">⌘R</Kbd>
            </CommandItem>
            <CommandItem
              className={commandItemClassName}
              keywords={[t("commandPalette.action.openConsultation"), "clinique"]}
              onSelect={() =>
                fireAction("clinique", "vetera:open-consultation")
              }
              value="action:open-consultation"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-violet-200/50 bg-violet-50/80 text-violet-700 shadow-[0_2px_4px_rgba(0,0,0,0.02)] dark:border-violet-900/30 dark:bg-violet-950/40 dark:text-violet-400">
                <HugeiconsIcon
                  className="size-4"
                  icon={ClinicIcon}
                  strokeWidth={2}
                />
              </div>
              <span className="ml-2 font-medium">
                {t("commandPalette.action.openConsultation")}
              </span>
            </CommandItem>
            <CommandItem
              className={commandItemClassName}
              keywords={[t("commandPalette.action.newPrescription"), "clinique"]}
              onSelect={() =>
                fireAction("clinique", "vetera:open-prescription")
              }
              value="action:new-prescription"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-fuchsia-200/50 bg-fuchsia-50/80 text-fuchsia-700 shadow-[0_2px_4px_rgba(0,0,0,0.02)] dark:border-fuchsia-900/30 dark:bg-fuchsia-950/40 dark:text-fuchsia-400">
                <HugeiconsIcon
                  className="size-4"
                  icon={PillIcon}
                  strokeWidth={2}
                />
              </div>
              <span className="ml-2 font-medium">
                {t("commandPalette.action.newPrescription")}
              </span>
            </CommandItem>
            <CommandItem
              className={commandItemClassName}
              keywords={[t("commandPalette.action.newHospitalization"), "clinique"]}
              onSelect={() =>
                fireAction("clinique", "vetera:open-hospitalization")
              }
              value="action:new-hospitalization"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-200/50 bg-amber-50/80 text-amber-700 shadow-[0_2px_4px_rgba(0,0,0,0.02)] dark:border-amber-900/30 dark:bg-amber-950/40 dark:text-amber-400">
                <HugeiconsIcon
                  className="size-4"
                  icon={HospitalBed01Icon}
                  strokeWidth={2}
                />
              </div>
              <span className="ml-2 font-medium">
                {t("commandPalette.action.newHospitalization")}
              </span>
            </CommandItem>
            <CommandItem
              className={commandItemClassName}
              keywords={[t("commandPalette.action.newAnesthesia"), "clinique"]}
              onSelect={() => fireAction("clinique", "vetera:open-anesthesia")}
              value="action:new-anesthesia"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-rose-200/50 bg-rose-50/80 text-rose-700 shadow-[0_2px_4px_rgba(0,0,0,0.02)] dark:border-rose-900/30 dark:bg-rose-950/40 dark:text-rose-400">
                <HugeiconsIcon
                  className="size-4"
                  icon={VaccineIcon}
                  strokeWidth={2}
                />
              </div>
              <span className="ml-2 font-medium">
                {t("commandPalette.action.newAnesthesia")}
              </span>
            </CommandItem>
          </CommandGroup>
        </CommandList>

        {/* Footer with keyboard hints */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-border/70 border-t px-4 py-3 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="flex items-center gap-1.5">
              <Kbd className="h-4 px-1 text-[9px]">↑</Kbd>
              <Kbd className="h-4 px-1 text-[9px]">↓</Kbd>
              {t("commandPalette.footer.navigate")}
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd className="h-4 px-1 text-[9px]">↵</Kbd>
              {t("commandPalette.footer.select")}
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <Kbd className="h-4 px-1 text-[9px]">esc</Kbd>
              {t("commandPalette.footer.close")}
            </span>
          </div>
          <span className="hidden font-mono tracking-wide text-muted-foreground/80 sm:inline">
            {t("commandPalette.footer.brand")}
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
