import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Check,
  ChevronDown,
  CircleNotch,
  Copy,
  Microphone,
  Plus,
  RefreshCw,
  Search,
  Sparkle,
  Stop,
  X,
} from "@/lib/icons";
import { toast } from "sonner";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import { ToolCallBlock } from "@/components/ui/tool-call-block";
import { useLocalConsultationAi } from "../hooks/use-local-consultation-ai";
import { getLocalModels, importLocalModel } from "../local-ai/models";
import {
  indexPatientDocuments,
  indexAllPatientsDocuments,
  searchPatientDocuments,
  searchAllPatientsClinical,
} from "../local-ai/embedding-store";
import type {
  SearchChunk,
  SearchSection,
  SourceType,
} from "../local-ai/embedding-index";
import { bestPassage } from "../local-ai/passage-search";
import { highlightPassage } from "../local-ai/search-highlight";
import "./assistant-thinking.css";

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
};

export interface PatientDocumentSearchProps {
  patientId?: string;
  onInsertExcerpt?: (excerpt: string, section?: SearchSection) => void;
}

/** Passage with the query terms highlighted. */
function Passage({ text, query }: { text: string; query: string }) {
  return (
    <p className="line-clamp-6 t-13 leading-relaxed text-foreground whitespace-pre-wrap">
      {highlightPassage(text, query).map((segment, index) =>
        segment.hit ? (
          <mark
            key={index}
            className="rounded-[3px] bg-primary/12 px-0.5 text-foreground dark:bg-primary/25"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  );
}

export function PatientDocumentSearch({
  patientId,
  onInsertExcerpt,
}: PatientDocumentSearchProps) {
  const dictation = useLocalConsultationAi();
  const [audience, setAudience] = useState<"patient" | "all">(patientId ? "patient" : "all");
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
  // The last operation the assistant ran, shown as one folded row: what it did, how long it took, what it found.
  const [lastRun, setLastRun] = useState<{ id: number; name: string; startedAt: number; durationMs?: number } | null>(null);

  useEffect(() => {
    if (dictation.transcription) {
      setQuery(dictation.transcription);
      setResults([]);
      setMessage("Requête vocale transcrite. Vous pouvez la compléter.");
    }
  }, [dictation.transcription]);

  useEffect(() => {
    let alive = true;
    void getLocalModels()
      .then((models) => {
        if (alive) setReady(!!models.embeddingReady);
      })
      .catch(() => {});
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
          "Dossier modifié. La recherche réactualisera les sources validées.",
        );
      }
    };
    window.addEventListener("sqlite-row-saved", invalidate);
    return () => window.removeEventListener("sqlite-row-saved", invalidate);
  }, []);

  const run = async (indexOnly: boolean, forcedQuery?: string) => {
    const searchQuery = forcedQuery !== undefined ? forcedQuery : query;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    setResults([]);
    setMessage(indexOnly ? "Indexation des documents…" : "Recherche en cours…");
    const startedAt = Date.now();
    setLastRun({
      id: startedAt,
      name: indexOnly ? "Actualisation de l’index" : "Recherche dans les dossiers",
      startedAt,
    });

    try {
      if (indexOnly) {
        const count =
          audience === "all" || !patientId
            ? await indexAllPatientsDocuments(controller.signal, (event) =>
                setMessage(event.message),
              )
            : await indexPatientDocuments(
                patientId,
                controller.signal,
                (event) => setMessage(event.message),
              );
        if (!controller.signal.aborted) {
          setMessage(
            count
              ? `${count.toLocaleString("fr-FR")} extraits validés et indexés.`
              : "L’index des sources validées est à jour.",
          );
        }
      } else {
        if (!searchQuery.trim()) {
          setError("Veuillez saisir une recherche ou choisir une suggestion.");
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

        const filters = { sourceTypes: targetSources, sections: targetSections };
        const found =
          audience === "all" || !patientId
            ? await searchAllPatientsClinical(
                filters,
                searchQuery,
                controller.signal,
                (event) => setMessage(event.message),
              )
            : await searchPatientDocuments(
                {
                  patientId,
                  sourceTypes: targetSources.filter((t) =>
                    ["soap", "document", "protocol"].includes(t),
                  ) as SourceType[],
                  sections: targetSections.filter((s) =>
                    [
                      "subjective",
                      "objective",
                      "assessment",
                      "plan",
                      "document",
                      "protocol",
                    ].includes(s),
                  ) as SearchSection[],
                },
                searchQuery,
                controller.signal,
                (event) => setMessage(event.message),
              );

        if (!controller.signal.aborted) {
          setResults(found);
          setSearchedQuery(searchQuery);
          setMessage(
            found.length
              ? `${found.length} passage${found.length > 1 ? "s" : ""} trouvé${found.length > 1 ? "s" : ""}`
              : "Aucun passage validé suffisamment proche pour cette recherche.",
          );
        }
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(
          failure instanceof Error
            ? failure.message
            : "La recherche n’a pas abouti.",
        );
      }
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
        setLastRun((previous) =>
          previous && previous.startedAt === startedAt
            ? { ...previous, durationMs: Date.now() - startedAt }
            : previous,
        );
      }
    }
  };

  const install = async () => {
    setBusy(true);
    setError("");
    setMessage("Installation de la recherche locale…");
    try {
      const models = await importLocalModel("embeddinggemma");
      if (models) {
        setReady(!!models.embeddingReady);
        setMessage("La recherche locale est prête.");
        toast.success("Recherche locale configurée.");
      } else {
        setMessage("");
      }
    } catch {
      setError(
        "L’installation de la recherche locale a échoué. Vérifiez que les fichiers de la recherche locale sont bien présents sur cet ordinateur.",
      );
    } finally {
      setBusy(false);
    }
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

  if (!ready)
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center text-foreground">
        <Sparkle className="size-5 text-muted-foreground" />
        <div className="space-y-1">
          <h4 className="t-14 font-medium">Recherche dans les dossiers</h4>
          <p className="max-w-[300px] t-12 text-muted-foreground">
            Elle fonctionne entièrement sur cet ordinateur, sans connexion internet.
          </p>
        </div>
        <Button size="sm" disabled={locked} onClick={() => void install()} className="gap-2">
          {busy ? <CircleNotch className="size-3.5 animate-spin" /> : null}
          Installer la recherche locale
        </Button>
        {error && (
          <p role="alert" className="t-12 text-destructive">
            {error}
          </p>
        )}
      </div>
    );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2.5 overflow-hidden text-foreground">
      <form
        className="flex shrink-0 items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!locked) void run(false);
        }}
      >
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <Input
            aria-label="Rechercher dans les dossiers"
            placeholder={
              audience === "all" || !patientId
                ? "Symptôme, pathologie, traitement…"
                : "Observation, antécédent, examen…"
            }
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setResults([]);
            }}
            disabled={locked}
            className="h-9 pl-9 pr-16 t-13"
          />
          <div className="absolute right-1 flex items-center">
            {query && !locked && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => {
                  setQuery("");
                  resetResults();
                }}
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={listening ? "Arrêter la dictée" : "Dicter la recherche"}
                    disabled={busy || (dictation.busy && !listening)}
                    onClick={() => void dictate()}
                    className={
                      listening
                        ? "grid size-7 place-items-center rounded-md bg-destructive text-white"
                        : "grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                    }
                  />
                }
              >
                {listening ? (
                  <Stop className="size-3.5 animate-pulse" />
                ) : (
                  <Microphone className="size-3.5" />
                )}
              </TooltipTrigger>
              <TooltipContent>{listening ? "Arrêter la dictée" : "Dicter"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={locked || !query.trim()}
          className="h-9 shrink-0 px-3 t-12"
        >
          Rechercher
        </Button>
      </form>

      <div className="flex shrink-0 items-center justify-between gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="xs"
                disabled={locked}
                className="-ml-1.5 h-7 min-w-0 gap-1 px-1.5 t-12 font-normal text-muted-foreground hover:text-foreground"
                aria-label={`Filtres : ${filterSummary}`}
              >
                <span className="truncate">{filterSummary}</span>
                <ChevronDown className="size-3 shrink-0" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel>Rechercher dans</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={patientId ? audience : "all"}
              onValueChange={(value) => {
                setAudience(value as "patient" | "all");
                resetResults();
              }}
            >
              <DropdownMenuRadioItem value="patient" disabled={!patientId} className="t-12">
                Ce dossier patient
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="all" className="t-12">
                Tous les patients
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Source</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={type}
              onValueChange={(value) => {
                const source = (value ?? "all") as SourceType | "all";
                setType(source);
                setSection(source === "soap" || source === "all" ? "all" : source);
                setResults([]);
              }}
            >
              {SOURCES.map((item) => (
                <DropdownMenuRadioItem key={item.key} value={item.key} className="t-12">
                  {item.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {type === "soap" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Rubrique SOAP</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={section}
                  onValueChange={(value) => {
                    setSection((value ?? "all") as SearchSection | "all");
                    setResults([]);
                  }}
                >
                  {SECTIONS.map((item) => (
                    <DropdownMenuRadioItem key={item.key} value={item.key} className="t-12">
                      {item.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 t-12" onClick={() => void run(true)}>
              <RefreshCw className="size-3.5" />
              Actualiser l’index
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!lastRun && (busy || dictation.busy) ? (
          <span role="status" className="flex min-w-0 items-center gap-1.5 t-12 text-muted-foreground">
            <CircleNotch className="size-3 shrink-0 animate-spin" />
            <span className="assistant-thinking-text truncate">
              {dictation.busy ? dictation.progress.message : message}
            </span>
          </span>
        ) : (
          !lastRun && message && !error && (
            <span role="status" className="truncate t-12 text-muted-foreground">
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
          role="alert"
          className="shrink-0 rounded-lg bg-destructive/10 px-3 py-2 t-12 text-destructive"
        >
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {results.length === 0 && !busy && !error && (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <p className="max-w-[320px] t-12 text-muted-foreground">
              {query.trim()
                ? "Aucun passage trouvé. Essayez un synonyme, une reformulation ou élargissez les filtres."
                : "Retrouvez le passage utile dans les notes, documents et protocoles validés : symptômes, pathologies, molécules ou synonymes."}
            </p>
            {!query.trim() && (
              <PromptSuggestions
                className="items-center"
                data={SUGGESTED_QUERIES.map((suggested) => ({ id: suggested, title: suggested }))}
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

        <ul className="divide-y divide-border/60">
          {results.map((result) => {
            const uniqueKey = `${result.sourceType}-${result.sourceId}-${result.section}-${result.chunkIndex ?? 0}`;
            const passage = bestPassage(result.text, searchedQuery);
            return (
              <li key={uniqueKey} className="group flex flex-col gap-1.5 py-3 first:pt-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate t-12 text-muted-foreground">
                    {(audience === "all" || !patientId) && result.patientName && (
                      <span className="font-medium text-foreground">{result.patientName} · </span>
                    )}
                    {SECTION_LABELS[result.section] ?? result.section}
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => handleCopy(passage, uniqueKey)}
                      className="h-6 gap-1 px-1.5 t-12 text-muted-foreground hover:text-foreground"
                      aria-label="Copier le passage"
                    >
                      {copiedId === uniqueKey ? (
                        <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                      <span>{copiedId === uniqueKey ? "Copié" : "Copier"}</span>
                    </Button>
                    {onInsertExcerpt && (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          onInsertExcerpt(passage, result.section);
                          toast.success("Passage inséré dans le dossier");
                        }}
                        className="h-6 gap-1 px-1.5 t-12 text-muted-foreground hover:text-foreground"
                        aria-label="Insérer le passage dans le dossier"
                      >
                        <Plus className="size-3" />
                        <span>Insérer</span>
                      </Button>
                    )}
                  </div>
                </div>
                <Passage text={passage} query={searchedQuery} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
