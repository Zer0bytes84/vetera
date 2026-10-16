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
  Cancel01Icon,
  SparklesIcon,
} from "@/lib/hugeicons";
import { openAssistant } from "@/modules/consultations/assistant-events";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Locale } from "date-fns";
import { format } from "date-fns";
import { ar, de, enUS, es, fr, pt } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { suggestedPatients } from "@/modules/shell/model/palette-suggestions";
import { Kbd } from "@/components/ui/kbd";
import { Badge } from "@/components/ui/badge";
import {
  useAppointmentsRepository,
  usePatientsRepository,
  useOwnersRepository,
} from "@/data/repositories";
import type { View } from "@/types";
import type { Appointment, Patient } from "@/types/db";
import { parseActionQuery } from "@/modules/shell/model/action-query";
import {
  prepareAppointment,
  prepareInvoice,
  prepareVaccination,
} from "@/modules/shell/model/clinical-actions";
import { useFocus } from "@/contexts/focus-provider";
import { getSpeciesGlyph } from "@/lib/species-icons";
import { getPatientStatusMeta } from "@/config/status-meta";
import {
  searchAllPatientsFastLexical,
  searchAllPatientsClinical,
} from "@/modules/consultations/local-ai/embedding-store";
import type {
  SearchSection,
  SourceType,
} from "@/modules/consultations/local-ai/embedding-index";

const CLINICAL_ALL_SECTIONS: SearchSection[] = [
  "subjective",
  "objective",
  "assessment",
  "plan",
  "document",
  "protocol",
  "patient",
  "consultation",
  "product",
];

const CLINICAL_ALL_SOURCES: SourceType[] = [
  "soap",
  "document",
  "protocol",
  "patient",
  "consultation",
  "product",
];

const SECTION_LABELS: Record<string, string> = {
  subjective: "Motif & antécédents",
  objective: "Examen clinique",
  assessment: "Évaluation",
  plan: "Plan de soins",
  document: "Document clinique",
  protocol: "Protocole",
  patient: "Fiche Patient",
  consultation: "Consultation",
  product: "Pharmacie / Stock",
};

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
        (e.kind === "patient" || e.kind === "view"),
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
  keywords: string[];
  label: string;
  sub: string;
}

export const normalizeSearch = (value: string): string =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/**
 * High-precision French-aware and accent-insensitive command scoring.
 * Strips technical item prefixes (e.g. "patient:123 ", "navigation:agenda ")
 * so exact and prefix matches rank at the top with natural relevance.
 */
export const scoreCommandMatch = (
  value: string,
  search: string,
  keywords?: string[],
): number => {
  const normalizedSearch = normalizeSearch(search);
  if (!normalizedSearch) {
    return 1;
  }

  // Clinical & semantic results are pre-verified by the veterinary search engine
  // (covering morphology, DCI brand mappings, acronyms and vector similarity).
  // Never hide them with naive substring filtering.
  if (value.startsWith("semantic:")) {
    return 1;
  }

  const cleanedValue = value.replace(/^[a-z]+:[^\s]+\s*/i, "").trim();
  const normalizedLabel = normalizeSearch(cleanedValue);
  const haystack = normalizeSearch(
    `${cleanedValue} ${(keywords ?? []).join(" ")}`,
  );

  // Exact match on the clean item label
  if (normalizedLabel === normalizedSearch) {
    return 1;
  }

  // Label starts with the query
  if (normalizedLabel.startsWith(normalizedSearch)) {
    return 0.95;
  }

  // Any word in the label starts with the query
  const labelWords = normalizedLabel.split(/\s+/).filter(Boolean);
  if (labelWords.some((word) => word.startsWith(normalizedSearch))) {
    return 0.9;
  }

  // Any keyword starts with the query
  if (
    (keywords ?? []).some((kw) =>
      normalizeSearch(kw).startsWith(normalizedSearch),
    )
  ) {
    return 0.85;
  }

  // Label contains the query
  if (normalizedLabel.includes(normalizedSearch)) {
    return 0.8;
  }

  // Full haystack contains the query
  if (haystack.includes(normalizedSearch)) {
    return 0.75;
  }

  // Multi-word token match across the full haystack
  const tokens = normalizedSearch.split(/\s+/).filter(Boolean);
  const matchedTokens = tokens.filter((token) => haystack.includes(token));
  return matchedTokens.length === tokens.length && tokens.length > 0 ? 0.65 : 0;
};

export const matchesSearch = (value: string, search: string): boolean => {
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
  const { requestFocus } = useFocus();
  const { data: owners } = useOwnersRepository();

  const { data: patients, loading: patientsLoading } = usePatientsRepository();
  const { data: appointments, loading: appointmentsLoading } =
    useAppointmentsRepository();

  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<
    "all" | "patients" | "semantic" | "navigation" | "actions"
  >("all");
  const [semanticResults, setSemanticResults] = useState<
    Awaited<ReturnType<typeof searchAllPatientsClinical>>
  >([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const semanticAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      setGroup("all");
      setRecents(loadRecents());
      setQuery("");
      setSemanticResults([]);
      setSemanticLoading(false);

      const frame = window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLInputElement>("[data-command-palette-input]")
          ?.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }
    setQuery("");
    setSemanticResults([]);
    setSemanticLoading(false);
    semanticAbortRef.current?.abort();
  }, [isOpen]);

  useEffect(() => {
    semanticAbortRef.current?.abort();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSemanticResults([]);
      setSemanticLoading(false);
      return;
    }

    const controller = new AbortController();
    semanticAbortRef.current = controller;

    // Instant fast path (~1ms): French veterinary morphology, brand/DCI & acronyms from SQLite
    void (async () => {
      try {
        const instantMatches = await searchAllPatientsFastLexical(
          { sourceTypes: CLINICAL_ALL_SOURCES, sections: CLINICAL_ALL_SECTIONS },
          trimmed,
          controller.signal,
        );
        if (!controller.signal.aborted && instantMatches.length > 0) {
          setSemanticResults((prev) => (prev.length === 0 ? instantMatches : prev));
        }
      } catch {
        // fast lexical lookup error ignored
      }
    })();

    // Deep semantic path: debounced vector model inference
    const timer = setTimeout(() => {
      setSemanticLoading(true);
      void (async () => {
        try {
          const found = await searchAllPatientsClinical(
            { sourceTypes: CLINICAL_ALL_SOURCES, sections: CLINICAL_ALL_SECTIONS },
            trimmed,
            controller.signal,
          );
          if (!controller.signal.aborted) {
            setSemanticResults(found);
            setSemanticLoading(false);
          }
        } catch {
          if (!controller.signal.aborted) {
            setSemanticLoading(false);
          }
        }
      })();
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const navigationActions: NavAction[] = useMemo(
    () => [
      {
        id: "dashboard",
        label: t("commandPalette.nav.dashboard", { defaultValue: "Tableau de bord" }),
        sub: t("commandPalette.nav.dashboardSub", { defaultValue: "Vue d'ensemble et pilotage" }),
        icon: DashboardSquare01Icon,
        category: t("commandPalette.category.pilotage", { defaultValue: "Pilotage" }),
        keywords: [
          "dashboard",
          "tableau de bord",
          "accueil",
          "stats",
          "statistiques",
          "kpi",
          "pilotage",
          "vue d'ensemble",
        ],
      },
      {
        id: "patients",
        label: t("commandPalette.nav.patients", { defaultValue: "Patients" }),
        sub: t("commandPalette.nav.patientsSub", { defaultValue: "Dossiers médicaux et antécédents" }),
        icon: StethoscopeIcon,
        category: t("commandPalette.category.parcours", { defaultValue: "Parcours patient" }),
        keywords: [
          "patients",
          "patient",
          "dossiers",
          "animaux",
          "fiches",
          "chiens",
          "chats",
          "carnet",
        ],
      },
      {
        id: "agenda",
        label: t("commandPalette.nav.agenda", { defaultValue: "Agenda" }),
        sub: t("commandPalette.nav.agendaSub", { defaultValue: "Planning et rendez-vous" }),
        icon: Calendar01Icon,
        category: t("commandPalette.category.parcours", { defaultValue: "Parcours patient" }),
        keywords: [
          "agenda",
          "planning",
          "rdv",
          "rendez-vous",
          "calendrier",
          "consultations planifiees",
        ],
      },
      {
        id: "notes",
        label: "Documents",
        sub: t("commandPalette.nav.notesSub", { defaultValue: "Notes, ordonnances et comptes-rendus" }),
        icon: BookOpenTextIcon,
        category: t("commandPalette.category.parcours", { defaultValue: "Parcours patient" }),
        keywords: [
          "documents",
          "document",
          "notes",
          "comptes rendus",
          "ordonnances",
          "memos",
          "rapports",
          "pdf",
          "archives",
        ],
      },
      {
        id: "clinique",
        label: t("commandPalette.nav.clinique", { defaultValue: "Consultations" }),
        sub: t("commandPalette.nav.cliniqueSub", { defaultValue: "Suivi clinique et soins du jour" }),
        icon: ClinicIcon,
        category: t("commandPalette.category.parcours", { defaultValue: "Parcours patient" }),
        keywords: [
          "clinique",
          "consultations",
          "consultation",
          "examen",
          "soins",
          "soap",
          "suivi clinique",
          "visites",
        ],
      },
      {
        id: "taches",
        label: t("commandPalette.nav.tasks", { defaultValue: "Tâches" }),
        sub: t("commandPalette.nav.tasksSub", { defaultValue: "To-do list et rappels" }),
        icon: Task01Icon,
        category: t("commandPalette.category.pilotage", { defaultValue: "Pilotage" }),
        keywords: [
          "taches",
          "tache",
          "todo",
          "rappels",
          "a faire",
          "priorites",
          "checklist",
        ],
      },
      {
        id: "stock",
        label: t("commandPalette.nav.stock", { defaultValue: "Stock & Pharma" }),
        sub: t("commandPalette.nav.stockSub", { defaultValue: "Inventaire et délivrance médicaments" }),
        icon: Package02Icon,
        category: t("commandPalette.category.exploitation", { defaultValue: "Exploitation" }),
        keywords: [
          "stock",
          "pharmacie",
          "medicaments",
          "produits",
          "inventaire",
          "commandes",
          "reapprovisionnement",
        ],
      },
      {
        id: "finances",
        label: t("commandPalette.nav.finances", { defaultValue: "Finances" }),
        sub: t("commandPalette.nav.financesSub", { defaultValue: "Facturation, devis et recettes" }),
        icon: WalletIcon,
        category: t("commandPalette.category.exploitation", { defaultValue: "Exploitation" }),
        keywords: [
          "finances",
          "factures",
          "facturation",
          "recettes",
          "paiements",
          "devis",
          "comptabilite",
          "chiffre d'affaires",
        ],
      },
      {
        id: "equipe",
        label: t("commandPalette.nav.team", { defaultValue: "Équipe" }),
        sub: t("commandPalette.nav.teamSub", { defaultValue: "Collaborateurs et plannings" }),
        icon: UserGroupIcon,
        category: t("commandPalette.category.exploitation", { defaultValue: "Exploitation" }),
        keywords: [
          "equipe",
          "personnel",
          "collaborateurs",
          "veterinaires",
          "asv",
          "membres",
        ],
      },
      {
        id: "parametres",
        label: t("commandPalette.nav.settings", { defaultValue: "Paramètres" }),
        sub: t("commandPalette.nav.settingsSub", { defaultValue: "Configuration et préférences" }),
        icon: Settings02Icon,
        category: t("commandPalette.category.configuration", { defaultValue: "Configuration" }),
        keywords: [
          "parametres",
          "settings",
          "configuration",
          "preferences",
          "options",
          "profil",
          "sauvegarde",
        ],
      },
    ],
    [t],
  );

  const q = normalizeSearch(query);
  const intent = parseActionQuery(query);

  const patientsById = useMemo(() => {
    const map = new Map<string, Patient>();
    for (const p of patients) {
      map.set(p.id, p);
    }
    return map;
  }, [patients]);

  const ownerById = useMemo(() => {
    const map = new Map<string, string>();
    for (const owner of owners) {
      map.set(owner.id, `${owner.firstName} ${owner.lastName}`.trim());
    }
    return map;
  }, [owners]);

  const actionPatients = useMemo(() => {
    if (!intent || intent.kind === "invoice") return [];
    return patients
      .filter((patient) =>
        matchesSearch(`${patient.name} ${patient.species}`, intent.entity),
      )
      .slice(0, 5);
  }, [intent, patients]);

  const actionOwners = useMemo(() => {
    if (intent?.kind !== "invoice") return [];
    const entityClean = intent.entity.replace(
      /^(mme|m|mr|madame|monsieur)\.?\s+/i,
      "",
    );
    return owners
      .filter((owner) =>
        matchesSearch(`${owner.firstName} ${owner.lastName}`, entityClean),
      )
      .slice(0, 5);
  }, [intent, owners]);

  const suggestions = useMemo(() => {
    return suggestedPatients(patients, appointments, Date.now()).filter(
      (patient) =>
        group !== "all" ||
        !recents.some(
          (entry) => entry.kind === "patient" && entry.id === patient.id,
        ),
    );
  }, [patients, appointments, group, recents]);

  const showPatients = group === "all" || group === "patients";
  const showSemantic = group === "all" || group === "semantic";
  const showNavigation = group === "all" || group === "navigation";
  const showActions = group === "all" || group === "actions";

  // Patient search: match on name, owner, species, breed, chip/tattoo
  const matchedPatients = useMemo<Patient[]>(() => {
    if (!q) {
      return [];
    }
    return patients
      .filter((p) => {
        const ownerName = ownerById.get(p.ownerId) ?? "";
        const chip = p.chipNumber ?? "";
        const tattoo = p.tattooNumber ?? "";
        return matchesSearch(
          `${p.name} ${p.species} ${p.breed ?? ""} ${ownerName} ${chip} ${tattoo}`,
          q,
        );
      })
      .sort((a, b) => {
        // Prioritize startsWith on name
        const aName = normalizeSearch(a.name);
        const bName = normalizeSearch(b.name);
        const aStarts = aName.startsWith(q);
        const bStarts = bName.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // Secondary: recency of last visit
        const aVisit = a.lastVisit ? Date.parse(a.lastVisit) : 0;
        const bVisit = b.lastVisit ? Date.parse(b.lastVisit) : 0;
        return bVisit - aVisit;
      })
      .slice(0, 8);
  }, [patients, ownerById, q]);

  const matchedAppointments = useMemo<Appointment[]>(() => {
    if (!q) {
      return [];
    }
    return appointments
      .filter((a) => {
        const patient = patientsById.get(a.patientId);
        return matchesSearch(
          `${a.title} ${a.type} ${a.notes ?? ""} ${patient?.name ?? ""}`,
          q,
        );
      })
      .sort(
        (a, b) =>
          Math.abs(new Date(a.startTime).getTime() - Date.now()) -
          Math.abs(new Date(b.startTime).getTime() - Date.now()),
      )
      .slice(0, 5);
  }, [appointments, patientsById, q]);

  const handleSelectNav = useCallback(
    (action: NavAction) => {
      pushRecent({
        kind: "view",
        id: action.id,
        label: action.label,
        sub: action.sub,
        at: Date.now(),
      });
      onNavigate(action.id);
      onClose();
    },
    [onNavigate, onClose],
  );

  const handleSelectPatient = useCallback(
    (patient: Patient) => {
      pushRecent({
        kind: "patient",
        id: patient.id,
        label: patient.name,
        sub: `${patient.species}${patient.breed ? ` · ${patient.breed}` : ""}`,
        at: Date.now(),
      });
      onNavigateToPatient(patient.id);
      onClose();
    },
    [onNavigateToPatient, onClose],
  );

  const handleSelectAppointment = useCallback(
    (appt: Appointment) => {
      const patient = patientsById.get(appt.patientId);
      if (patient) {
        pushRecent({
          kind: "patient",
          id: patient.id,
          label: patient.name,
          sub: `${patient.species}${patient.breed ? ` · ${patient.breed}` : ""}`,
          at: Date.now(),
        });
      }
      requestFocus("appointment", appt.id);
      onNavigate("agenda");
      onClose();
    },
    [patientsById, requestFocus, onNavigate, onClose],
  );

  const handleSelectRecent = useCallback(
    (entry: RecentEntry) => {
      pushRecent({ ...entry, at: Date.now() });
      if (entry.kind === "patient") {
        onNavigateToPatient(entry.id);
      } else {
        onNavigate(entry.id as View);
      }
      onClose();
    },
    [onNavigateToPatient, onNavigate, onClose],
  );

  const fireAction = useCallback(
    (view: View, event: string, detail?: { patientId: string }) => {
      onNavigate(view);
      onClose();
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent(event, { detail }));
      }, 120);
    },
    [onNavigate, onClose],
  );

  const commandItemClassName =
    "group flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer text-sm outline-none transition-colors duration-100 data-[selected=true]:bg-black/[0.05] dark:data-[selected=true]:bg-white/[0.08] data-[selected=true]:text-foreground";

  return (
    <CommandDialog
      title="Palette de commandes"
      description="Recherche rapide, navigation et dossiers patients."
      className="sm:!top-[15%] sm:!-translate-y-0 !max-w-[680px] rounded-3xl! border-border/80 bg-popover/95 p-0 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.22)] backdrop-blur-2xl dark:bg-zinc-900/95 dark:border-white/10 dark:shadow-[0_28px_80px_-24px_rgba(0,0,0,0.8)]"
      onOpenChange={(open) => !open && onClose()}
      open={isOpen}
      overlayClassName="data-closed:!animate-none data-open:!animate-none bg-black/40 backdrop-blur-sm dark:bg-black/60"
    >
      <Command
        className="max-h-[min(720px,calc(100dvh-4rem))] rounded-3xl! bg-transparent text-popover-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-muted-foreground/70 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-1 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5"
        filter={scoreCommandMatch}
        label={t("commandPalette.title", {
          defaultValue: "Recherche globale",
        })}
        loop
      >
        {/* Barre de recherche intégrée */}
        <div className="border-b border-border/60 pb-2">
          <CommandInput
            aria-label={t("commandPalette.placeholder", {
              defaultValue: "Rechercher ou exécuter une commande…",
            })}
            autoFocus={isOpen}
            data-command-palette-input="true"
            onValueChange={setQuery}
            placeholder="Un patient, son propriétaire, une page ou une action…"
            value={query}
            endAddon={
              query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Effacer la recherche"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <Kbd className="h-5 px-1.5 text-[10px]">esc</Kbd>
                </div>
              )
            }
          />

          {/* Onglets de filtrage */}
          <div className="px-3 pt-1">
            <Tabs
              value={group}
              onValueChange={(value) =>
                setGroup(
                  value as "all" | "patients" | "semantic" | "navigation" | "actions",
                )
              }
              className="w-full"
            >
              <TabsList
                variant="line"
                aria-label="Catégorie de commandes"
                className="h-8 gap-4 border-none bg-transparent p-0"
              >
                <TabsTrigger
                  value="all"
                  className="h-7 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors data-[state=active]:bg-muted data-[state=active]:text-foreground"
                >
                  Tout
                </TabsTrigger>
                <TabsTrigger
                  value="patients"
                  className="h-7 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors data-[state=active]:bg-muted data-[state=active]:text-foreground"
                >
                  Patients
                  {matchedPatients.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                      {matchedPatients.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="semantic"
                  className="h-7 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors data-[state=active]:bg-muted data-[state=active]:text-foreground"
                >
                  Cas similaires
                  {semanticResults.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                      {semanticResults.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="navigation"
                  className="h-7 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors data-[state=active]:bg-muted data-[state=active]:text-foreground"
                >
                  Pages
                </TabsTrigger>
                <TabsTrigger
                  value="actions"
                  className="h-7 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors data-[state=active]:bg-muted data-[state=active]:text-foreground"
                >
                  Actions
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Liste des résultats */}
        <CommandList className="!max-h-[min(480px,calc(100dvh-14rem))] px-2 py-2">
          <CommandEmpty>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-border/70 bg-muted/60 text-muted-foreground shadow-2xs">
                <HugeiconsIcon
                  className="size-5"
                  icon={FileSearchIcon}
                  strokeWidth={1.5}
                />
              </span>
              <div className="space-y-1">
                <span className="block font-medium text-foreground text-sm">
                  {q && (patientsLoading || appointmentsLoading)
                    ? t("commandPalette.empty.loading", {
                        defaultValue: "Recherche dans vos données…",
                      })
                    : q
                      ? `Aucun résultat pour « ${query} »`
                      : t("commandPalette.empty.title", {
                          defaultValue: "Aucun résultat trouvé",
                        })}
                </span>
                <span className="block max-w-[38ch] text-muted-foreground text-xs leading-relaxed">
                  {q
                    ? "Vérifiez l’orthographe ou cherchez un nom de patient, une page ou une action."
                    : t("commandPalette.empty.hint", {
                        defaultValue: "Tapez une commande ou cherchez un patient.",
                      })}
                </span>
              </div>
              {q && (
                <button
                  type="button"
                  onClick={() => fireAction("patients", "vetera:new-patient")}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted transition-colors"
                >
                  <HugeiconsIcon icon={UserAdd01Icon} className="size-3.5" />
                  Créer un patient nommé « {query} »
                </button>
              )}
            </div>
          </CommandEmpty>

          {/* Actions déduites de l'intention utilisateur */}
          {showActions && intent && (
            <CommandGroup heading="Actions contextuelles">
              {actionPatients.map((patient) => (
                <CommandItem
                  key={`action:${patient.id}`}
                  className={commandItemClassName}
                  value={`${query} ${patient.name}`}
                  onSelect={() => {
                    if (intent.kind === "vaccination") {
                      prepareVaccination(patient.id);
                      window.location.hash = `#/patient/${encodeURIComponent(patient.id)}`;
                    } else {
                      prepareAppointment(patient.id);
                      fireAction("agenda", "vetera:new-appointment", {
                        patientId: patient.id,
                      });
                    }
                    onClose();
                  }}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <HugeiconsIcon
                      icon={
                        intent.kind === "vaccination"
                          ? VaccineIcon
                          : StethoscopeIcon
                      }
                      strokeWidth={1.5}
                      size={18}
                    />
                  </div>
                  <div className="ml-1 min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-foreground">
                      {intent.kind === "vaccination"
                        ? "Enregistrer un vaccin"
                        : "Nouvelle consultation"}{" "}
                      · {patient.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {patient.species}
                      {patient.breed ? ` · ${patient.breed}` : ""} · Dossier existant
                    </p>
                  </div>
                  <Kbd className="ml-auto text-[10px]">↵ Exécuter</Kbd>
                </CommandItem>
              ))}

              {actionOwners.map((owner) => (
                <CommandItem
                  key={`invoice:${owner.id}`}
                  className={commandItemClassName}
                  value={`${query} ${owner.firstName} ${owner.lastName}`}
                  onSelect={() => {
                    prepareInvoice(owner.id);
                    fireAction("finances", "vetera:new-invoice");
                  }}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <HugeiconsIcon
                      icon={WalletIcon}
                      strokeWidth={1.5}
                      size={18}
                    />
                  </div>
                  <div className="ml-1 min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-foreground">
                      Nouvelle facture · {owner.firstName} {owner.lastName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      Propriétaire existant · Établir un devis ou une facture
                    </p>
                  </div>
                  <Kbd className="ml-auto text-[10px]">↵ Facturer</Kbd>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Récents (quand aucune requête n'est saisie) */}
          {group === "all" && !q && recents.length > 0 && (
            <CommandGroup heading={t("commandPalette.group.recents", { defaultValue: "Récents" })}>
              {recents
                .filter(
                  (entry) =>
                    entry.kind !== "patient" || patientsById.has(entry.id),
                )
                .map((entry) => {
                  const Icon =
                    entry.kind === "patient"
                      ? MedicalFileIcon
                      : (navigationActions.find(
                          (action) => action.id === entry.id,
                        )?.icon ?? DashboardSquare01Icon);
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
                          className="size-4"
                          icon={Icon}
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="ml-1 min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                        <span className="font-medium text-foreground text-sm leading-none">
                          {entry.label}
                        </span>
                        {entry.sub && (
                          <span className="font-normal text-[11px] text-muted-foreground leading-none">
                            {entry.sub}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60">
                        Récemment ouvert
                      </span>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          )}

          {/* Suggestions intelligentes (quand pas de recherche) */}
          {showPatients && !q && suggestions.length > 0 && (
            <CommandGroup heading="À retrouver rapidement">
              {suggestions.map((patient) => {
                const glyph = getSpeciesGlyph(patient.species);
                const statusMeta = getPatientStatusMeta(patient.status);
                const ownerName = ownerById.get(patient.ownerId);

                return (
                  <CommandItem
                    key={`suggestion:${patient.id}`}
                    value={`suggestion:${patient.id} ${patient.name}`}
                    className={commandItemClassName}
                    onSelect={() => handleSelectPatient(patient)}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground">
                      <HugeiconsIcon icon={glyph} size={18} strokeWidth={1.5} />
                    </div>
                    <div className="ml-1 min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">
                          {patient.name}
                        </span>
                        {patient.status && (
                          <Badge
                            variant="outline"
                            className={`h-4 px-1 text-[9px] font-normal ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </Badge>
                        )}
                      </div>
                      <span className="truncate text-xs text-muted-foreground">
                        {patient.species}
                        {patient.breed ? ` · ${patient.breed}` : ""}
                        {ownerName ? ` · ${ownerName}` : ""}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60">
                      Ouvrir ↵
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Résultats de recherche Patients */}
          {showPatients && matchedPatients.length > 0 && (
            <CommandGroup heading={t("commandPalette.group.patients", { defaultValue: "Dossiers Patients" })}>
              {matchedPatients.map((patient) => {
                const glyph = getSpeciesGlyph(patient.species);
                const statusMeta = getPatientStatusMeta(patient.status);
                const ownerName = ownerById.get(patient.ownerId);

                return (
                  <CommandItem
                    key={patient.id}
                    className={commandItemClassName}
                    keywords={[
                      patient.species,
                      patient.breed ?? "",
                      ownerName ?? "",
                      patient.chipNumber ?? "",
                      patient.tattooNumber ?? "",
                    ]}
                    onSelect={() => handleSelectPatient(patient)}
                    value={`patient:${patient.id} ${patient.name} ${patient.species} ${patient.breed ?? ""}`}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-muted/60 text-foreground">
                      <HugeiconsIcon
                        className="size-4.5"
                        icon={glyph}
                        strokeWidth={1.5}
                      />
                    </div>
                    <div className="ml-1 min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm leading-tight">
                          {patient.name}
                        </span>
                        {patient.status && (
                          <Badge
                            variant="outline"
                            className={`h-4 px-1.5 text-[9px] font-normal ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                        <span>{patient.species}</span>
                        {patient.breed && <span>· {patient.breed}</span>}
                        {ownerName && (
                          <span className="truncate">· Propriétaire : {ownerName}</span>
                        )}
                      </div>
                    </div>
                    <Kbd className="ml-auto text-[10px]">↵ Ouvrir</Kbd>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Onglet Cas similaires sans requête : suggestions cliniques */}
          {group === "semantic" && !query.trim() && (
            <CommandGroup heading="Suggestions cliniques · Recherches fréquentes">
              {[
                {
                  id: "sug-vaccin",
                  label: "Vaccination & Rappels",
                  sub: "Rechercher les protocoles, échéances et vaccins",
                  query: "vaccin",
                  badge: "Protocole",
                },
                {
                  id: "sug-bacterie",
                  label: "Infections bactériennes & Germes",
                  sub: "Rechercher les causes bactériennes et cultures",
                  query: "bactérie",
                  badge: "Diagnostic",
                },
                {
                  id: "sug-antibio",
                  label: "Traitements antibiotiques",
                  sub: "Rechercher amoxicilline, céfovécine, Synulox, Convenia",
                  query: "antibiotique",
                  badge: "Thérapeutique",
                },
                {
                  id: "sug-metacam",
                  label: "AINS & Méloxicam (Metacam)",
                  sub: "Anti-inflammatoires, gestion de la douleur et arthrose",
                  query: "Metacam",
                  badge: "Molécule",
                },
                {
                  id: "sug-irc",
                  label: "Insuffisance rénale chronique (IRC)",
                  sub: "MRC, néphropathies, créatinine et suivi rénal",
                  query: "IRC",
                  badge: "Pathologie",
                },
              ].map((sug) => (
                <CommandItem
                  key={sug.id}
                  className={commandItemClassName}
                  onSelect={() => setQuery(sug.query)}
                  onClick={() => setQuery(sug.query)}
                  value={`semantic:sug:${sug.id} ${sug.label} ${sug.query}`}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/15 dark:text-amber-300">
                    <HugeiconsIcon
                      icon={StethoscopeIcon}
                      className="size-4"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="ml-1 min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">
                        {sug.label}
                      </span>
                      <Badge
                        variant="outline"
                        className="h-4 px-1.5 text-[9px] font-medium border-amber-500/30 text-amber-800 dark:text-amber-300 bg-amber-500/5"
                      >
                        {sug.badge}
                      </Badge>
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      {sug.sub}
                    </span>
                  </div>
                  <Kbd className="text-[10px]">Rechercher ↵</Kbd>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Résultats Sémantiques : Cas similaires */}
          {showSemantic &&
            (semanticResults.length > 0 ||
              (semanticLoading && group === "semantic")) && (
              <CommandGroup heading="Cas similaires · Recherche clinique">
                {semanticLoading && semanticResults.length === 0 ? (
                  <CommandItem
                    disabled
                    value="semantic:loading-indicator"
                    className="flex items-center gap-2.5 px-3 py-3 text-xs text-muted-foreground pointer-events-none cursor-default"
                  >
                    <div className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Recherche clinique dans l’ensemble des dossiers…</span>
                  </CommandItem>
                ) : (
                  semanticResults.map((result) => {
                    const sectionLabel =
                      SECTION_LABELS[result.section] ?? result.section;
                    const patientName =
                      result.patientName ||
                      patientsById.get(result.patientId)?.name ||
                      "Dossier patient";

                    const handleSelectCase = () => {
                      if (result.sourceType === "product") {
                        pushRecent({
                          kind: "view",
                          id: "stock",
                          label: result.text.split("—")[0].trim() || "Pharmacie & Stock",
                          sub: "Stock & Pharmacie",
                          at: Date.now(),
                        });
                        window.location.hash = "#/stock";
                        onNavigate("stock");
                        onClose();
                        return;
                      }

                      const patientId = result.patientId;
                      if (patientId) {
                        pushRecent({
                          kind: "patient",
                          id: patientId,
                          label: patientName,
                          sub: `Cas similaire · ${sectionLabel}`,
                          at: Date.now(),
                        });
                        window.location.hash = `#/patient/${encodeURIComponent(result.patientId)}`;
                        onNavigateToPatient(result.patientId);
                      }
                      onClose();
                    };

                    const isProduct = result.sourceType === "product";
                    const isConsult = result.sourceType === "consultation";
                    const isPatient = result.sourceType === "patient";

                    const itemIcon = isProduct
                      ? PillIcon
                      : isConsult
                        ? Calendar01Icon
                        : isPatient
                          ? MedicalFileIcon
                          : StethoscopeIcon;

                    const iconColor = isProduct
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/15 dark:text-emerald-300"
                      : isPatient
                        ? "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/15 dark:text-blue-300"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/15 dark:text-amber-300";

                    return (
                      <CommandItem
                        key={`semantic:${result.sourceType}:${result.patientId}:${result.sourceId}:${result.section}:${result.chunkIndex}`}
                        className={commandItemClassName}
                        keywords={[query, result.section, sectionLabel, result.text]}
                        onSelect={handleSelectCase}
                        onClick={handleSelectCase}
                        value={`semantic:${result.sourceType}:${result.patientId}:${result.sourceId}:${result.section}:${result.chunkIndex} ${patientName} ${result.text}`}
                      >
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-xl border ${iconColor}`}
                        >
                          <HugeiconsIcon
                            icon={itemIcon}
                            className="size-4"
                            strokeWidth={1.5}
                          />
                        </div>
                        <div className="ml-1 min-w-0 flex-1 flex flex-col justify-center gap-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-foreground text-sm">
                              {patientName}
                            </span>
                            <Badge
                              variant="outline"
                              className={`h-4 px-1.5 text-[9px] font-medium ${
                                isProduct
                                  ? "border-emerald-500/30 text-emerald-800 dark:text-emerald-300 bg-emerald-500/5"
                                  : isPatient
                                    ? "border-blue-500/30 text-blue-800 dark:text-blue-300 bg-blue-500/5"
                                    : "border-amber-500/30 text-amber-800 dark:text-amber-300 bg-amber-500/5"
                              }`}
                            >
                              {sectionLabel}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="h-4 px-1.5 text-[9px] font-normal text-muted-foreground"
                            >
                              {result.match === "text"
                                ? "Correspondance clinique"
                                : `Similarité ${Math.round(result.score * 100)}%`}
                            </Badge>
                          </div>
                          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/90 font-mono/sans">
                            « {result.text} »
                          </p>
                        </div>
                        <div className="ml-2 flex flex-col items-end justify-center shrink-0">
                          <Kbd className="text-[10px]">
                            {isProduct ? "↵ Voir en stock" : "↵ Ouvrir le dossier"}
                          </Kbd>
                        </div>
                      </CommandItem>
                    );
                  })
                )}
              </CommandGroup>
            )}

          {/* Résultats Rendez-vous */}
          {showNavigation && matchedAppointments.length > 0 && (
            <CommandGroup heading={t("commandPalette.group.appointments", { defaultValue: "Rendez-vous" })}>
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
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground">
                      <HugeiconsIcon
                        className="size-4"
                        icon={Calendar01Icon}
                        strokeWidth={1.5}
                      />
                    </div>
                    <div className="ml-1 min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                      <span className="font-semibold text-foreground text-sm leading-none">
                        {appt.title}
                      </span>
                      <span className="font-normal text-[11px] text-muted-foreground leading-none">
                        {patient?.name ?? t("commandPalette.unlinkedPatient", { defaultValue: "Patient" })}
                        {" · "}
                        {format(new Date(appt.startTime), "PPP HH:mm", {
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60">
                      Agenda ↵
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Pages et Navigation */}
          {showNavigation && (
            <CommandGroup heading="Pages & Navigation">
              {navigationActions.map((action) => (
                <CommandItem
                  key={action.id}
                  className={commandItemClassName}
                  keywords={action.keywords}
                  onSelect={() => handleSelectNav(action)}
                  value={`navigation:${action.id} ${action.label} ${action.sub}`}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/70 text-muted-foreground">
                    <HugeiconsIcon
                      className="size-4"
                      icon={action.icon}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="ml-1 min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                    <span className="font-medium text-foreground text-sm leading-none">
                      {action.label}
                    </span>
                    <span className="font-normal text-[11px] text-muted-foreground leading-none">
                      {action.sub}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/60">
                    Naviguer ↵
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Actions rapides */}
          {showActions && (
            <>
              <CommandSeparator className="my-2" />
              <CommandGroup heading={t("commandPalette.group.actions", { defaultValue: "Actions rapides" })}>
                <CommandItem
                  className={commandItemClassName}
                  keywords={[
                    "assistant",
                    "ia",
                    "intelligence artificielle",
                    "dictee",
                    "soap",
                    "cas similaires",
                    "vocal",
                  ]}
                  onSelect={() => {
                    onClose();
                    openAssistant();
                  }}
                  value="action:open-assistant Ouvrir l'Assistant IA Dictée SOAP et cas similaires"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <HugeiconsIcon
                      className="size-4"
                      icon={SparklesIcon}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="ml-1 flex flex-col">
                    <span className="font-medium text-foreground text-sm">
                      Ouvrir l'Assistant IA
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Dictée guidée SOAP & recherche clinique
                    </span>
                  </div>
                  <Kbd className="ml-auto">⌘J</Kbd>
                </CommandItem>

                <CommandItem
                  className={commandItemClassName}
                  keywords={[
                    t("commandPalette.action.newPatient", { defaultValue: "Nouveau patient" }),
                    "patient",
                    "ajouter",
                    "creer",
                    "fiche",
                  ]}
                  onSelect={() => fireAction("patients", "vetera:new-patient")}
                  value="action:new-patient Nouveau patient Créer un dossier animal"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <HugeiconsIcon
                      className="size-4"
                      icon={UserAdd01Icon}
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="ml-1 font-medium text-foreground text-sm">
                    {t("commandPalette.action.newPatient", { defaultValue: "Nouveau patient" })}
                  </span>
                  <Kbd className="ml-auto">⌘N</Kbd>
                </CommandItem>

                <CommandItem
                  className={commandItemClassName}
                  keywords={[
                    t("commandPalette.action.newAppointment", { defaultValue: "Nouveau rendez-vous" }),
                    "agenda",
                    "rdv",
                    "programmer",
                  ]}
                  onSelect={() =>
                    fireAction("agenda", "vetera:new-appointment")
                  }
                  value="action:new-appointment Nouveau rendez-vous Programmer une visite"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <HugeiconsIcon
                      className="size-4"
                      icon={CalendarAdd01Icon}
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="ml-1 font-medium text-foreground text-sm">
                    {t("commandPalette.action.newAppointment", { defaultValue: "Nouveau rendez-vous" })}
                  </span>
                  <Kbd className="ml-auto">⌘R</Kbd>
                </CommandItem>

                <CommandItem
                  className={commandItemClassName}
                  keywords={[
                    t("commandPalette.action.openConsultation", { defaultValue: "Ouvrir une consultation" }),
                    "clinique",
                    "soins",
                    "soap",
                  ]}
                  onSelect={() =>
                    fireAction("clinique", "vetera:open-consultation")
                  }
                  value="action:open-consultation Nouvelle consultation Ouvrir une consultation"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <HugeiconsIcon
                      className="size-4"
                      icon={ClinicIcon}
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="ml-1 font-medium text-foreground text-sm">
                    {t("commandPalette.action.openConsultation", { defaultValue: "Ouvrir une consultation" })}
                  </span>
                  <Kbd className="ml-auto">↵</Kbd>
                </CommandItem>

                <CommandItem
                  className={commandItemClassName}
                  keywords={[
                    t("commandPalette.action.newPrescription", { defaultValue: "Nouvelle ordonnance" }),
                    "ordonnance",
                    "prescription",
                    "medicaments",
                  ]}
                  onSelect={() =>
                    fireAction("clinique", "vetera:open-prescription")
                  }
                  value="action:new-prescription Nouvelle ordonnance Prescription médicaments"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                    <HugeiconsIcon
                      className="size-4"
                      icon={PillIcon}
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="ml-1 font-medium text-foreground text-sm">
                    {t("commandPalette.action.newPrescription", { defaultValue: "Nouvelle ordonnance" })}
                  </span>
                </CommandItem>

                <CommandItem
                  className={commandItemClassName}
                  keywords={[
                    "nouvelle facture",
                    "facture",
                    "finances",
                    "devis",
                    "encaisser",
                  ]}
                  onSelect={() =>
                    fireAction("finances", "vetera:new-invoice")
                  }
                  value="action:new-invoice Nouvelle facture Établir une facture"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <HugeiconsIcon
                      className="size-4"
                      icon={WalletIcon}
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="ml-1 font-medium text-foreground text-sm">
                    Nouvelle facture
                  </span>
                </CommandItem>

                <CommandItem
                  className={commandItemClassName}
                  keywords={[
                    t("commandPalette.action.newHospitalization", { defaultValue: "Nouvelle hospitalisation" }),
                    "hospitalisation",
                    "clinique",
                    "box",
                  ]}
                  onSelect={() =>
                    fireAction("clinique", "vetera:open-hospitalization")
                  }
                  value="action:new-hospitalization Nouvelle hospitalisation Admission box"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                    <HugeiconsIcon
                      className="size-4"
                      icon={HospitalBed01Icon}
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="ml-1 font-medium text-foreground text-sm">
                    {t("commandPalette.action.newHospitalization", { defaultValue: "Nouvelle hospitalisation" })}
                  </span>
                </CommandItem>

                <CommandItem
                  className={commandItemClassName}
                  keywords={[
                    t("commandPalette.action.newAnesthesia", { defaultValue: "Nouvelle anesthésie" }),
                    "anesthesie",
                    "chirurgie",
                  ]}
                  onSelect={() =>
                    fireAction("clinique", "vetera:open-anesthesia")
                  }
                  value="action:new-anesthesia Nouvelle anesthésie Protocole anesthésique"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                    <HugeiconsIcon
                      className="size-4"
                      icon={VaccineIcon}
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="ml-1 font-medium text-foreground text-sm">
                    {t("commandPalette.action.newAnesthesia", { defaultValue: "Nouvelle anesthésie" })}
                  </span>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>

        {/* Pied de page avec raccourcis clavier */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/60 px-4 py-2.5 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5">
              <Kbd className="h-4 px-1 text-[9px]">↑</Kbd>
              <Kbd className="h-4 px-1 text-[9px]">↓</Kbd>
              {t("commandPalette.footer.navigate", { defaultValue: "Naviguer" })}
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd className="h-4 px-1 text-[9px]">↵</Kbd>
              {t("commandPalette.footer.select", { defaultValue: "Sélectionner" })}
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <Kbd className="h-4 px-1 text-[9px]">esc</Kbd>
              {t("commandPalette.footer.close", { defaultValue: "Fermer" })}
            </span>
          </div>
          <span className="hidden font-mono tracking-wide text-muted-foreground/70 sm:inline text-[10px]">
            Baitari ⌘K
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
