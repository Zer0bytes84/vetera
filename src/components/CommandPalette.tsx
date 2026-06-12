"use client";
/* eslint-disable react-hooks/purity */

import {
  BookOpenTextIcon,
  Calendar01Icon,
  CalendarAdd01Icon,
  ClinicIcon,
  DashboardSquare01Icon,
  HospitalBed01Icon,
  Package02Icon,
  PillIcon,
  Settings02Icon,
  StethoscopeIcon,
  Task01Icon,
  UserGroupIcon,
  VaccineIcon,
  WalletIcon,
} from "@hugeicons/core-free-icons";
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

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onNavigateToPatient,
}: CommandPaletteProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "fr";
  const dateLocale = localeByLanguage[lang] ?? fr;

  const { data: patients } = usePatientsRepository();
  const { data: appointments } = useAppointmentsRepository();

  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      setRecents(loadRecents());
    }
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

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const q = normalize(query.trim());

  const matchedPatients = useMemo<Patient[]>(() => {
    if (!q) {
      return [];
    }
    return patients
      .filter((p) => {
        const haystack = normalize(`${p.name} ${p.species} ${p.breed ?? ""}`);
        return haystack.includes(q);
      })
      .slice(0, 5);
  }, [patients, q]);

  const matchedAppointments = useMemo<Appointment[]>(() => {
    if (!q) {
      return [];
    }
    const now = Date.now();
    return appointments
      .filter((a) => {
        const haystack = normalize(`${a.title} ${a.type} ${a.notes ?? ""}`);
        return haystack.includes(q);
      })
      .filter((a) => {
        const t0 = new Date(a.startTime).getTime();
        return t0 >= now - 24 * 60 * 60 * 1000;
      })
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
      .slice(0, 5);
  }, [appointments, q]);

  const patientsById = useMemo(() => {
    const map = new Map<string, Patient>();
    for (const p of patients) {
      map.set(p.id, p);
    }
    return map;
  }, [patients]);

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
    <CommandDialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
        <CommandInput
          onValueChange={setQuery}
          placeholder={t("commandPalette.placeholder")}
          value={query}
        />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center gap-1.5 py-3">
              <span className="font-medium text-muted-foreground text-sm">
                {t("commandPalette.empty.title")}
              </span>
              <span className="text-muted-foreground/70 text-xs">
                {t("commandPalette.empty.hint")}
              </span>
            </div>
          </CommandEmpty>

          {/* Recents (only when no query) */}
          {!q && recents.length > 0 && (
            <CommandGroup heading={t("commandPalette.group.recents")}>
              {recents.map((entry) => {
                const Icon =
                  entry.kind === "patient" ? StethoscopeIcon : Calendar01Icon;
                return (
                  <CommandItem
                    key={`${entry.kind}-${entry.id}`}
                    onSelect={() => {
                      if (entry.kind === "patient") {
                        onNavigateToPatient(entry.id);
                      } else {
                        onNavigate(entry.id as View);
                      }
                      onClose();
                    }}
                    value={`${entry.label} ${entry.sub ?? ""}`}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-black/5 bg-gradient-to-b from-white to-zinc-50 shadow-[0_2px_4px_rgba(0,0,0,0.02)] dark:border-white/10 dark:from-zinc-800 dark:to-zinc-900">
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
                        <span className="font-medium text-[11px] text-muted-foreground/70 leading-none">
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
                  onSelect={() => handleSelectPatient(patient)}
                  value={`${patient.name} ${patient.species} ${patient.breed ?? ""}`}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200/50 bg-gradient-to-b from-emerald-50 to-white shadow-[0_2px_4px_rgba(0,0,0,0.02)] dark:border-emerald-900/30 dark:from-emerald-950/40 dark:to-zinc-900">
                    <HugeiconsIcon
                      className="size-4 text-emerald-700 dark:text-emerald-400"
                      icon={StethoscopeIcon}
                      strokeWidth={2}
                    />
                  </div>
                  <div className="ml-2 flex flex-col items-start justify-center gap-0.5">
                    <span className="font-medium text-foreground text-sm leading-none">
                      {patient.name}
                    </span>
                    <span className="font-medium text-[11px] text-muted-foreground/70 leading-none">
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
                    onSelect={() => handleSelectAppointment(appt)}
                    value={`${appt.title} ${appt.type} ${patient?.name ?? ""}`}
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
                      <span className="font-medium text-[11px] text-muted-foreground/70 leading-none">
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
                    onSelect={() => handleSelectNav(action)}
                    value={`${action.label} ${action.sub}`}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-black/5 bg-gradient-to-b from-white to-zinc-50 shadow-[0_2px_4px_rgba(0,0,0,0.02)] dark:border-white/10 dark:from-zinc-800 dark:to-zinc-900">
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
                      <span className="font-medium text-[11px] text-muted-foreground/70 leading-none">
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
              onSelect={() => fireAction("patients", "vetera:new-patient")}
              value={`${t("commandPalette.action.newPatient")} patients`}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200/50 bg-emerald-50/80 text-emerald-700 shadow-[0_2px_4px_rgba(0,0,0,0.02)] dark:border-emerald-900/30 dark:bg-emerald-950/40 dark:text-emerald-400">
                <HugeiconsIcon
                  className="size-4"
                  icon={StethoscopeIcon}
                  strokeWidth={2}
                />
              </div>
              <span className="ml-2 font-medium">
                {t("commandPalette.action.newPatient")}
              </span>
              <Kbd className="ml-auto">⌘N</Kbd>
            </CommandItem>
            <CommandItem
              onSelect={() => fireAction("agenda", "vetera:new-appointment")}
              value={`${t("commandPalette.action.newAppointment")} agenda`}
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
              onSelect={() =>
                fireAction("clinique", "vetera:open-consultation")
              }
              value={`${t("commandPalette.action.openConsultation")} clinique`}
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
              onSelect={() =>
                fireAction("clinique", "vetera:open-prescription")
              }
              value={`${t("commandPalette.action.newPrescription")} clinique`}
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
              onSelect={() =>
                fireAction("clinique", "vetera:open-hospitalization")
              }
              value={`${t("commandPalette.action.newHospitalization")} clinique`}
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
              onSelect={() => fireAction("clinique", "vetera:open-anesthesia")}
              value={`${t("commandPalette.action.newAnesthesia")} clinique`}
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
        <div className="flex items-center justify-between border-black/5 border-t px-3 py-2 text-[11px] text-muted-foreground/70 dark:border-white/5">
          <div className="flex items-center gap-3">
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
          <span className="font-mono tracking-wide opacity-60">
            {t("commandPalette.footer.brand")}
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
