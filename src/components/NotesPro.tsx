import { formatDisplayText } from "@/utils/display-format";
import {
  Bookmark01Icon,
  CheckmarkCircle02Icon,
  CopyIcon,
  Delete01Icon,
  DownloadIcon,
  EditIcon,
  EyeIcon,
  File01Icon,
  MoreVerticalIcon,
  SearchIcon,
  StarIcon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { BookOpen, Check, ChevronDown, Pin, Star } from "@/lib/icons";
import { AssistantBrandAvatar } from "@/modules/consultations/components/assistant-brand-avatar";
import type React from "react";
import { useCreationRequest } from "@/modules/shell/model/creation-request";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@/components/Editor";
import { DocumentsTable } from "@/components/documents-table";
import { Panel, Shell } from "@/components/ui/surface";
import { ArrowLeft } from "lucide-react";
import MotivationalHeader from "@/components/MotivationalHeader";
import { useListCursor } from "@/hooks/useListCursor";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useNotesRepository, usePatientsRepository } from "@/data/repositories";
import type { Note, Patient } from "@/types/db";

const DocumentsWorkspace = lazy(() => import("@/modules/documents/components/documents-workspace"));

// Utils
const normalizeDate = (dateInput: any): Date =>
  dateInput
    ? dateInput instanceof Date
      ? dateInput
      : new Date(dateInput)
    : new Date();


const formatFullDate = (dateInput: any) => {
  if (!dateInput) {
    return "";
  }
  return normalizeDate(dateInput).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Types
type FilterType = "all" | "favorites" | "recent" | "pinned";

function PatientPicker({
  kind,
  onSelect,
  patients,
  value,
}: {
  kind: "filter" | "link";
  onSelect: (patientId: string) => void;
  patients: Patient[];
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = patients.find((patient) => patient.id === value);
  const results = patients
    .filter((patient) => `${patient.name} ${patient.species} ${patient.breed ?? ""}`.toLocaleLowerCase("fr").includes(query.trim().toLocaleLowerCase("fr")))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const isFilter = kind === "filter";
  const emptyLabel = isFilter ? "Tous les dossiers" : "Aucun dossier";

  const select = (patientId: string) => {
    onSelect(patientId);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label={isFilter ? "Afficher les documents d’un patient" : "Rattacher la note à un dossier patient"}
            className="h-8 min-w-[160px] max-w-[260px] gap-1.5 rounded-lg border-0 bg-transparent px-2 text-xs font-medium text-foreground shadow-none hover:bg-muted dark:text-foreground dark:hover:bg-white/10"
            size="sm"
            type="button"
            variant="ghost"
          />
        }
      >
        <span className="shrink-0 text-muted-foreground dark:text-muted-foreground">{isFilter ? "Afficher" : "Rattacher"}</span>
        <span className="min-w-0 truncate">{selected?.name ?? emptyLabel}</span>
        <ChevronDown aria-hidden="true" className="size-3.5 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(320px,calc(100vw-32px))] gap-0 rounded-xl border border-border bg-white p-1.5 shadow-[0_14px_38px_-18px_rgba(25,47,29,0.3)] dark:border-white/10 dark:bg-muted" sideOffset={7}>
        <div className="px-2.5 pt-2 pb-2.5">
          <p className="text-xs font-semibold text-foreground dark:text-foreground">{isFilter ? "Afficher les documents de" : "Rattacher cette note à"}</p>
          <p className="mt-0.5 t-12 leading-4 text-muted-foreground dark:text-muted-foreground">{isFilter ? "Ce choix filtre la bibliothèque sans modifier les notes." : "La note sera enregistrée dans le dossier choisi."}</p>
        </div>
        <div className="relative px-1 pb-1.5">
          <HugeiconsIcon aria-hidden="true" className="absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground" icon={SearchIcon} strokeWidth={1.5} />
          <Input aria-label="Rechercher un patient" autoFocus className="h-9 rounded-lg border-border bg-card pl-8 text-xs dark:border-white/10 dark:bg-card" onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un patient…" value={query} />
        </div>
        <div className="max-h-60 overflow-y-auto overscroll-contain py-0.5">
          {!query && <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:text-foreground dark:hover:bg-white/10" onClick={() => select("")} type="button"><span className="min-w-0 flex-1">{emptyLabel}</span>{!value && <Check aria-hidden="true" className="size-3.5" />}</button>}
          {results.map((patient) => (
            <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/10" key={patient.id} onClick={() => select(patient.id)} type="button">
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-foreground dark:text-foreground">{patient.name}</span><span className="block truncate t-12 text-muted-foreground dark:text-muted-foreground">{patient.species}{patient.breed ? ` · ${patient.breed}` : ""}</span></span>
              {value === patient.id && <Check aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground dark:text-muted-foreground" />}
            </button>
          ))}
          {results.length === 0 && <p className="px-2.5 py-5 text-center text-xs text-muted-foreground dark:text-muted-foreground">Aucun patient trouvé</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const NotesPro: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    data: notes = [],
    createEmptyNote,
    update: updateNote,
    remove: removeNote,
  } = useNotesRepository();
  const { data: patients = [] } = usePatientsRepository();

  // State
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<"library" | "assistant">("library");
  const [searchTerm, setSearchTerm] = useState("");
  // The library follows the shared list cursor: ↑ ↓ move, Enter opens the note.
  const libraryRef = useListCursor({ storageKey: "documents" });
  const [filter, setFilter] = useState<FilterType>("all");
  const [patientFilter, setPatientFilter] = useState(() => sessionStorage.getItem("documents:open-patient") ?? "");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  // The edit still waiting to be written, kept with the note it belongs to.
  const pendingSaveRef = useRef<{ id: string; title: string; content: string } | null>(null);
  const [assistantNoteId, setAssistantNoteId] = useState("");
  const requestedNoteIdRef = useRef<string | null>(sessionStorage.getItem("documents:open-note"));
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState({
    loading: false,
    ready: false,
    initializing: false,
  });

  useEffect(() => {
    sessionStorage.removeItem("documents:open-patient");
    sessionStorage.removeItem("documents:open-note");
  }, []);

  useEffect(() => {
    const requestedId = requestedNoteIdRef.current;
    const note = notes.find((entry) => entry.id === requestedId);
    if (!note) return;
    requestedNoteIdRef.current = null;
    setSelectedNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setLastSaved(new Date(note.updatedAt));
  }, [notes]);

  const patientLookup = useMemo(() => new Map(patients.map((patient) => [patient.id, patient])), [patients]);

  // Filter logic
  const filteredNotes = useMemo(() => {
    let result = notes.filter((n) => n.userId === currentUser?.uid);

    if (filter === "favorites") {
      result = result.filter((n) => n.isFavorite);
    } else if (filter === "recent") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      result = result.filter((n) => new Date(n.updatedAt) > oneWeekAgo);
    } else if (filter === "pinned") {
      result = result.filter((n) => (n as any).isPinned);
    }

    if (patientFilter) result = result.filter((n) => n.patientId === patientFilter);

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLocaleLowerCase("fr");
      result = result.filter(
        (n) => {
          const patient = n.patientId ? patientLookup.get(n.patientId) : null;
          return `${n.title} ${n.content} ${patient?.name ?? ""} ${patient?.species ?? ""} ${patient?.breed ?? ""}`
            .toLocaleLowerCase("fr")
            .includes(term);
        }
      );
    }

    return result.sort(
      (a, b) =>
        normalizeDate(b.updatedAt).getTime() -
        normalizeDate(a.updatedAt).getTime()
    );
  }, [notes, filter, patientFilter, searchTerm, currentUser, patientLookup]);


  const activeNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId),
    [notes, selectedNoteId]
  );

  // Select note
  const handleSelectNote = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      setSelectedNoteId(noteId);
      setTitle(note.title);
      setContent(note.content);
      setLastSaved(new Date(note.updatedAt));
      setSaveFailed(false);
    }
  };

  // Auto-save. The waiting edit is kept with the id of its note, so it can
  // still be written after the editor moved to another note or closed.
  const flushSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;
    let saved = false;
    try {
      saved = await updateNote(pending.id, { title: pending.title, content: pending.content });
    } catch {
      saved = false;
    }
    if (!saved) {
      // Keep the edit: the next keystroke or « Réessayer » writes it again.
      if (!pendingSaveRef.current) pendingSaveRef.current = pending;
      setIsSaving(false);
      setSaveFailed(true);
      return;
    }
    if (pendingSaveRef.current) return; // a newer edit is already waiting
    setIsSaving(false);
    setSaveFailed(false);
    setLastSaved(new Date());
  }, [updateNote]);

  // Leaving a note (another note, the library, another page) writes the waiting edit at once.
  useEffect(() => () => void flushSave(), [selectedNoteId, flushSave]);

  const triggerSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (!selectedNoteId) {
        return;
      }
      if (pendingSaveRef.current && pendingSaveRef.current.id !== selectedNoteId) {
        void flushSave();
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      pendingSaveRef.current = { id: selectedNoteId, title: newTitle, content: newContent };
      setIsSaving(true);
      setSaveFailed(false);
      saveTimeoutRef.current = setTimeout(() => void flushSave(), 500);
    },
    [selectedNoteId, flushSave]
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    triggerSave(newTitle, content);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    triggerSave(title, newContent);
  };

  // Create note
  const handleCreateNote = async () => {
    if (!currentUser) {
      return;
    }
    const newNote = await createEmptyNote(currentUser.uid);
    if (newNote) {
      if (patientFilter) await updateNote(newNote.id, { patientId: patientFilter });
      setSelectedNoteId(newNote.id);
      setTitle("");
      setContent("");
      setLastSaved(new Date());
      setIsPreviewMode(false);
      setSearchTerm("");
      setFilter("all");
    }
  };
  useCreationRequest("document", () => void handleCreateNote());

  // Send a note to the documents assistant, which reads it as its source.
  const handleOpenAssistant = (note: Note) => {
    void flushSave();
    if (note.patientId) {
      setPatientFilter(note.patientId);
    }
    setAssistantNoteId(note.id);
    setSelectedNoteId(null);
    setWorkspaceMode("assistant");
  };

  const handleDuplicateNote = async (note: Note) => {
    if (!currentUser) return;
    const sourceIsOpen = note.id === selectedNoteId;
    const copiedTitle = `${(sourceIsOpen ? title : note.title) || "Sans titre"} · copie`;
    const copiedContent = sourceIsOpen ? content : note.content;
    const created = await createEmptyNote(currentUser.uid);
    if (!created) return;
    await updateNote(created.id, {
      title: copiedTitle,
      content: copiedContent,
      patientId: note.patientId ?? null,
    });
    setPatientFilter(note.patientId ?? "");
    setSearchTerm("");
    setFilter("all");
    setSelectedNoteId(created.id);
    setTitle(copiedTitle);
    setContent(copiedContent);
    setLastSaved(new Date());
    setIsPreviewMode(false);
  };

  // Toggle favorite
  const toggleFavorite = async (note: Note, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await updateNote(note.id, { isFavorite: !note.isFavorite });
  };

  // Toggle pin
  const togglePin = async (note: Note, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await updateNote(note.id, { isPinned: !(note as any).isPinned } as any);
  };

  // Delete note
  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm("Supprimer cette note ?")) {
      if (pendingSaveRef.current?.id === id) pendingSaveRef.current = null;
      await removeNote(id);
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
        setTitle("");
        setContent("");
      }
    }
  };

  // Export note
  const handleExportNote = (
    format: "md" | "txt",
    noteToExport: Note | null | undefined = activeNote
  ) => {
    if (!noteToExport) {
      return;
    }
    let exportContent = "";
    if (format === "md") {
      exportContent = `# ${noteToExport.title}\n\n${noteToExport.content}`;
    } else {
      exportContent = `${noteToExport.title}\n\n${noteToExport.content}`;
    }
    const blob = new Blob([exportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${noteToExport.title}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy note
  const handleCopyNote = async () => {
    if (!activeNote) {
      return;
    }
    await navigator.clipboard.writeText(activeNote.content);
  };

  // Word count
  const wordCount = useMemo(() => {
    const text = content.replace(/<[^>]*>?/gm, "");
    return text.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);

  // The assistant, as a quiet icon beside the « + » of the list. No templates: a page starts blank.
  const secondaryPages = (
          <Button aria-label={workspaceMode === "assistant" ? "Bibliothèque" : "Assistant documents"} className="rounded-full" size="icon-sm" style={{ borderRadius: 999 }} title={workspaceMode === "assistant" ? "Bibliothèque" : "Assistant documents"} variant="outline" onClick={() => { setAssistantNoteId(""); setWorkspaceMode(workspaceMode === "assistant" ? "library" : "assistant"); }}>{workspaceMode === "assistant" ? <BookOpen className="size-4" /> : <AssistantBrandAvatar size={18} />}</Button>
  );

  return (
    <div className="documents-workspace dashboard-stage flex h-full min-h-0 w-full min-w-0 flex-col gap-5 overflow-hidden px-4 pb-0 lg:px-6">
      <MotivationalHeader section="notes" title="Documents" subtitle="notes cliniques" />

      {/* The page's actions sit in the figures band of the library; elsewhere (assistant, templates, an open note) there is no band, so they keep a slim row. */}
      {workspaceMode !== "library" && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button className="gap-1.5 rounded-full" onClick={() => { setAssistantNoteId(""); setWorkspaceMode("library"); }} size="sm" type="button" variant="ghost">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Documents
          </Button>
          <div className="flex items-center gap-2">{secondaryPages}</div>
        </div>
      )}

      {/* Main workspace */}
      {workspaceMode !== "library" ? (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-t-xl border border-b-0 border-border bg-card">
          <Suspense fallback={<p role="status" className="p-6 text-sm text-muted-foreground">Ouverture des documents…</p>}>
            <DocumentsWorkspace initialNoteId={assistantNoteId} initialPatientId={patientFilter} />
          </Suspense>
        </div>
      ) : !(selectedNoteId && activeNote) ? (
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-8" ref={libraryRef}>
          <DocumentsTable
            filter={filter}
            headerActions={secondaryPages}
            onCreate={() => void handleCreateNote()}
            filters={<PatientPicker kind="filter" onSelect={setPatientFilter} patients={patients} value={patientFilter} />}
            notes={filteredNotes}
            onDelete={handleDeleteNote}
            onDuplicate={(note) => void handleDuplicateNote(note)}
            onExport={(note) => handleExportNote("md", note)}
            onFilter={setFilter}
            onOpen={handleSelectNote}
            onOpenAssistant={handleOpenAssistant}
            onToggleFavorite={toggleFavorite}
            onTogglePin={togglePin}
            patientName={(id) => (id ? patientLookup.get(id)?.name ?? "Dossier patient" : "Cabinet")}
          />
        </div>
      ) : (
      <Shell className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">

        {/* ── EDITOR AREA ── */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {selectedNoteId && activeNote ? (
            <div className="flex h-full min-h-0 flex-col">
              {/* One slim bar: the way back, the folder, the save state, one menu. */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Button
                    className="gap-1.5 rounded-full"
                    onClick={() => setSelectedNoteId(null)}
                    size="sm"
                    title="Retour à la liste des documents"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Documents
                  </Button>

                  {/* Attach the note to a patient folder, from the bar itself. */}
                  <PatientPicker
                    kind="link"
                    onSelect={(patientId) => {
                      void updateNote(activeNote.id, { patientId: patientId || null });
                      if (patientFilter && patientFilter !== patientId) setPatientFilter(patientId);
                    }}
                    patients={patients}
                    value={activeNote.patientId ?? ""}
                  />

                  {isPreviewMode && (
                    <Button className="h-8 gap-1.5 rounded-full text-xs" onClick={() => setIsPreviewMode(false)} size="sm" type="button" variant="outline">
                      <HugeiconsIcon className="size-3" icon={EditIcon} strokeWidth={1.5} />
                      Revenir à l’édition
                    </Button>
                  )}

                  {/* Save status */}
                  {saveFailed ? (
                    <span role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                      Non enregistré
                      <Button className="h-6 rounded-full px-2 text-xs" onClick={() => void flushSave()} size="sm" variant="outline">
                        Réessayer
                      </Button>
                    </span>
                  ) : isSaving ? (
                    <span className="flex items-center gap-1.5 text-xs text-foreground/70">
                      <span className="relative flex size-1.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
                      </span>
                      Enregistrement...
                    </span>
                  ) : lastSaved ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      <HugeiconsIcon
                        className="size-3"
                        icon={CheckmarkCircle02Icon} strokeWidth={1.5}
                      />
                      Sauvegardé
                    </span>
                  ) : null}
                  {!isPreviewMode && aiStatus.loading && (
                    <span aria-live="polite" className="ml-2 flex items-center gap-1.5 text-xs font-medium text-foreground dark:text-foreground">
                      <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Proposition en cours…
                    </span>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        aria-label="Plus d’actions pour cette note"
                        className="size-8 rounded-full text-foreground/70 hover:text-foreground"
                        size="icon-sm"
                        variant="ghost"
                      >
                        <HugeiconsIcon className="size-3.5" icon={MoreVerticalIcon} strokeWidth={1.5} />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => setIsPreviewMode((preview) => !preview)}>
                      <HugeiconsIcon className="mr-2 size-4" icon={isPreviewMode ? EditIcon : EyeIcon} strokeWidth={1.5} />
                      {isPreviewMode ? "Éditer" : "Aperçu"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => togglePin(activeNote)}>
                      <HugeiconsIcon className="mr-2 size-4" icon={Bookmark01Icon} strokeWidth={1.5} />
                      {(activeNote as any).isPinned ? "Désépingler" : "Épingler"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleFavorite(activeNote)}>
                      <HugeiconsIcon className="mr-2 size-4" icon={StarIcon} strokeWidth={1.5} />
                      {activeNote.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyNote}>
                      <HugeiconsIcon className="mr-2 size-4" icon={CopyIcon} strokeWidth={1.5} />
                      Copier le contenu
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => void handleDuplicateNote(activeNote)}>
                      <HugeiconsIcon className="mr-2 size-4" icon={CopyIcon} strokeWidth={1.5} />
                      Dupliquer la note
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenAssistant(activeNote)}>
                      <HugeiconsIcon className="mr-2 size-4" icon={File01Icon} strokeWidth={1.5} />
                      Ouvrir dans l'assistant
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExportNote("md")}>
                      <HugeiconsIcon className="mr-2 size-4" icon={DownloadIcon} strokeWidth={1.5} />
                      Exporter en Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportNote("txt")}>
                      <HugeiconsIcon className="mr-2 size-4" icon={DownloadIcon} strokeWidth={1.5} />
                      Exporter en Texte
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteNote(activeNote.id)}>
                      <HugeiconsIcon className="mr-2 size-4" icon={Delete01Icon} strokeWidth={1.5} />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Editor content area: the shell's inset panel, the column inside it. */}
              <Panel
                className="mx-[var(--card-frame)] mb-[var(--card-frame)] flex min-h-0 flex-1 flex-col overflow-hidden"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    editorInstance?.commands.focus("end");
                  }
                }}
              >
                <div
                  className="min-h-0 flex-1 cursor-text select-text overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      editorInstance?.commands.focus("end");
                    }
                  }}
                >
                  <div className="flex w-full flex-1 flex-col px-5 py-8 md:px-8 md:py-10">
                  {isPreviewMode ? (
                    <div className="document-rich-content prose prose-sm dark:prose-invert max-w-none overflow-x-auto">
                      <h1 className="font-heading text-2xl font-medium tracking-[-0.035em]">
                        {formatDisplayText(title)}
                      </h1>
                      <p className="mt-1 mb-6 text-foreground/70 text-xs">
                        {formatFullDate(activeNote.updatedAt)}
                      </p>
                      <div dangerouslySetInnerHTML={{ __html: content }} />
                    </div>
                  ) : (
                    <>
                      {/* Note title, with the editor's own tools at its right. */}
                      <div className="mb-2.5 flex items-start gap-3">
                        <input
                          aria-label="Titre du document"
                          className="min-w-0 flex-1 bg-transparent font-heading text-2xl font-medium leading-tight tracking-[-0.035em] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30 dark:text-foreground dark:placeholder:text-muted-foreground"
                          onChange={(e) => handleTitleChange(e.target.value)}
                          placeholder="Sans titre"
                          type="text"
                          value={formatDisplayText(title)}
                        />
                        <div className="flex shrink-0 items-center gap-1.5 pt-0.5" id="note-editor-toolbar-slot" />
                      </div>

                      {/* Meta line below title */}
                      <div className="mb-2 flex flex-wrap items-center gap-2.5">
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                          {formatFullDate(activeNote.updatedAt)}
                        </p>
                        {wordCount > 0 && (
                          <>
                            <span className="text-foreground/50">·</span>
                            <p className="text-xs text-muted-foreground tabular-nums dark:text-muted-foreground">
                              {wordCount} mots
                            </p>
                          </>
                        )}
                        {(activeNote as any).isPinned && (
                          <>
                            <span className="text-foreground/50">·</span>
                            <span className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                              <Pin className="size-2.5" />
                              Épinglée
                            </span>
                          </>
                        )}
                        {activeNote.isFavorite && (
                          <>
                            <span className="text-foreground/50">·</span>
                            <span className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                              <Star className="size-2.5 fill-current" />
                              Favori
                            </span>
                          </>
                        )}
                      </div>

                      {/* Rich text editor */}
                      <Editor
                        key={activeNote.id}
                        content={content}
                        onAiStatusChange={setAiStatus}
                        onEditorCreated={setEditorInstance}
                        onUpdate={handleContentChange}
                      />
                    </>
                  )}
                  </div>
                </div>
              </Panel>

            </div>
          ) : null}
        </main>
      </Shell>
      )}
    </div>
  );
};

export default NotesPro;
