import {
  Check as CheckIcon,
  Copy as CopyIcon,
  Plus as PlusIcon,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button as ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import { SourceList } from "@/components/ui/source-list";
import { ToolCallBlock } from "@/components/ui/tool-call-block";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  CircleNotch,
  Microphone,
  RefreshCw,
  Search,
  Stop,
  X,
} from "@/lib/icons";
import { useLocalConsultationAi } from "../hooks/use-local-consultation-ai";
import type {
  SearchChunk,
  SearchSection,
  SourceType,
} from "../local-ai/embedding-index";
import {
  findPatientUnreviewedMatches,
  findUnreviewedSources,
  indexAllPatientsDocuments,
  indexPatientDocuments,
  searchAllPatientsClinical,
  searchPatientDocuments,
} from "../local-ai/embedding-store";
import { scheduleIndexCatchUp } from "../local-ai/index-coverage";
import {
  getIndexCoverage,
  type IndexCoverage,
  subscribeIndexCoverage,
} from "../local-ai/index-coverage-state";
import { getLocalModels, importLocalModel } from "../local-ai/models";
import { bestPassage } from "../local-ai/passage-search";
import { highlightPassage } from "../local-ai/search-highlight";
import "./assistant-thinking.css";
import { guard } from "@/lib/guard";

const SOURCES: Array<{ key: SourceType | "all"; label: string }> = [
  { key: "all", label: "Toutes les sources" },
  { key: "soap", label: "Consultations SOAP" },
  { key: "consultation", label: "Consultations" },
  { key: "patient", label: "Fiches patients" },
  { key: "document", label: "Documents validés" },
  { key: "protocol", label: "Protocoles validés" },
  { key: "product", label: "Produits" },
];

const SECTIONS = [
  { key: "all", label: "Toutes les rubriques" },
  { key: "subjective", label: "Motif & antécédents (S)" },
  { key: "objective", label: "Examen clinique (O)" },
  { key: "assessment", label: "Évaluation & diagnostic (A)" },
  { key: "plan", label: "Plan de soins (P)" },
] as const;

const SOAP_ALL_SECTIONS: SearchSection[] = [
  "subjective",
  "objective",
  "assessment",
  "plan",
];

const SUGGESTED_QUERIES = [
  "Vaccination & rappels",
  "Insuffisance rénale",
  "Otite bactérienne",
  "Prurit cutané allergique",
  "Dermatite atopique",
];

const SECTION_LABELS: Record<string, string> = {
  subjective: "Motif & anamnèse",
  objective: "Examen clinique",
  assessment: "Évaluation",
  plan: "Plan de soins",
  consultation: "Consultation",
  patient: "Fiche patient",
  product: "Produit",
  document: "Document clinique",
  protocol: "Protocole",
};

type SearchResult = SearchChunk & {
  patientName?: string;
  score: number;
  match?: "text" | "semantic";
  /** Found by words in a note or document that is not validated (it has no passage). */
  unreviewed?: boolean;
};
type UnreviewedMatch = SearchChunk & { reason: string };

/** What the index covers, in one line; the failures with their patient and error. */
export function coverageSummary(coverage: IndexCoverage): string | null {
  const counted = `${coverage.indexedPatients} patient${coverage.indexedPatients > 1 ? "s" : ""} indexé${coverage.indexedPatients > 1 ? "s" : ""} sur ${coverage.totalPatients}`;
  switch (coverage.status) {
    case "running":
      return `Indexation en arrière-plan : ${counted} (${coverage.checkedPatients} dossiers vérifiés sur ${coverage.patientCount}).`;
    case "paused":
      return `Indexation en pause, le modèle sert à une autre tâche : ${counted}. Reprise automatique.`;
    case "complete":
      return `Index à jour : ${counted}.`;
    case "idle":
      return `Index incomplet : ${counted}.`;
    case "remote":
      return "L’index est tenu à jour par le poste principal.";
    default:
      return null;
  }
}

/** The result's tag: its section when the title is the patient's name, and « Non validée » when it is not validated. */
function resultTag(result: SearchResult, titledByPatient: boolean) {
  const parts: string[] = [];
  if (titledByPatient) {
    parts.push(SECTION_LABELS[result.section] ?? result.section);
  }
  if (result.unreviewed) {
    parts.push("Non validée");
  }
  return parts.join(" · ") || undefined;
}
function plural(count: number, word: string) {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}
/** The line shown after a search: never an empty answer without saying why. */
function searchOutcome(found: number, notValidated: number) {
  if (found) {
    return notValidated
      ? `${plural(found, "passage")} trouvé${found > 1 ? "s" : ""}, et ${notValidated} dans des notes non validées.`
      : `${plural(found, "passage")} trouvé${found > 1 ? "s" : ""}`;
  }
  if (notValidated) {
    return `Aucun passage validé proche ; ${plural(notValidated, "passage")} dans des notes non validées, ci-dessous.`;
  }
  const coverage = getIndexCoverage();
  if (
    coverage.totalPatients &&
    coverage.indexedPatients < coverage.totalPatients
  ) {
    return `Aucun passage validé suffisamment proche. L’index couvre ${coverage.indexedPatients} patients sur ${coverage.totalPatients} : la recherche s’élargira à mesure de l’indexation.`;
  }
  return "Aucun passage validé suffisamment proche pour cette recherche.";
}

/** The index coverage, its failures (patient and error) and the last semantic search that fell back to words. */
function CoverageNotice({ coverage }: { coverage: IndexCoverage }) {
  const summary = coverageSummary(coverage);
  if (!(summary || coverage.failures.length || coverage.lastSearchIssue)) {
    return null;
  }
  return (
    <div
      className="t-12 shrink-0 space-y-1 text-muted-foreground"
      role="status"
    >
      {summary ? <p>{summary}</p> : null}
      {coverage.failures.length ? (
        <ul className="space-y-0.5 text-[var(--tone-amber)]">
          {coverage.failures.map((failure) => (
            <li key={failure.patientId}>
              Non indexé : {failure.patientName} ({failure.message})
            </li>
          ))}
        </ul>
      ) : null}
      {coverage.lastSearchIssue ? (
        <p className="text-[var(--tone-amber)]">
          La recherche par le sens a échoué ({coverage.lastSearchIssue}) :
          résultats par mots seulement.
        </p>
      ) : null}
    </div>
  );
}

export interface PatientDocumentSearchProps {
  onInsertExcerpt?: (excerpt: string, section?: SearchSection) => void;
  patientId?: string;
}

/** Passage with the query terms highlighted. */
function Passage({ text, query }: { text: string; query: string }) {
  return (
    <p className="t-13 line-clamp-6 whitespace-pre-wrap text-foreground leading-relaxed">
      {highlightPassage(text, query).map((segment, index) =>
        segment.hit ? (
          <mark
            className="rounded-[3px] bg-primary/12 px-0.5 text-foreground dark:bg-primary/25"
            // biome-ignore lint/suspicious/noArrayIndexKey: segment surligné d'un passage ; highlightPassage redécoupe tout le passage à chaque requête, dans l'ordre du texte, et le segment n'a pas d'état
            key={index}
          >
            {segment.text}
          </mark>
        ) : (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: segment non surligné du même découpage, refait en bloc à chaque requête, dans l'ordre du texte et sans état
            key={index}
          >
            {segment.text}
          </span>
        )
      )}
    </p>
  );
}

export function PatientDocumentSearch({
  patientId,
  onInsertExcerpt,
}: PatientDocumentSearchProps) {
  const dictation = useLocalConsultationAi();
  const [audience, setAudience] = useState<"patient" | "all">(
    patientId ? "patient" : "all"
  );
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [type, setType] = useState<SourceType | "all">("all");
  const [section, setSection] = useState<SearchSection | "all">("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const active = useRef<AbortController | null>(null);
  const coverage = useSyncExternalStore(
    subscribeIndexCoverage,
    getIndexCoverage
  );
  const [unreviewed, setUnreviewed] = useState<UnreviewedMatch[]>([]);
  // The last operation the assistant ran, shown as one folded row: what it did, how long it took, what it found.
  const [lastRun, setLastRun] = useState<{
    id: number;
    name: string;
    startedAt: number;
    durationMs?: number;
  } | null>(null);

  // Une nouvelle transcription remplace la requête, dès le rendu qui la reçoit (corrigé au rendu, sans effet).
  const [seenTranscription, setSeenTranscription] = useState<string | null>(
    null
  );
  if (dictation.transcription !== seenTranscription) {
    setSeenTranscription(dictation.transcription);
    if (dictation.transcription) {
      setQuery(dictation.transcription);
      setResults([]);
      setMessage("Requête vocale transcrite. Vous pouvez la compléter.");
    }
  }

  // Opening the tab refreshes the counter soon (the pass yields the model to any search started meanwhile).
  useEffect(() => {
    if (getIndexCoverage().status === "unknown") {
      scheduleIndexCatchUp(2000);
    }
  }, []);
  useEffect(() => {
    let alive = true;
    void getLocalModels()
      .then((models) => {
        if (alive) {
          setReady(!!models.embeddingReady);
        }
      })
      .catch(() => {
        // État des modèles illisible : la recherche reste marquée « pas prête ».
      });
    return () => {
      alive = false;
      active.current?.abort();
    };
  }, []);

  useEffect(() => {
    const invalidate = (event: Event) => {
      const table = (event as CustomEvent<{ tableName: string }>).detail
        ?.tableName;
      if (table === "consultation_soaps" || table === "notes") {
        setResults([]);
        setLastRun(null);
        setMessage(
          "Dossier modifié. La recherche réactualisera les sources validées."
        );
      }
    };
    window.addEventListener("sqlite-row-saved", invalidate);
    return () => window.removeEventListener("sqlite-row-saved", invalidate);
  }, []);

  const run = async (indexOnly: boolean, forcedQuery?: string) => {
    const searchQuery = forcedQuery === undefined ? query : forcedQuery;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    setResults([]);
    setUnreviewed([]);
    setMessage(indexOnly ? "Indexation des documents…" : "Recherche en cours…");
    const startedAt = Date.now();
    setLastRun({
      id: startedAt,
      name: indexOnly
        ? "Actualisation de l’index"
        : "Recherche dans les dossiers",
      startedAt,
    });

    return await guard(
      async () => {
        if (indexOnly) {
          const report =
            audience === "all" || !patientId
              ? await indexAllPatientsDocuments(controller.signal, (event) =>
                  setMessage(event.message)
                )
              : {
                  indexed: await indexPatientDocuments(
                    patientId,
                    controller.signal,
                    (event) => setMessage(event.message)
                  ),
                  failures: [],
                };
          if (!controller.signal.aborted) {
            const done = report.indexed
              ? `${report.indexed.toLocaleString("fr-FR")} extraits validés et indexés.`
              : "L’index des sources validées est à jour.";
            setMessage(
              report.failures.length
                ? `${done} ${report.failures.length} dossier${report.failures.length > 1 ? "s" : ""} non indexé${report.failures.length > 1 ? "s" : ""}, voir ci-dessous.`
                : done
            );
            scheduleIndexCatchUp(1000);
          }
        } else {
          if (!searchQuery.trim()) {
            setError(
              "Veuillez saisir une recherche ou choisir une suggestion."
            );
            setBusy(false);
            return;
          }

          const isAllTypes = type === "all";
          const targetSources: SourceType[] = isAllTypes
            ? [
                "soap",
                "document",
                "protocol",
                "consultation",
                "patient",
                "product",
              ]
            : [type as SourceType];
          const targetSections: SearchSection[] = isAllTypes
            ? [
                "subjective",
                "objective",
                "assessment",
                "plan",
                "document",
                "protocol",
                "consultation",
                "patient",
                "product",
              ]
            : type === "soap"
              ? section === "all"
                ? SOAP_ALL_SECTIONS
                : [section as SearchSection]
              : [type as SearchSection];

          const filters = {
            sourceTypes: targetSources,
            sections: targetSections,
          };
          const found =
            audience === "all" || !patientId
              ? await searchAllPatientsClinical(
                  filters,
                  searchQuery,
                  controller.signal,
                  (event) => setMessage(event.message)
                )
              : await searchPatientDocuments(
                  {
                    patientId,
                    sourceTypes: targetSources.filter((t) =>
                      ["soap", "document", "protocol"].includes(t)
                    ) as SourceType[],
                    sections: targetSections.filter((s) =>
                      [
                        "subjective",
                        "objective",
                        "assessment",
                        "plan",
                        "document",
                        "protocol",
                      ].includes(s)
                    ) as SearchSection[],
                  },
                  searchQuery,
                  controller.signal,
                  (event) => setMessage(event.message)
                );

          // The assistant does not find less than the bar: what the bar finds by words in notes and documents that
          // are not validated is shown too, apart and labelled, since those have no passage to rank.
          const patientScope =
            audience === "all" || !patientId
              ? null
              : {
                  patientId,
                  sourceTypes: targetSources.filter((t) =>
                    ["soap", "document", "protocol"].includes(t)
                  ) as SourceType[],
                  sections: targetSections.filter((s) =>
                    [
                      "subjective",
                      "objective",
                      "assessment",
                      "plan",
                      "document",
                      "protocol",
                    ].includes(s)
                  ) as SearchSection[],
                };
          const notValidated = patientScope
            ? await findPatientUnreviewedMatches(patientScope, searchQuery)
            : [];
          const unreviewedIds = patientScope
            ? new Set<string>()
            : await findUnreviewedSources(found);
          if (!controller.signal.aborted) {
            setResults(
              found.map((result) =>
                unreviewedIds.has(result.sourceId)
                  ? { ...result, unreviewed: true }
                  : result
              )
            );
            setUnreviewed(notValidated);
            setSearchedQuery(searchQuery);
            setMessage(searchOutcome(found.length, notValidated.length));
          }
        }
      },
      {
        recover: (failure) => {
          if (!controller.signal.aborted) {
            setError(
              failure instanceof Error
                ? failure.message
                : "La recherche n’a pas abouti."
            );
          }
        },
        cleanup: () => {
          if (active.current === controller) {
            active.current = null;
            setBusy(false);
            setLastRun((previous) =>
              previous && previous.startedAt === startedAt
                ? { ...previous, durationMs: Date.now() - startedAt }
                : previous
            );
          }
        },
      }
    );
  };

  const install = async () => {
    setBusy(true);
    setError("");
    setMessage("Installation de la recherche locale…");
    await guard(
      async () => {
        const models = await importLocalModel("embeddinggemma");
        if (models) {
          setReady(!!models.embeddingReady);
          setMessage("La recherche locale est prête.");
          toast.success("Recherche locale configurée.");
        } else {
          setMessage("");
        }
      },
      {
        recover: () => {
          setError(
            "L’installation de la recherche locale a échoué. Vérifiez que les fichiers de la recherche locale sont bien présents sur cet ordinateur."
          );
        },
        cleanup: () => {
          setBusy(false);
        },
      }
    );
  };

  const dictate = async () => {
    if (dictation.phase === "listening") {
      await dictation.stop();
    } else {
      try {
        await dictation.start(await getLocalModels(), "fr");
      } catch {
        setError("La dictée n’a pas pu démarrer.");
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Passage copié dans le presse-papier");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetResults = () => {
    active.current?.abort();
    setLastRun(null);
    setResults([]);
    setMessage("");
    setError("");
  };

  const locked = busy || dictation.busy;
  const listening = dictation.phase === "listening";
  const filterSummary = [
    audience === "all" || !patientId ? "Tous les patients" : "Ce dossier",
    SOURCES.find((item) => item.key === type)?.label,
    type === "soap" && section !== "all"
      ? SECTIONS.find((item) => item.key === section)?.label
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center text-foreground">
        <Search className="size-5 text-muted-foreground" />
        <div className="space-y-1">
          <h4 className="t-14 font-medium">Recherche dans les dossiers</h4>
          <p className="t-12 max-w-[300px] text-muted-foreground">
            Elle fonctionne entièrement sur cet ordinateur, sans connexion
            internet.
          </p>
        </div>
        <Button
          className="gap-2"
          disabled={locked}
          onClick={() => void install()}
          size="sm"
        >
          {busy ? <CircleNotch className="size-3.5 animate-spin" /> : null}
          Installer la recherche locale
        </Button>
        {error && (
          <p className="t-12 text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2.5 overflow-hidden text-foreground">
      <form
        className="flex shrink-0 items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!locked) {
            void run(false);
          }
        }}
      >
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <Input
            aria-label="Rechercher dans les dossiers"
            className="t-13 h-9 pr-16 pl-9"
            disabled={locked}
            onChange={(event) => {
              setQuery(event.target.value);
              setResults([]);
            }}
            placeholder={
              audience === "all" || !patientId
                ? "Symptôme, pathologie, traitement…"
                : "Observation, antécédent, examen…"
            }
            value={query}
          />
          <div className="absolute right-1 flex items-center">
            {query && !locked && (
              <button
                aria-label="Effacer la recherche"
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setQuery("");
                  resetResults();
                }}
                type="button"
              >
                <X className="size-3.5" />
              </button>
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    aria-label={
                      listening ? "Arrêter la dictée" : "Dicter la recherche"
                    }
                    className={
                      listening
                        ? "grid size-7 place-items-center rounded-md bg-destructive text-white"
                        : "grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                    }
                    disabled={busy || (dictation.busy && !listening)}
                    onClick={() => void dictate()}
                    type="button"
                  />
                }
              >
                {listening ? (
                  <Stop className="size-3.5 animate-pulse" />
                ) : (
                  <Microphone className="size-3.5" />
                )}
              </TooltipTrigger>
              <TooltipContent>
                {listening ? "Arrêter la dictée" : "Dicter"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <Button
          className="t-12 h-9 shrink-0 px-3"
          disabled={locked || !query.trim()}
          size="sm"
          type="submit"
        >
          Rechercher
        </Button>
      </form>

      <div className="flex shrink-0 items-center justify-between gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`Filtres : ${filterSummary}`}
                className="t-12 -ml-1.5 h-7 min-w-0 gap-1 px-1.5 font-normal text-muted-foreground hover:text-foreground"
                disabled={locked}
                size="xs"
                variant="ghost"
              >
                <span className="truncate">{filterSummary}</span>
                <ChevronDown className="size-3 shrink-0" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel>Rechercher dans</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              onValueChange={(value) => {
                setAudience(value as "patient" | "all");
                resetResults();
              }}
              value={patientId ? audience : "all"}
            >
              <DropdownMenuRadioItem
                className="t-12"
                disabled={!patientId}
                value="patient"
              >
                Ce dossier patient
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem className="t-12" value="all">
                Tous les patients
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Source</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              onValueChange={(value) => {
                const source = (value ?? "all") as SourceType | "all";
                setType(source);
                setSection(
                  source === "soap" || source === "all" ? "all" : source
                );
                setResults([]);
              }}
              value={type}
            >
              {SOURCES.map((item) => (
                <DropdownMenuRadioItem
                  className="t-12"
                  key={item.key}
                  value={item.key}
                >
                  {item.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {type === "soap" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Rubrique SOAP</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  onValueChange={(value) => {
                    setSection((value ?? "all") as SearchSection | "all");
                    setResults([]);
                  }}
                  value={section}
                >
                  {SECTIONS.map((item) => (
                    <DropdownMenuRadioItem
                      className="t-12"
                      key={item.key}
                      value={item.key}
                    >
                      {item.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="t-12 gap-2"
              onClick={() => void run(true)}
            >
              <RefreshCw className="size-3.5" />
              Actualiser l’index
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!lastRun && (busy || dictation.busy) ? (
          <span
            className="t-12 flex min-w-0 items-center gap-1.5 text-muted-foreground"
            role="status"
          >
            <CircleNotch className="size-3 shrink-0 animate-spin" />
            <span className="assistant-thinking-text truncate">
              {dictation.busy ? dictation.progress.message : message}
            </span>
          </span>
        ) : (
          !lastRun &&
          message &&
          !error && (
            <span className="t-12 truncate text-muted-foreground" role="status">
              {message}
            </span>
          )
        )}
      </div>

      {lastRun && (busy || message || error) && (
        <ToolCallBlock
          className="shrink-0"
          data={{
            id: String(lastRun.id),
            name: lastRun.name,
            summary: message,
            status: busy ? "running" : error ? "error" : "success",
            durationMs: lastRun.durationMs,
            details: searchedQuery
              ? [
                  { label: "Recherche", value: searchedQuery },
                  { label: "Dans", value: filterSummary },
                ]
              : undefined,
            error: error || undefined,
          }}
        />
      )}

      {error && (
        <div
          className="t-12 shrink-0 rounded-lg bg-destructive/10 px-3 py-2 text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      <CoverageNotice coverage={coverage} />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {results.length === 0 && unreviewed.length === 0 && !busy && !error && (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <p className="t-12 max-w-[320px] text-muted-foreground">
              {query.trim()
                ? "Aucun passage trouvé. Essayez un synonyme, une reformulation ou élargissez les filtres."
                : "Retrouvez le passage utile dans les notes, documents et protocoles validés : symptômes, pathologies, molécules ou synonymes."}
            </p>
            {!query.trim() && (
              <PromptSuggestions
                className="items-center"
                data={SUGGESTED_QUERIES.map((suggested) => ({
                  id: suggested,
                  title: suggested,
                }))}
                heading="Suggestions"
                onSelect={(_, prompt) => {
                  setQuery(prompt);
                  void run(false, prompt);
                }}
                variant="chips"
              />
            )}
          </div>
        )}

        {results.length > 0 && (
          <SourceList
            heading={`${results.length} passage${results.length > 1 ? "s" : ""} trouvé${results.length > 1 ? "s" : ""}`}
            sources={results.map((result) => {
              const uniqueKey = `${result.sourceType}-${result.sourceId}-${result.section}-${result.chunkIndex ?? 0}`;
              const passage = bestPassage(result.text, searchedQuery);
              return {
                id: uniqueKey,
                group:
                  SOURCES.find((item) => item.key === result.sourceType)
                    ?.label ?? "Source",
                title:
                  (audience === "all" || !patientId) && result.patientName
                    ? result.patientName
                    : (SECTION_LABELS[result.section] ?? result.section),
                tag: resultTag(
                  result,
                  (audience === "all" || !patientId) && !!result.patientName
                ),
                passage: <Passage query={searchedQuery} text={passage} />,
                actions: (
                  <>
                    <ActionButton
                      aria-label="Copier le passage"
                      icon={copiedId === uniqueKey ? CheckIcon : CopyIcon}
                      onClick={() => handleCopy(passage, uniqueKey)}
                      variant="quiet"
                    >
                      {copiedId === uniqueKey ? "Copié" : "Copier"}
                    </ActionButton>
                    {onInsertExcerpt && (
                      <ActionButton
                        aria-label="Insérer le passage dans le dossier"
                        icon={PlusIcon}
                        onClick={() => {
                          onInsertExcerpt(passage, result.section);
                          toast.success("Passage inséré dans le dossier");
                        }}
                        variant="quiet"
                      >
                        Insérer
                      </ActionButton>
                    )}
                  </>
                ),
              };
            })}
            subtitle={searchedQuery ? `Pour « ${searchedQuery} »` : undefined}
          />
        )}

        {unreviewed.length > 0 && (
          <SourceList
            heading={`${plural(unreviewed.length, "passage")} dans des notes non validées`}
            sources={unreviewed.map((match) => {
              const uniqueKey = `unreviewed-${match.sourceType}-${match.sourceId}-${match.section}`;
              const passage = bestPassage(match.text, searchedQuery);
              return {
                id: uniqueKey,
                group:
                  SOURCES.find((item) => item.key === match.sourceType)
                    ?.label ?? "Source",
                title: SECTION_LABELS[match.section] ?? match.section,
                tag: match.reason,
                passage: <Passage query={searchedQuery} text={passage} />,
                actions: (
                  <ActionButton
                    aria-label="Copier le passage"
                    icon={copiedId === uniqueKey ? CheckIcon : CopyIcon}
                    onClick={() => handleCopy(passage, uniqueKey)}
                    variant="quiet"
                  >
                    {copiedId === uniqueKey ? "Copié" : "Copier"}
                  </ActionButton>
                ),
              };
            })}
            subtitle="Trouvés par leurs mots, comme dans la barre de recherche. Validées, ces notes entreront aussi dans la recherche par le sens."
          />
        )}
      </div>
    </div>
  );
}
