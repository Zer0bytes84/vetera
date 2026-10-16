import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import {
  Check,
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
import "./assistant-thinking.css";

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

export interface PatientDocumentSearchProps {
  patientId?: string;
  onInsertExcerpt?: (excerpt: string, section?: SearchSection) => void;
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
  const [type, setType] = useState<SourceType | "all">("all");
  const [section, setSection] = useState<SearchSection | "all">("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [results, setResults] = useState<
    Array<
      SearchChunk & {
        patientName?: string;
        score: number;
        match?: "text" | "semantic";
        vector?: number[];
        embedding?: string;
      }
    >
  >([]);
  const active = useRef<AbortController | null>(null);

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
    setMessage(indexOnly ? "Indexation des documents…" : "Recherche clinique en cours…");

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
          setMessage(
            found.length
              ? audience === "all"
                ? `${found.length} cas similaires trouvés dans l’ensemble des dossiers.`
                : `${found.length} extraits pertinents trouvés dans ce dossier.`
              : "Aucun extrait validé suffisamment proche pour cette recherche.",
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
      }
    }
  };

  const install = async () => {
    setBusy(true);
    setError("");
    setMessage("Installation du modèle local EmbeddingGemma…");
    try {
      const models = await importLocalModel("embeddinggemma");
      if (models) {
        setReady(!!models.embeddingReady);
        setMessage("La recherche locale est prête.");
        toast.success("Modèle de recherche locale configuré.");
      } else {
        setMessage("");
      }
    } catch {
      setError(
        "L’installation de la recherche locale a échoué. Vérifiez la présence des fichiers dans ~/Desktop/embeddinggemma.",
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
    toast.success("Extrait copié dans le presse-papier");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const locked = busy || dictation.busy;

  const getSectionLabel = (sec: string) => {
    switch (sec) {
      case "subjective":
        return "S · Motif & Anamnèse";
      case "objective":
        return "O · Examen clinique";
      case "assessment":
        return "A · Évaluation";
      case "plan":
        return "P · Plan de soins";
      case "consultation":
        return "Consultation";
      case "patient":
        return "Fiche Patient";
      case "product":
        return "Pharmacie & Stock";
      case "document":
        return "Document clinique";
      case "protocol":
        return "Protocole";
      default:
        return sec;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden text-foreground">
      {/* Scope Selector */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 pb-3">
        <Tabs
          value={audience}
          onValueChange={(val) => {
            active.current?.abort();
            setAudience(val as "patient" | "all");
            setResults([]);
            setMessage("");
            setError("");
          }}
          className="w-full"
        >
          <TabsList aria-label="Périmètre de recherche" className="grid w-full grid-cols-2">
            <TabsTrigger value="patient" disabled={locked || !patientId} className="text-[12px]">
              Ce dossier patient
            </TabsTrigger>
            <TabsTrigger value="all" disabled={locked} className="text-[12px]">
              Tous les patients
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!ready ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-6 text-center">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Sparkle className="size-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[14px] font-medium">Recherche sémantique locale</h4>
            <p className="text-[12px] text-muted-foreground">
              EmbeddingGemma fonctionne à 100% sur cet ordinateur sans connexion internet.
            </p>
          </div>
          <Button
            size="sm"
            disabled={locked}
            onClick={() => void install()}
            className="gap-2"
          >
            {busy ? <CircleNotch className="size-3.5 animate-spin" /> : null}
            Installer la recherche locale
          </Button>
        </div>
      ) : (
        <>
          {/* Search Input Bar */}
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="relative flex flex-1 items-center">
              <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
              <Input
                aria-label="Rechercher un cas similaire"
                placeholder={
                  audience === "all"
                    ? "Symptôme, pathologie, traitement (ex: toux, Metacam)…"
                    : "Observation passée, antécédent, examen…"
                }
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setResults([]);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !locked) {
                    event.preventDefault();
                    void run(false);
                  }
                }}
                disabled={locked}
                className="h-9 pl-9 pr-8 text-[13px]"
              />
              {query && !locked && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                    setMessage("");
                  }}
                  className="absolute right-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              variant={dictation.phase === "listening" ? "destructive" : "outline"}
              className="h-9 shrink-0 gap-1.5 px-2.5 text-[12px]"
              disabled={busy || (dictation.busy && dictation.phase !== "listening")}
              onClick={() => void dictate()}
              aria-label={dictation.phase === "listening" ? "Arrêter la dictée" : "Dicter la recherche"}
            >
              {dictation.phase === "listening" ? (
                <>
                  <Stop className="size-3.5 animate-pulse text-white" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Microphone className="size-3.5" />
                  <span className="hidden sm:inline">Dicter</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={locked || !query.trim()}
              onClick={() => void run(false)}
              className="h-9 shrink-0 px-3 text-[12px]"
            >
              Rechercher
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Select
                value={type}
                onValueChange={(value) => {
                  const source = (value ?? "all") as SourceType | "all";
                  setType(source);
                  setSection(source === "soap" ? "all" : source === "all" ? "all" : source);
                  setResults([]);
                }}
                disabled={locked}
              >
                <SelectTrigger className="h-7 w-auto text-[12px]" aria-label="Source">
                  <SelectValue>
                    {type === "all"
                      ? "Toutes les sources"
                      : type === "soap"
                        ? "Consultations SOAP"
                        : type === "consultation"
                          ? "Consultations"
                          : type === "patient"
                            ? "Fiches Patients"
                            : type === "protocol"
                              ? "Protocoles validés"
                              : type === "product"
                                ? "Pharmacie & Stock"
                                : "Documents validés"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sources</SelectItem>
                  <SelectItem value="soap">Consultations SOAP</SelectItem>
                  <SelectItem value="consultation">Consultations</SelectItem>
                  <SelectItem value="patient">Fiches Patients</SelectItem>
                  <SelectItem value="document">Documents validés</SelectItem>
                  <SelectItem value="protocol">Protocoles validés</SelectItem>
                  <SelectItem value="product">Pharmacie & Stock</SelectItem>
                </SelectContent>
              </Select>

              {type === "soap" && (
                <Select
                  value={section}
                  onValueChange={(value) => {
                    setSection((value ?? "all") as SearchSection | "all");
                    setResults([]);
                  }}
                  disabled={locked}
                >
                  <SelectTrigger className="h-7 w-auto text-[12px]" aria-label="Rubrique SOAP">
                    <SelectValue>
                      {SECTIONS.find((item) => item.key === section)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((item) => (
                      <SelectItem key={item.key} value={item.key}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button
              size="xs"
              variant="ghost"
              disabled={locked}
              onClick={() => void run(true)}
              className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              title="Réindexer les extraits validés dans SQLite"
            >
              <RefreshCw className="size-3" />
              <span>Actualiser l’index</span>
            </Button>
          </div>

          {/* Status & Feedback */}
          {dictation.busy && (
            <Marker role="status" className="shrink-0 text-[12px]">
              <MarkerIcon>
                <CircleNotch className="size-3.5 animate-spin" />
              </MarkerIcon>
              <MarkerContent>
                <span className="assistant-thinking-text">
                  {dictation.progress.message}
                </span>
              </MarkerContent>
            </Marker>
          )}

          {busy && (
            <Marker role="status" className="shrink-0 text-[12px]">
              <MarkerIcon>
                <CircleNotch className="size-3.5 animate-spin" />
              </MarkerIcon>
              <MarkerContent>
                <span className="assistant-thinking-text">{message}</span>
              </MarkerContent>
            </Marker>
          )}

          {error && (
            <div
              role="alert"
              className="shrink-0 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-[12px] text-destructive"
            >
              {error}
            </div>
          )}

          {!busy && message && !error && (
            <p role="status" className="shrink-0 text-[12px] text-muted-foreground">
              {message}
            </p>
          )}

          {/* Results Area */}
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
            {results.length === 0 && !busy && !error && (
              <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                <div className="rounded-full bg-muted/60 p-3 text-muted-foreground">
                  <Search className="size-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-foreground">
                    {query.trim()
                      ? "Aucun résultat trouvé"
                      : "Recherche clinique intelligente"}
                  </p>
                  <p className="max-w-[320px] text-[12px] text-muted-foreground">
                    {query.trim()
                      ? "Essayez une reformulation, un synonyme ou élargissez le filtre de rubrique."
                      : "Retrouvez des cas similaires par similarité sémantique, synonymes DCI ou symptômes."}
                  </p>
                </div>

                {!query.trim() && (
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                    {SUGGESTED_QUERIES.map((suggested) => (
                      <button
                        key={suggested}
                        type="button"
                        onClick={() => {
                          setQuery(suggested);
                          void run(false, suggested);
                        }}
                        className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground"
                      >
                        {suggested}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {results.map((result) => {
              const uniqueKey = `${result.sourceType}-${result.sourceId}-${result.section}-${result.chunkIndex ?? 0}`;
              const scorePercent = Math.min(100, Math.round(result.score * 100));

              return (
                <div
                  key={uniqueKey}
                  className="group relative flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3 shadow-xs transition-colors hover:border-border"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {audience === "all" && result.patientName && (
                        <span className="truncate rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
                          {result.patientName}
                        </span>
                      )}
                      <Badge
                        variant="secondary"
                        className="h-5 px-1.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {getSectionLabel(result.section)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                        {result.match === "text" ? "Terme retrouvé" : `${scorePercent} % de proximité`}
                      </span>
                    </div>
                  </div>

                  <p className="border-l-2 border-primary/40 pl-2.5 text-[12px] leading-relaxed text-foreground whitespace-pre-wrap">
                    {result.text}
                  </p>

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => handleCopy(result.text, uniqueKey)}
                      className="h-6 gap-1 px-2 text-[11px]"
                    >
                      {copiedId === uniqueKey ? (
                        <>
                          <Check className="size-3 text-emerald-500" />
                          <span className="text-emerald-500">Copié</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Copier</span>
                        </>
                      )}
                    </Button>

                    {onInsertExcerpt && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          onInsertExcerpt(result.text, result.section);
                          toast.success("Extrait inséré dans le dossier");
                        }}
                        className="h-6 gap-1 px-2 text-[11px]"
                      >
                        <Plus className="size-3" />
                        <span>Insérer</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
