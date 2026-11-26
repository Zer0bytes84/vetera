"use client";
/* eslint-disable react-hooks/purity */

import {
  ArrowPathIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  CalendarDateRangeIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  CubeIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
  UserPlusIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { HugeiconsIcon } from "@hugeicons/react";
import { Command as CommandPrimitive } from "cmdk";
import { useHospitalizationEnabled } from "@/modules/clinique/clinic-services";
import { openAssistant } from "@/modules/consultations/assistant-events";
import { SidebarIcon } from "@/modules/shell/components/sidebar-icon";
import "./command-palette.css";
import type { Locale } from "date-fns";
import { format } from "date-fns";
import { ar, de, enUS, es, fr, pt } from "date-fns/locale";
import {
  type ComponentType,
  type ReactNode,
  type SVGProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { CommandDialog } from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPatientStatusMeta } from "@/config/status-meta";
import { useFocus } from "@/contexts/focus-provider";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
} from "@/data/repositories";
import { WHITESPACE_RUN } from "@/lib/patterns";
import { getSpeciesGlyph } from "@/lib/species-icons";
import type {
  SearchSection,
  SourceType,
} from "@/modules/consultations/local-ai/embedding-index";
import {
  searchAllPatientsClinical,
  searchAllPatientsFastLexical,
} from "@/modules/consultations/local-ai/embedding-store";
import {
  bestPassage,
  focusExcerpt,
} from "@/modules/consultations/local-ai/passage-search";
import { highlightPassage } from "@/modules/consultations/local-ai/search-highlight";
import {
  matchesPatientReference,
  patientReferenceSearchText,
} from "@/modules/patients/reference/reference";
import { parseActionQuery } from "@/modules/shell/model/action-query";
import {
  prepareAppointment,
  prepareInvoice,
  prepareVaccination,
} from "@/modules/shell/model/clinical-actions";
import { suggestedPatients } from "@/modules/shell/model/palette-suggestions";
import type { View } from "@/types";
import type { Appointment, Patient } from "@/types/db";

const LEADING_SCOPE_TOKEN = /^[a-z]+:[^\s]+\s*/i;
const LEADING_CIVILITY = /^(mme|m|mr|madame|monsieur)\.?\s+/i;
const WHITESPACE_ONLY = /^\s+$/;

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

/** The Dossiers filter, nothing typed: frequent clinical searches; a choice fills the field with its query. */
const CLINICAL_SUGGESTIONS = [
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
] as const;

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
  keywords?: string[]
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

  const cleanedValue = value.replace(LEADING_SCOPE_TOKEN, "").trim();
  const normalizedLabel = normalizeSearch(cleanedValue);
  const haystack = normalizeSearch(
    `${cleanedValue} ${(keywords ?? []).join(" ")}`
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
  const labelWords = normalizedLabel.split(WHITESPACE_RUN).filter(Boolean);
  if (labelWords.some((word) => word.startsWith(normalizedSearch))) {
    return 0.9;
  }

  // Any keyword starts with the query
  if (
    (keywords ?? []).some((kw) =>
      normalizeSearch(kw).startsWith(normalizedSearch)
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
  const tokens = normalizedSearch.split(WHITESPACE_RUN).filter(Boolean);
  const matchedTokens = tokens.filter((token) => haystack.includes(token));
  return matchedTokens.length === tokens.length && tokens.length > 0 ? 0.65 : 0;
};

export const matchesSearch = (value: string, search: string): boolean => {
  const normalizedValue = normalizeSearch(value);
  const tokens = normalizeSearch(search).split(WHITESPACE_RUN).filter(Boolean);
  return tokens.every((token) => normalizedValue.includes(token));
};

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onNavigateToPatient,
}: CommandPaletteProps) {
  const { t, i18n } = useTranslation();
  // A practice without hospitalization (Paramètres > Mon cabinet) is not offered the action.
  const hospitalizationEnabled = useHospitalizationEnabled();
  const lang = i18n.language?.slice(0, 2) ?? "fr";
  const dateLocale = localeByLanguage[lang] ?? fr;
  const { requestFocus } = useFocus();
  const { data: owners } = useOwnersRepository();

  const { data: patients, loading: patientsLoading } = usePatientsRepository();
  const { data: appointments, loading: appointmentsLoading } =
    useAppointmentsRepository();

  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const [query, setQuery] = useState("");
  // Three views: everything, the clinic's records, and the app's commands.
  const [group, setGroup] = useState<"all" | "records" | "commands">("all");
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
          {
            sourceTypes: CLINICAL_ALL_SOURCES,
            sections: CLINICAL_ALL_SECTIONS,
          },
          trimmed,
          controller.signal
        );
        if (!controller.signal.aborted && instantMatches.length > 0) {
          setSemanticResults((prev) =>
            prev.length === 0 ? instantMatches : prev
          );
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
            {
              sourceTypes: CLINICAL_ALL_SOURCES,
              sections: CLINICAL_ALL_SECTIONS,
            },
            trimmed,
            controller.signal
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
        label: t("commandPalette.nav.dashboard", {
          defaultValue: "Tableau de bord",
        }),
        sub: t("commandPalette.nav.dashboardSub", {
          defaultValue: "Vue d'ensemble et pilotage",
        }),
        category: t("commandPalette.category.pilotage", {
          defaultValue: "Pilotage",
        }),
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
        sub: t("commandPalette.nav.patientsSub", {
          defaultValue: "Dossiers médicaux et antécédents",
        }),
        category: t("commandPalette.category.parcours", {
          defaultValue: "Parcours patient",
        }),
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
        sub: t("commandPalette.nav.agendaSub", {
          defaultValue: "Planning et rendez-vous",
        }),
        category: t("commandPalette.category.parcours", {
          defaultValue: "Parcours patient",
        }),
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
        sub: t("commandPalette.nav.notesSub", {
          defaultValue: "Notes, ordonnances et comptes-rendus",
        }),
        category: t("commandPalette.category.parcours", {
          defaultValue: "Parcours patient",
        }),
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
        label: t("commandPalette.nav.clinique", {
          defaultValue: "Soins & hospitalisation",
        }),
        sub: t("commandPalette.nav.cliniqueSub", {
          defaultValue: "Soins du jour et hospitalisations",
        }),
        category: t("commandPalette.category.parcours", {
          defaultValue: "Parcours patient",
        }),
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
        sub: t("commandPalette.nav.tasksSub", {
          defaultValue: "To-do list et rappels",
        }),
        category: t("commandPalette.category.pilotage", {
          defaultValue: "Pilotage",
        }),
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
        label: t("commandPalette.nav.stock", {
          defaultValue: "Stock & Pharma",
        }),
        sub: t("commandPalette.nav.stockSub", {
          defaultValue: "Inventaire et délivrance médicaments",
        }),
        category: t("commandPalette.category.exploitation", {
          defaultValue: "Exploitation",
        }),
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
        sub: t("commandPalette.nav.financesSub", {
          defaultValue: "Facturation, devis et recettes",
        }),
        category: t("commandPalette.category.exploitation", {
          defaultValue: "Exploitation",
        }),
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
        sub: t("commandPalette.nav.teamSub", {
          defaultValue: "Collaborateurs et plannings",
        }),
        category: t("commandPalette.category.exploitation", {
          defaultValue: "Exploitation",
        }),
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
        sub: t("commandPalette.nav.settingsSub", {
          defaultValue: "Configuration et préférences",
        }),
        category: t("commandPalette.category.configuration", {
          defaultValue: "Configuration",
        }),
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
    [t]
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
    if (!intent || intent.kind === "invoice") {
      return [];
    }
    return patients
      .filter((patient) =>
        matchesSearch(`${patient.name} ${patient.species}`, intent.entity)
      )
      .slice(0, 5);
  }, [intent, patients]);

  const actionOwners = useMemo(() => {
    if (intent?.kind !== "invoice") {
      return [];
    }
    const entityClean = intent.entity.replace(LEADING_CIVILITY, "");
    return owners
      .filter((owner) =>
        matchesSearch(`${owner.firstName} ${owner.lastName}`, entityClean)
      )
      .slice(0, 5);
  }, [intent, owners]);

  const suggestions = useMemo(
    () =>
      suggestedPatients(patients, appointments, Date.now()).filter(
        (patient) =>
          group !== "all" ||
          !recents.some(
            (entry) => entry.kind === "patient" && entry.id === patient.id
          )
      ),
    [patients, appointments, group, recents]
  );

  const showPatients = group === "all" || group === "records";
  const showSemantic = group === "all" || group === "records";
  const showAppointments = group === "all" || group === "records";
  const showNavigation = group === "all" || group === "commands";
  const showActions = group === "all" || group === "commands";

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
          `${p.name} ${p.species} ${p.breed ?? ""} ${ownerName} ${chip} ${tattoo} ${patientReferenceSearchText(p.reference)}`,
          q
        );
      })
      .sort((a, b) => {
        // The exact reference typed opens that patient first
        const aReference = matchesPatientReference(a.reference, query);
        const bReference = matchesPatientReference(b.reference, query);
        if (aReference !== bReference) {
          return aReference ? -1 : 1;
        }

        // Prioritize startsWith on name
        const aName = normalizeSearch(a.name);
        const bName = normalizeSearch(b.name);
        const aStarts = aName.startsWith(q);
        const bStarts = bName.startsWith(q);
        if (aStarts && !bStarts) {
          return -1;
        }
        if (!aStarts && bStarts) {
          return 1;
        }

        // Secondary: recency of last visit
        const aVisit = a.lastVisit ? Date.parse(a.lastVisit) : 0;
        const bVisit = b.lastVisit ? Date.parse(b.lastVisit) : 0;
        return bVisit - aVisit;
      })
      .slice(0, 8);
  }, [patients, ownerById, q, query]);

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
    [onNavigate, onClose]
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
    [onNavigateToPatient, onClose]
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
    [patientsById, requestFocus, onNavigate, onClose]
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
    [onNavigateToPatient, onNavigate, onClose]
  );

  const fireAction = useCallback(
    (view: View, event: string, detail?: { patientId: string }) => {
      onNavigate(view);
      onClose();
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent(event, { detail }));
      }, 120);
    },
    [onNavigate, onClose]
  );
  // With nothing typed, the quick actions lead as tiles; once the user types, every group reads as rows.
  const actionsLayout = q ? "rows" : "tiles";
  // Pages & Navigation is not on the opening screen: it answers a typed query, or the Commandes filter.
  const showNavigationGroup =
    showNavigation && (Boolean(q) || group === "commands");

  // The quick actions, one element shown first (tiles, nothing typed) or after the results (rows, once the user types).
  const quickActions = (
    <CommandPrimitive.Group
      className="command-palette-actions"
      data-layout={actionsLayout}
      heading={t("commandPalette.group.actions", {
        defaultValue: "Actions rapides",
      })}
    >
      <CommandPrimitive.Item
        className="command-palette-item"
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
        <Glyph icon={SparklesIcon} />
        <Text
          sub="Dictée guidée SOAP & recherche clinique"
          title="Ouvrir l'Assistant IA"
        />
        <Kbd className="command-palette-shortcut">⌘J</Kbd>
      </CommandPrimitive.Item>

      <CommandPrimitive.Item
        className="command-palette-item"
        keywords={[
          t("commandPalette.action.newPatient", {
            defaultValue: "Nouveau patient",
          }),
          "patient",
          "ajouter",
          "creer",
          "fiche",
        ]}
        onSelect={() => fireAction("patients", "vetera:new-patient")}
        value="action:new-patient Nouveau patient Créer un dossier animal"
      >
        <Glyph icon={UserPlusIcon} />
        <Text
          title={t("commandPalette.action.newPatient", {
            defaultValue: "Nouveau patient",
          })}
        />
        <Kbd className="command-palette-shortcut">⌘N</Kbd>
      </CommandPrimitive.Item>

      <CommandPrimitive.Item
        className="command-palette-item"
        keywords={[
          t("commandPalette.action.newAppointment", {
            defaultValue: "Nouveau rendez-vous",
          }),
          "agenda",
          "rdv",
          "programmer",
        ]}
        onSelect={() => fireAction("agenda", "vetera:new-appointment")}
        value="action:new-appointment Nouveau rendez-vous Programmer une visite"
      >
        <Glyph icon={CalendarDaysIcon} />
        <Text
          title={t("commandPalette.action.newAppointment", {
            defaultValue: "Nouveau rendez-vous",
          })}
        />
        <Kbd className="command-palette-shortcut">⌘R</Kbd>
      </CommandPrimitive.Item>

      <CommandPrimitive.Item
        className="command-palette-item"
        keywords={[
          t("commandPalette.action.openConsultation", {
            defaultValue: "Ouvrir une consultation",
          }),
          "clinique",
          "soins",
          "soap",
        ]}
        onSelect={() => {
          onClose();
          window.dispatchEvent(new Event("vetera:quick-consultation"));
        }}
        value="action:open-consultation Nouvelle consultation Ouvrir une consultation"
      >
        <Glyph icon={ClipboardDocumentCheckIcon} />
        <Text
          title={t("commandPalette.action.openConsultation", {
            defaultValue: "Ouvrir une consultation",
          })}
        />
        <Kbd className="command-palette-hint">↵</Kbd>
      </CommandPrimitive.Item>

      <CommandPrimitive.Item
        className="command-palette-item"
        keywords={[
          t("commandPalette.action.newPrescription", {
            defaultValue: "Nouvelle ordonnance",
          }),
          "ordonnance",
          "prescription",
          "medicaments",
        ]}
        onSelect={() => fireAction("clinique", "vetera:open-prescription")}
        value="action:new-prescription Nouvelle ordonnance Prescription médicaments"
      >
        <Glyph icon={PencilSquareIcon} />
        <Text
          title={t("commandPalette.action.newPrescription", {
            defaultValue: "Nouvelle ordonnance",
          })}
        />
      </CommandPrimitive.Item>

      <CommandPrimitive.Item
        className="command-palette-item"
        keywords={[
          "nouvelle facture",
          "facture",
          "finances",
          "devis",
          "encaisser",
        ]}
        onSelect={() => fireAction("finances", "vetera:new-invoice")}
        value="action:new-invoice Nouvelle facture Établir une facture"
      >
        <Glyph icon={BanknotesIcon} />
        <Text title="Nouvelle facture" />
      </CommandPrimitive.Item>

      {/* A practice without hospitalization is not offered the action (Paramètres > Mon cabinet). */}
      {hospitalizationEnabled && (
        <CommandPrimitive.Item
          className="command-palette-item"
          keywords={[
            t("commandPalette.action.newHospitalization", {
              defaultValue: "Nouvelle hospitalisation",
            }),
            "hospitalisation",
            "clinique",
            "box",
          ]}
          onSelect={() => fireAction("clinique", "vetera:open-hospitalization")}
          value="action:new-hospitalization Nouvelle hospitalisation Admission box"
        >
          <Glyph icon={BuildingOffice2Icon} />
          <Text
            title={t("commandPalette.action.newHospitalization", {
              defaultValue: "Nouvelle hospitalisation",
            })}
          />
        </CommandPrimitive.Item>
      )}

      <CommandPrimitive.Item
        className="command-palette-item"
        keywords={[
          t("commandPalette.action.newAnesthesia", {
            defaultValue: "Nouvelle anesthésie",
          }),
          "anesthesie",
          "chirurgie",
        ]}
        onSelect={() => fireAction("clinique", "vetera:open-anesthesia")}
        value="action:new-anesthesia Nouvelle anesthésie Protocole anesthésique"
      >
        <Glyph icon={MoonIcon} />
        <Text
          title={t("commandPalette.action.newAnesthesia", {
            defaultValue: "Nouvelle anesthésie",
          })}
        />
      </CommandPrimitive.Item>
    </CommandPrimitive.Group>
  );

  return (
    <CommandDialog
      className="command-palette sm:!top-[15%] sm:!-translate-y-0 !max-w-[680px]"
      description="Recherche rapide, navigation et dossiers patients."
      onOpenChange={(open) => !open && onClose()}
      open={isOpen}
      overlayClassName="data-closed:!animate-none data-open:!animate-none bg-black/40 backdrop-blur-sm dark:bg-black/60"
      title="Palette de commandes"
    >
      <CommandPrimitive
        className="command-palette-root"
        data-slot="command"
        filter={scoreCommandMatch}
        label={t("commandPalette.title", {
          defaultValue: "Recherche globale",
        })}
        loop
      >
        {/* The field: the loupe, the query, the three filters and esc, on one white panel. */}
        <div
          className="command-palette-field"
          onMouseDown={(event) => {
            // The loupe and the field's padding hand the click to the input, as the former input group did.
            const target = event.target as HTMLElement;
            if (target.closest("input, button, [role='tab']")) {
              return;
            }
            event.preventDefault();
            event.currentTarget
              .querySelector<HTMLInputElement>("[data-command-palette-input]")
              ?.focus();
          }}
        >
          <MagnifyingGlassIcon
            aria-hidden="true"
            className="command-palette-field-icon"
          />
          <CommandPrimitive.Input
            aria-label={t("commandPalette.placeholder", {
              defaultValue: "Rechercher ou exécuter une commande…",
            })}
            autoFocus={isOpen}
            className="command-palette-input"
            data-command-palette-input="true"
            data-slot="command-input"
            onValueChange={setQuery}
            placeholder="Rechercher un patient, une page…"
            value={query}
          />
          {query ? (
            <button
              aria-label="Effacer la recherche"
              className="command-palette-clear"
              onClick={() => setQuery("")}
              type="button"
            >
              <XMarkIcon aria-hidden="true" />
            </button>
          ) : null}
          <Tabs
            className="command-palette-filters"
            onValueChange={(value) =>
              setGroup(value as "all" | "records" | "commands")
            }
            value={group}
          >
            <TabsList
              aria-label="Catégorie de résultats"
              tabsStyle="segmented"
              variant="line"
            >
              {(
                [
                  ["all", "Tout"],
                  ["records", "Dossiers"],
                  ["commands", "Commandes"],
                ] as const
              ).map(([value, label]) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                  {value === "records" &&
                    q &&
                    matchedPatients.length + semanticResults.length > 0 && (
                      <span className="command-palette-count">
                        {matchedPatients.length + semanticResults.length}
                      </span>
                    )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {!query && <Kbd className="command-palette-esc">esc</Kbd>}
        </div>

        {/* The results, on a second white panel. */}
        <CommandPrimitive.List className="command-palette-list">
          <CommandPrimitive.Empty className="command-palette-empty">
            <span aria-hidden="true" className="command-palette-empty-glyph">
              <DocumentMagnifyingGlassIcon />
            </span>
            <span className="command-palette-empty-title">
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
            <span className="command-palette-empty-hint">
              {q
                ? "Vérifiez l’orthographe ou cherchez un nom de patient, une page ou une action."
                : t("commandPalette.empty.hint", {
                    defaultValue: "Tapez une commande ou cherchez un patient.",
                  })}
            </span>
            {q && (
              <button
                className="command-palette-empty-action"
                onClick={() => fireAction("patients", "vetera:new-patient")}
                type="button"
              >
                <UserPlusIcon aria-hidden="true" />
                Créer un patient nommé « {query} »
              </button>
            )}
          </CommandPrimitive.Empty>

          {/* Actions déduites de l'intention utilisateur */}
          {showActions && intent && (
            <CommandPrimitive.Group heading="Actions contextuelles">
              {actionPatients.map((patient) => (
                <CommandPrimitive.Item
                  className="command-palette-item"
                  key={`action:${patient.id}`}
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
                  value={`${query} ${patient.name}`}
                >
                  <Glyph
                    icon={
                      intent.kind === "vaccination"
                        ? ShieldCheckIcon
                        : ClipboardDocumentCheckIcon
                    }
                  />
                  <Text
                    sub={`${patient.species}${patient.breed ? ` · ${patient.breed}` : ""} · Dossier existant`}
                    title={`${
                      intent.kind === "vaccination"
                        ? "Ajouter un vaccin"
                        : "Nouvelle consultation"
                    } · ${patient.name}`}
                  />
                  <Hint>↵ Exécuter</Hint>
                </CommandPrimitive.Item>
              ))}

              {actionOwners.map((owner) => (
                <CommandPrimitive.Item
                  className="command-palette-item"
                  key={`invoice:${owner.id}`}
                  onSelect={() => {
                    prepareInvoice(owner.id);
                    fireAction("finances", "vetera:new-invoice");
                  }}
                  value={`${query} ${owner.firstName} ${owner.lastName}`}
                >
                  <Glyph icon={BanknotesIcon} />
                  <Text
                    sub="Propriétaire existant · Établir un devis ou une facture"
                    title={`Nouvelle facture · ${owner.firstName} ${owner.lastName}`}
                  />
                  <Hint>↵ Facturer</Hint>
                </CommandPrimitive.Item>
              ))}
            </CommandPrimitive.Group>
          )}

          {/* Actions rapides: first on the opening screen, as tiles; after the results once the user types. */}
          {showActions && !q && quickActions}

          {/* Récents (quand aucune requête n'est saisie) */}
          {group === "all" && !q && recents.length > 0 && (
            <CommandPrimitive.Group
              heading={t("commandPalette.group.recents", {
                defaultValue: "Récents",
              })}
            >
              {recents
                .filter(
                  (entry) =>
                    entry.kind !== "patient" || patientsById.has(entry.id)
                )
                .map((entry) => (
                  <CommandPrimitive.Item
                    className="command-palette-item"
                    key={`${entry.kind}-${entry.id}`}
                    keywords={[entry.sub ?? ""]}
                    onSelect={() => handleSelectRecent(entry)}
                    value={`recent:${entry.kind}:${entry.id} ${entry.label} ${entry.sub ?? ""}`}
                  >
                    {entry.kind === "patient" ? (
                      <Glyph icon={UserIcon} />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="command-palette-glyph"
                      >
                        <SidebarIcon view={entry.id as View} />
                      </span>
                    )}
                    <Text sub={entry.sub} title={entry.label} />
                    <Hint>Récemment ouvert</Hint>
                  </CommandPrimitive.Item>
                ))}
            </CommandPrimitive.Group>
          )}

          {/* Suggestions intelligentes (quand pas de recherche) */}
          {showPatients && !q && suggestions.length > 0 && (
            <CommandPrimitive.Group heading="À retrouver rapidement">
              {suggestions.map((patient) => {
                const statusMeta = getPatientStatusMeta(patient.status);
                const ownerName = ownerById.get(patient.ownerId);
                return (
                  <CommandPrimitive.Item
                    className="command-palette-item"
                    key={`suggestion:${patient.id}`}
                    onSelect={() => handleSelectPatient(patient)}
                    value={`suggestion:${patient.id} ${patient.name}`}
                  >
                    <SpeciesGlyph species={patient.species} />
                    <Text
                      badge={
                        patient.status && (
                          <Badge
                            className={`command-palette-status ${statusMeta.className}`}
                            variant="outline"
                          >
                            {statusMeta.label}
                          </Badge>
                        )
                      }
                      sub={`${patient.species}${patient.breed ? ` · ${patient.breed}` : ""}${ownerName ? ` · ${ownerName}` : ""}`}
                      title={patient.name}
                    />
                    <Hint>Ouvrir ↵</Hint>
                  </CommandPrimitive.Item>
                );
              })}
            </CommandPrimitive.Group>
          )}

          {/* Résultats de recherche Patients */}
          {showPatients && matchedPatients.length > 0 && (
            <CommandPrimitive.Group
              heading={t("commandPalette.group.patients", {
                defaultValue: "Dossiers Patients",
              })}
            >
              {matchedPatients.map((patient) => {
                const statusMeta = getPatientStatusMeta(patient.status);
                const ownerName = ownerById.get(patient.ownerId);
                return (
                  <CommandPrimitive.Item
                    className="command-palette-item"
                    key={patient.id}
                    keywords={[
                      patient.species,
                      patient.breed ?? "",
                      ownerName ?? "",
                      patient.chipNumber ?? "",
                      patient.tattooNumber ?? "",
                      patientReferenceSearchText(patient.reference),
                    ]}
                    onSelect={() => handleSelectPatient(patient)}
                    value={`patient:${patient.id} ${patient.name} ${patient.species} ${patient.breed ?? ""}`}
                  >
                    <SpeciesGlyph species={patient.species} />
                    <Text
                      badge={
                        patient.status && (
                          <Badge
                            className={`command-palette-status ${statusMeta.className}`}
                            variant="outline"
                          >
                            {statusMeta.label}
                          </Badge>
                        )
                      }
                      sub={
                        <>
                          {patient.reference && (
                            <span className="command-palette-reference">
                              {patient.reference} ·{" "}
                            </span>
                          )}
                          {patient.species}
                          {patient.breed && ` · ${patient.breed}`}
                          {ownerName && ` · Propriétaire : ${ownerName}`}
                        </>
                      }
                      title={patient.name}
                    />
                    <Hint>↵ Ouvrir</Hint>
                  </CommandPrimitive.Item>
                );
              })}
            </CommandPrimitive.Group>
          )}

          {/* Onglet Dossiers sans requête : suggestions cliniques */}
          {group === "records" && !query.trim() && (
            <CommandPrimitive.Group heading="Suggestions cliniques · Recherches fréquentes">
              {CLINICAL_SUGGESTIONS.map((sug) => (
                <CommandPrimitive.Item
                  className="command-palette-item"
                  key={sug.id}
                  onClick={() => setQuery(sug.query)}
                  onSelect={() => setQuery(sug.query)}
                  value={`semantic:sug:${sug.id} ${sug.label} ${sug.query}`}
                >
                  <Glyph icon={MagnifyingGlassIcon} />
                  <Text
                    badge={
                      <span className="command-palette-tag">{sug.badge}</span>
                    }
                    sub={sug.sub}
                    title={sug.label}
                  />
                  <Hint>Rechercher ↵</Hint>
                </CommandPrimitive.Item>
              ))}
            </CommandPrimitive.Group>
          )}

          {/* Résultats sémantiques : le passage trouvé d'abord, son dossier et sa rubrique dessous */}
          {showSemantic &&
            (semanticResults.length > 0 ||
              (semanticLoading && group === "records")) && (
              <CommandPrimitive.Group heading="Cas similaires · Recherche clinique">
                {semanticLoading && semanticResults.length === 0 ? (
                  <CommandPrimitive.Item
                    className="command-palette-item command-palette-loading"
                    disabled
                    value="semantic:loading-indicator"
                  >
                    <ArrowPathIcon
                      aria-hidden="true"
                      className="command-palette-spinner"
                    />
                    <span>
                      Recherche clinique dans l’ensemble des dossiers…
                    </span>
                  </CommandPrimitive.Item>
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
                          label: result.text.split("—")[0].trim() || "Produits",
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
                        // A note kept without a visit opens itself in the record.
                        if (result.sourceType === "document") {
                          sessionStorage.setItem(
                            "patient:open-note",
                            result.sourceId
                          );
                        }
                        window.location.hash = `#/patient/${encodeURIComponent(result.patientId)}`;
                        onNavigateToPatient(result.patientId);
                      }
                      onClose();
                    };

                    const isProduct = result.sourceType === "product";
                    const isConsult = result.sourceType === "consultation";
                    const isPatient = result.sourceType === "patient";

                    const itemIcon = isProduct
                      ? CubeIcon
                      : isConsult
                        ? CalendarDateRangeIcon
                        : isPatient
                          ? UserIcon
                          : DocumentTextIcon;

                    const passage = focusExcerpt(
                      bestPassage(result.text, query),
                      query
                    );

                    return (
                      <CommandPrimitive.Item
                        className="command-palette-item command-palette-passage"
                        key={`semantic:${result.sourceType}:${result.patientId}:${result.sourceId}:${result.section}:${result.chunkIndex}`}
                        keywords={[
                          query,
                          result.section,
                          sectionLabel,
                          result.text,
                        ]}
                        onClick={handleSelectCase}
                        onSelect={handleSelectCase}
                        value={`semantic:${result.sourceType}:${result.patientId}:${result.sourceId}:${result.section}:${result.chunkIndex} ${patientName} ${result.text}`}
                      >
                        <Glyph icon={itemIcon} />
                        <span className="command-palette-text">
                          <span className="command-palette-excerpt">
                            {joinAdjacentHits(
                              highlightPassage(passage, query)
                            ).map((segment, index) =>
                              segment.hit ? (
                                <mark key={index}>{segment.text}</mark>
                              ) : (
                                <span key={index}>{segment.text}</span>
                              )
                            )}
                          </span>
                          <span className="command-palette-sub">
                            <span className="command-palette-source">
                              {patientName}
                            </span>
                            {" · "}
                            {sectionLabel}
                          </span>
                        </span>
                        <Hint>
                          {isProduct ? "↵ Voir en stock" : "↵ Ouvrir"}
                        </Hint>
                      </CommandPrimitive.Item>
                    );
                  })
                )}
              </CommandPrimitive.Group>
            )}

          {/* Résultats Rendez-vous */}
          {showAppointments && matchedAppointments.length > 0 && (
            <CommandPrimitive.Group
              heading={t("commandPalette.group.appointments", {
                defaultValue: "Rendez-vous",
              })}
            >
              {matchedAppointments.map((appt) => {
                const patient = patientsById.get(appt.patientId);
                return (
                  <CommandPrimitive.Item
                    className="command-palette-item"
                    key={appt.id}
                    keywords={[
                      appt.type,
                      appt.notes ?? "",
                      patient?.name ?? "",
                    ]}
                    onSelect={() => handleSelectAppointment(appt)}
                    value={`appointment:${appt.id} ${appt.title} ${appt.type} ${patient?.name ?? ""}`}
                  >
                    <Glyph icon={CalendarDateRangeIcon} />
                    <Text
                      sub={`${patient?.name ?? t("commandPalette.unlinkedPatient", { defaultValue: "Patient" })} · ${format(new Date(appt.startTime), "PPP HH:mm", { locale: dateLocale })}`}
                      title={appt.title}
                    />
                    <Hint>Agenda ↵</Hint>
                  </CommandPrimitive.Item>
                );
              })}
            </CommandPrimitive.Group>
          )}

          {/* Pages et Navigation */}
          {showNavigationGroup && (
            <CommandPrimitive.Group heading="Pages & Navigation">
              {navigationActions.map((action) => (
                <CommandPrimitive.Item
                  className="command-palette-item"
                  key={action.id}
                  keywords={action.keywords}
                  onSelect={() => handleSelectNav(action)}
                  value={`navigation:${action.id} ${action.label} ${action.sub}`}
                >
                  <span aria-hidden="true" className="command-palette-glyph">
                    <SidebarIcon view={action.id} />
                  </span>
                  <Text sub={action.sub} title={action.label} />
                  <Hint>Naviguer ↵</Hint>
                </CommandPrimitive.Item>
              ))}
            </CommandPrimitive.Group>
          )}

          {/* Actions rapides, after the results once the user types */}
          {showActions && q && quickActions}
        </CommandPrimitive.List>

        {/* Pied de page avec raccourcis clavier, sur la bande */}
        <div className="command-palette-footer">
          <span>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            {t("commandPalette.footer.navigate", { defaultValue: "Naviguer" })}
          </span>
          <span>
            <Kbd>↵</Kbd>
            {t("commandPalette.footer.select", {
              defaultValue: "Sélectionner",
            })}
          </span>
          <span className="command-palette-footer-close">
            <Kbd>esc</Kbd>
            {t("commandPalette.footer.close", { defaultValue: "Fermer" })}
          </span>
        </div>
      </CommandPrimitive>
    </CommandDialog>
  );
}

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

/** The row's icon: a Heroicon (20, solid) on a quiet fill, no border. */
function Glyph({ icon: Icon }: { icon: HeroIcon }) {
  return (
    <span aria-hidden="true" className="command-palette-glyph">
      <Icon />
    </span>
  );
}

/** A patient's species glyph on the same fill (Heroicons has no animals). */
function SpeciesGlyph({ species }: { species: string }) {
  return (
    <span aria-hidden="true" className="command-palette-glyph">
      <HugeiconsIcon
        icon={getSpeciesGlyph(species)}
        size={18}
        strokeWidth={1.5}
      />
    </span>
  );
}

/** Title (with an optional badge) over a quiet second line. */
function Text({
  title,
  sub,
  badge,
}: {
  title: ReactNode;
  sub?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <span className="command-palette-text">
      <span className="command-palette-title">
        <span className="command-palette-title-text">{title}</span>
        {badge}
      </span>
      {sub && <span className="command-palette-sub">{sub}</span>}
    </span>
  );
}

/**
 * Words found next to each other read as one marked run: a gap made only of spaces between two hits joins them, so
 * « Insuffisance rénale chronique » is one highlight, not three. Presentation only; the hits are highlightPassage's.
 */
function joinAdjacentHits(segments: Array<{ text: string; hit: boolean }>) {
  const out: Array<{ text: string; hit: boolean }> = [];
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const previous = out.at(-1);
    const next = segments[i + 1];
    if (
      !segment.hit &&
      previous?.hit &&
      next?.hit &&
      WHITESPACE_ONLY.test(segment.text)
    ) {
      previous.text += segment.text + next.text;
      i++;
    } else if (segment.hit && previous?.hit) {
      previous.text += segment.text;
    } else {
      out.push({ ...segment });
    }
  }
  return out;
}

/** The row's hint («  Ouvrir ↵ », a shortcut): shown on the current row only. */
function Hint({ children }: { children: ReactNode }) {
  return <span className="command-palette-hint">{children}</span>;
}
