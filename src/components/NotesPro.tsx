import {
  Add01Icon,
  Bookmark01Icon,
  CheckmarkCircle02Icon,
  CopyIcon,
  Delete01Icon,
  DownloadIcon,
  EditIcon,
  EyeIcon,
  File01Icon,
  Folder01Icon,
  MoreVerticalIcon,
  Redo02Icon,
  SearchIcon,
  StarIcon,
  Undo02Icon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Check, ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Hash, Pin, Star, X } from "@/lib/icons";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@/components/Editor";
import { documentNoteTemplateOrder, documentNoteTemplates, type DocumentNoteTemplate } from "@/components/document-note-templates";
import MotivationalHeader from "@/components/MotivationalHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useNotesRepository, usePatientsRepository } from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { Note, Patient } from "@/types/db";

// Utils
const normalizeDate = (dateInput: any): Date =>
  dateInput
    ? dateInput instanceof Date
      ? dateInput
      : new Date(dateInput)
    : new Date();

const formatDate = (dateInput: any) => {
  if (!dateInput) {
    return "";
  }
  const date = normalizeDate(dateInput);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) {
    return "À l'instant";
  }
  if (minutes < 60) {
    return `Il y a ${minutes}min`;
  }
  if (hours < 24) {
    return `Il y a ${hours}h`;
  }
  if (days < 7) {
    return `Il y a ${days}j`;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
};

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
            className="h-8 max-w-[210px] gap-1.5 rounded-lg border-0 bg-transparent px-2 text-xs font-medium text-foreground shadow-none hover:bg-muted dark:text-foreground dark:hover:bg-white/10"
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
          <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground dark:text-muted-foreground">{isFilter ? "Ce choix filtre la bibliothèque sans modifier les notes." : "La note sera enregistrée dans le dossier choisi."}</p>
        </div>
        <div className="relative px-1 pb-1.5">
          <HugeiconsIcon aria-hidden="true" className="absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground" icon={SearchIcon} strokeWidth={1.5} />
          <Input aria-label="Rechercher un patient" autoFocus className="h-9 rounded-lg border-border bg-card pl-8 text-xs dark:border-white/10 dark:bg-card" onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un patient…" value={query} />
        </div>
        <div className="max-h-60 overflow-y-auto overscroll-contain py-0.5">
          {!query && <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:text-foreground dark:hover:bg-white/10" onClick={() => select("")} type="button"><span className="min-w-0 flex-1">{emptyLabel}</span>{!value && <Check aria-hidden="true" className="size-3.5" />}</button>}
          {results.map((patient) => (
            <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/10" key={patient.id} onClick={() => select(patient.id)} type="button">
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-foreground dark:text-foreground">{patient.name}</span><span className="block truncate text-[11px] text-muted-foreground dark:text-muted-foreground">{patient.species}{patient.breed ? ` · ${patient.breed}` : ""}</span></span>
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
    data: notes,
    createEmptyNote,
    update: updateNote,
    remove: removeNote,
  } = useNotesRepository();
  const { data: patients } = usePatientsRepository();

  // State
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [patientFilter, setPatientFilter] = useState(() => sessionStorage.getItem("documents:open-patient") ?? "");
  const [closedFolders, setClosedFolders] = useState<string[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const activePatient = patients.find((patient) => patient.id === patientFilter);
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

  const noteGroups = useMemo(() => {
    const groups: { key: string; label: string; notes: Note[]; patientId: string }[] = [];
    for (const note of filteredNotes) {
      const patientId = note.patientId ?? "";
      const key = patientId || "cabinet";
      const group = groups.find((entry) => entry.key === key);
      if (group) {
        group.notes.push(note);
      } else {
        groups.push({
          key,
          label: patientId ? patientLookup.get(patientId)?.name ?? "Dossier patient" : "Documents du cabinet",
          notes: [note],
          patientId,
        });
      }
    }

    return groups;
  }, [filteredNotes, patientLookup]);

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
    }
  };

  // Auto-save
  const triggerSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (!selectedNoteId) {
        return;
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setIsSaving(true);
      saveTimeoutRef.current = setTimeout(async () => {
        await updateNote(selectedNoteId, {
          title: newTitle,
          content: newContent,
        });
        setIsSaving(false);
        setLastSaved(new Date());
      }, 500);
    },
    [selectedNoteId, updateNote]
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
      setTitle("Nouvelle note");
      setContent("");
      setLastSaved(new Date());
      setIsPreviewMode(false);
      setSearchTerm("");
      setFilter("all");
    }
  };

  const handleCreateTemplate = async (kind: DocumentNoteTemplate, targetPatientId = patientFilter) => {
    if (!currentUser) return;
    const name = targetPatientId ? patientLookup.get(targetPatientId)?.name : undefined;
    const title = `${documentNoteTemplates[kind].title}${name ? ` · ${name}` : ""}`;
    const template = documentNoteTemplates[kind].content;
    const created = await createEmptyNote(currentUser.uid);
    if (!created) return;
    await updateNote(created.id, { title, content: template, patientId: targetPatientId || null });
    setPatientFilter(targetPatientId);
    setSearchTerm("");
    setFilter("all");
    setClosedFolders((current) => current.filter((key) => key !== (targetPatientId || "cabinet")));
    setSelectedNoteId(created.id);
    setTitle(title);
    setContent(template);
    setLastSaved(new Date());
    setIsPreviewMode(false);
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
    setClosedFolders((current) => current.filter((key) => key !== (note.patientId || "cabinet")));
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

  return (
    <div className="dashboard-stage flex h-full min-h-0 w-full min-w-0 flex-col gap-5 overflow-hidden px-4 pt-4 pb-0 md:pt-5 lg:px-6">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <MotivationalHeader section="notes" title="Documents" subtitle="Vos notes cliniques, reliées aux dossiers de vos patients." />
        </div>
        <div data-slot="page-header-actions" className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
          <div className="relative min-w-[160px] flex-1 lg:w-48 lg:flex-none">
            <HugeiconsIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground dark:text-muted-foreground" icon={SearchIcon} strokeWidth={1.5} />
            <Input aria-label="Rechercher dans les documents et dossiers" className="h-10 rounded-full border-border bg-card pr-9 pl-10 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-ring/40" onChange={(event) => setSearchTerm(event.target.value)} placeholder="Rechercher…" type="search" value={searchTerm} />
            {searchTerm && <button aria-label="Effacer la recherche" className="absolute top-1/2 right-2.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:text-muted-foreground dark:hover:bg-white/10" onClick={() => setSearchTerm("")} type="button"><X className="size-3.5" /></button>}
          </div>
          <DropdownMenu>
              <DropdownMenuTrigger render={<Button className="h-10 gap-2 rounded-full px-5 text-sm" type="button" />}>
                <HugeiconsIcon className="size-4" icon={Add01Icon} strokeWidth={1.5} />
                Nouveau document
                <span aria-hidden="true" className="ml-1 flex h-4 items-center border-current/20 border-l pl-2"><ChevronDown className="size-3.5" /></span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-1.5">
                <DropdownMenuLabel className="px-2 pt-2 pb-1.5 text-[11px] uppercase tracking-[0.08em]">Partir d’un modèle</DropdownMenuLabel>
                {documentNoteTemplateOrder.map((kind) => (
                  <DropdownMenuItem key={kind} onClick={() => void handleCreateTemplate(kind)}>
                    <FileText className="mr-2 size-4 shrink-0" />
                    <span className="min-w-0"><span className="block font-medium">{documentNoteTemplates[kind].title}</span><span className="block truncate text-muted-foreground text-xs">{documentNoteTemplates[kind].description}</span></span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void handleCreateNote()}><HugeiconsIcon className="mr-2 size-4" icon={Add01Icon} strokeWidth={1.5} />Page vierge</DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-t-[22px] border border-b-0 border-foreground/10 bg-card md:flex-row">
        <aside
          className={cn(
            "flex min-h-0 shrink-0 flex-col border-foreground/10 border-r bg-muted transition-[width,height] duration-200 ease-out dark:bg-muted",
            showSidebar
              ? "h-[38%] w-full border-b md:h-auto md:w-[min(304px,34vw)] md:border-b-0"
              : "h-0 w-0 overflow-hidden border-0"
          )}
        >
          <div className="shrink-0 px-5 pt-5 pb-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold text-xl tracking-[-0.025em] text-foreground dark:text-foreground">Bibliothèque</h2>
              <span className="text-xs font-medium tabular-nums text-muted-foreground dark:text-muted-foreground">{filteredNotes.length} document{filteredNotes.length === 1 ? "" : "s"}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center border-border border-b px-4 dark:border-white/10">
            {([
              { id: "all", label: "Tous" },
              { id: "recent", label: "Récents" },
              { id: "favorites", label: "Favoris" },
              { id: "pinned", label: "Épinglés" },
            ] as const).map((option) => (
              <button aria-pressed={filter === option.id} className={cn("-mb-px min-w-0 flex-1 border-b-2 border-transparent px-1 py-3 text-center font-medium text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50", filter === option.id ? "border-foreground text-foreground dark:border-foreground dark:text-foreground" : "text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-white")} key={option.id} onClick={() => setFilter(option.id)} type="button">{option.label}</button>
            ))}
          </div>

          {/* Notes list */}
          <ScrollArea className="min-h-0 flex-1 overscroll-contain">
            {filteredNotes.length === 0 ? (
              <div className="px-6 py-9">
                <p className="font-medium text-sm text-foreground dark:text-foreground">
                  {searchTerm ? "Aucun résultat" : filter !== "all" ? "Aucune note dans cette vue" : activePatient ? `Aucune note pour ${activePatient.name}` : "Aucun document"}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground dark:text-muted-foreground">
                  {searchTerm
                    ? "Essayez un autre nom ou vérifiez le dossier sélectionné."
                    : filter !== "all" ? "Choisissez Tous pour retrouver les autres documents." : activePatient ? "Créez une note pour commencer ce dossier." : "Vos notes apparaîtront ici après leur création."}
                </p>
              </div>
            ) : (
              <div className="px-2 pb-5 pt-2">
                {noteGroups.map((group) => {
                  const isOpen = Boolean(searchTerm) || !closedFolders.includes(group.key);
                  return <section className="mb-1" key={group.key}>
                  <div className="group/folder flex items-center gap-1 px-1 py-1">
                    <button aria-expanded={isOpen} className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-foreground hover:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:text-foreground dark:hover:bg-white/5" onClick={() => setClosedFolders((current) => current.includes(group.key) ? current.filter((key) => key !== group.key) : [...current, group.key])} type="button">
                      {isOpen ? <FolderOpen aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} /> : <Folder aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />}
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{group.label}</span>
                      <span className="text-[11px] tabular-nums text-muted-foreground dark:text-muted-foreground">{group.notes.length}</span>
                      <ChevronRight aria-hidden="true" className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform dark:text-muted-foreground", isOpen && "rotate-90")} />
                    </button>
                    <button aria-label={`Créer une note de consultation dans ${group.label}`} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:text-muted-foreground dark:hover:bg-white/10" onClick={() => void handleCreateTemplate("consultation", group.patientId)} title={`Nouvelle note de consultation · ${group.label}`} type="button"><HugeiconsIcon className="size-3.5" icon={Add01Icon} strokeWidth={1.5} /></button>
                  </div>
                  {isOpen && <div className="ml-4 space-y-0.5 border-border border-l pl-1 dark:border-white/10">
                {group.notes.map((note) => {
                  const isSelected = selectedNoteId === note.id;
                  const isPinned = (note as any).isPinned;

                  return (
                    <div
                      className={cn(
                        "group flex w-full items-center gap-1 rounded-lg px-2 py-1 transition-colors duration-150",
                        isSelected
                          ? "bg-muted dark:bg-muted"
                          : "hover:bg-white/80 dark:hover:bg-white/5"
                      )}
                      key={note.id}
                    >
                      <button
                        aria-current={isSelected ? "true" : undefined}
                        className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        onClick={() => handleSelectNote(note.id)}
                        type="button"
                      >
                        <FileText aria-hidden="true" className={cn("size-4 shrink-0", isSelected ? "text-foreground dark:text-foreground" : "text-muted-foreground dark:text-muted-foreground")} strokeWidth={1.6} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-foreground" title={note.title || "Sans titre"}>{note.title || "Sans titre"}</span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground tabular-nums">{formatDate(note.updatedAt)}</span>
                        </span>
                        {isPinned && <Pin aria-label="Épinglé" className="size-3 shrink-0 text-muted-foreground" />}
                        {note.isFavorite && <Star aria-label="Favori" className="size-3 shrink-0 fill-amber-500 text-amber-500" />}
                      </button>

                      <div className="shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                aria-label={`Plus d’actions pour ${note.title || "ce document"}`}
                                className="size-7 rounded-md text-muted-foreground hover:bg-white hover:text-foreground dark:text-muted-foreground dark:hover:bg-white/10 dark:hover:text-white"
                                size="icon-sm"
                                variant="ghost"
                              >
                                <HugeiconsIcon
                                  className="size-3.5"
                                  icon={MoreVerticalIcon} strokeWidth={1.5}
                                />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => toggleFavorite(note)}
                            >
                              <HugeiconsIcon
                                className="mr-2 size-4"
                                icon={StarIcon} strokeWidth={1.5}
                              />
                              {note.isFavorite
                                ? "Retirer des favoris"
                                : "Ajouter aux favoris"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => togglePin(note)}>
                              <HugeiconsIcon className="mr-2 size-4" icon={Bookmark01Icon} strokeWidth={1.5} />
                              {isPinned ? "Désépingler" : "Épingler"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleDuplicateNote(note)}>
                              <HugeiconsIcon className="mr-2 size-4" icon={CopyIcon} strokeWidth={1.5} />
                              Dupliquer la note
                            </DropdownMenuItem>
                            {note.patientId && <DropdownMenuItem onClick={() => void handleCreateTemplate("followup", note.patientId ?? "")}>
                              <HugeiconsIcon className="mr-2 size-4" icon={File01Icon} strokeWidth={1.5} />
                              Nouveau suivi clinique
                            </DropdownMenuItem>}
                            <DropdownMenuItem
                              onClick={() => handleExportNote("md", note)}
                            >
                              <HugeiconsIcon
                                className="mr-2 size-4"
                                icon={DownloadIcon} strokeWidth={1.5}
                              />
                              Exporter (.md)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <HugeiconsIcon
                                className="mr-2 size-4"
                                icon={Delete01Icon} strokeWidth={1.5}
                              />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
                  </div>}
                </section>;})}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* ── EDITOR AREA ── */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted dark:bg-muted">
          <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-border border-b bg-muted px-4 py-1.5 dark:border-white/10 dark:bg-muted">
            <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground dark:text-muted-foreground">
              <HugeiconsIcon aria-hidden="true" className="size-4 shrink-0" icon={Folder01Icon} strokeWidth={1.5} />
              <span className="truncate">{activeNote?.patientId ? patientLookup.get(activeNote.patientId)?.name ?? "Dossier patient" : "Documents du cabinet"}</span>
            </span>
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              <PatientPicker
                kind="filter"
                onSelect={(patientId) => {
                  setPatientFilter(patientId);
                  if (activeNote && patientId && activeNote.patientId !== patientId) setSelectedNoteId(null);
                }}
                patients={patients}
                value={patientFilter}
              />
              {activeNote && (
                <>
                  <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-muted dark:bg-white/10" />
                  <PatientPicker
                    kind="link"
                    onSelect={(patientId) => {
                      void updateNote(activeNote.id, { patientId: patientId || null });
                      if (patientFilter && patientFilter !== patientId) setPatientFilter(patientId);
                    }}
                    patients={patients}
                    value={activeNote.patientId ?? ""}
                  />
                </>
              )}
            </div>
          </div>
          {selectedNoteId && activeNote ? (
            <div className="flex h-full min-h-0 flex-col">
              {/* Document actions */}
              <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-border border-b bg-muted/95 px-4 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-muted/95">
                <div className="flex items-center gap-1.5">
                  {/* Toggle sidebar */}
                  <Button
                    className="size-8 rounded-lg text-foreground/70 hover:bg-muted/70 hover:text-foreground"
                    onClick={() => setShowSidebar(!showSidebar)}
                    size="icon-sm"
                    title={
                      showSidebar ? "Masquer la liste" : "Afficher la liste"
                    }
                    variant="ghost"
                  >
                    <HugeiconsIcon className="size-3.5" icon={Folder01Icon} strokeWidth={1.5} />
                  </Button>

                  <div className="mx-0.5 h-4 w-px bg-foreground/15" />

                  {/* Edit / Preview toggle */}
                  <div className="flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5 dark:bg-zinc-800/60">
                    <button
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-xs transition-colors duration-150",
                        isPreviewMode
                          ? "text-foreground/70 hover:text-foreground"
                          : "bg-white text-foreground shadow-sm dark:bg-zinc-700"
                      )}
                      aria-pressed={!isPreviewMode}
                      type="button"
                      onClick={() => setIsPreviewMode(false)}
                    >
                      <HugeiconsIcon className="size-3" icon={EditIcon} strokeWidth={1.5} />
                      Éditer
                    </button>
                    <button
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-xs transition-colors duration-150",
                        isPreviewMode
                          ? "bg-white text-foreground shadow-sm dark:bg-zinc-700"
                          : "text-foreground/70 hover:text-foreground"
                      )}
                      aria-pressed={isPreviewMode}
                      type="button"
                      onClick={() => setIsPreviewMode(true)}
                    >
                      <HugeiconsIcon className="size-3" icon={EyeIcon} strokeWidth={1.5} />
                      Aperçu
                    </button>
                  </div>

                  {!isPreviewMode && (
                    <>
                      <div className="mx-0.5 h-4 w-px bg-foreground/15" />
                      <div className="flex items-center gap-0.5">
                        <Button
                          className="size-8 rounded-lg text-foreground/70 hover:text-foreground disabled:opacity-40"
                          disabled={!editorInstance?.can().undo()}
                          onClick={() =>
                            editorInstance?.chain().focus().undo().run()
                          }
                          size="icon-sm"
                          title="Annuler (Ctrl+Z)"
                          variant="ghost"
                        >
                          <HugeiconsIcon
                            className="size-3.5"
                            icon={Undo02Icon} strokeWidth={1.5}
                          />
                        </Button>
                        <Button
                          className="size-8 rounded-lg text-foreground/70 hover:text-foreground disabled:opacity-40"
                          disabled={!editorInstance?.can().redo()}
                          onClick={() =>
                            editorInstance?.chain().focus().redo().run()
                          }
                          size="icon-sm"
                          title="Rétablir (Ctrl+Y)"
                          variant="ghost"
                        >
                          <HugeiconsIcon
                            className="size-3.5"
                            icon={Redo02Icon} strokeWidth={1.5}
                          />
                        </Button>
                      </div>
                    </>
                  )}

                  <div className="mx-0.5 h-4 w-px bg-foreground/15" />

                  {/* Save status */}
                  {isSaving ? (
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

                {/* Right actions */}
                <div className="flex items-center gap-0.5">
                  {/* Word / char count badge */}
                  <Badge
                    className="hidden h-6 gap-1 border-foreground/15 font-normal text-xs text-foreground/70 tabular-nums xl:flex"
                    variant="outline"
                  >
                    <Hash className="size-2.5" />
                    {wordCount} mots
                  </Badge>

                  <div className="mx-1 h-4 w-px bg-foreground/15" />

                  <Button
                    className={cn(
                      "size-7 rounded-lg",
                      (activeNote as any).isPinned
                        ? "text-amber-500 hover:text-amber-600"
                        : "text-foreground/70 hover:text-foreground"
                    )}
                    onClick={() => togglePin(activeNote)}
                    size="icon-sm"
                    title="Épingler"
                    variant="ghost"
                  >
                    <HugeiconsIcon className="size-3.5" icon={Bookmark01Icon} strokeWidth={1.5} />
                  </Button>
                  <Button
                    className={cn(
                      "size-7 rounded-lg",
                      activeNote.isFavorite
                        ? "text-amber-500 hover:text-amber-600"
                        : "text-foreground/70 hover:text-foreground"
                    )}
                    onClick={() => toggleFavorite(activeNote)}
                    size="icon-sm"
                    title="Favori"
                    variant="ghost"
                  >
                    <HugeiconsIcon
                      className="size-3.5"
                      fill={activeNote.isFavorite ? "currentColor" : "none"}
                      icon={StarIcon} strokeWidth={1.5}
                    />
                  </Button>
                  <Button
                    className="size-8 rounded-lg text-foreground/70 hover:text-foreground"
                    onClick={handleCopyNote}
                    size="icon-sm"
                    title="Copier le contenu"
                    variant="ghost"
                  >
                    <HugeiconsIcon className="size-3.5" icon={CopyIcon} strokeWidth={1.5} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          aria-label="Plus d’actions pour cette note"
                          className="size-8 rounded-lg text-foreground/70 hover:text-foreground"
                          size="icon-sm"
                          variant="ghost"
                        >
                          <HugeiconsIcon
                            className="size-3.5"
                            icon={MoreVerticalIcon} strokeWidth={1.5}
                          />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => void handleDuplicateNote(activeNote)}>
                        <HugeiconsIcon className="mr-2 size-4" icon={CopyIcon} strokeWidth={1.5} />
                        Dupliquer la note
                      </DropdownMenuItem>
                      {activeNote.patientId && <DropdownMenuItem onClick={() => void handleCreateTemplate("followup", activeNote.patientId ?? "")}>
                        <HugeiconsIcon className="mr-2 size-4" icon={File01Icon} strokeWidth={1.5} />
                        Nouveau suivi clinique
                      </DropdownMenuItem>}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleExportNote("md")}>
                        <HugeiconsIcon
                          className="mr-2 size-4"
                          icon={DownloadIcon} strokeWidth={1.5}
                        />
                        Exporter en Markdown
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportNote("txt")}>
                        <HugeiconsIcon
                          className="mr-2 size-4"
                          icon={DownloadIcon} strokeWidth={1.5}
                        />
                        Exporter en Texte
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteNote(activeNote.id)}
                      >
                        <HugeiconsIcon
                          className="mr-2 size-4"
                          icon={Delete01Icon} strokeWidth={1.5}
                        />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Editor content area */}
              <div
                className="min-h-0 flex-1 cursor-text select-text overflow-y-auto overscroll-contain bg-muted pb-8 [scrollbar-gutter:stable] dark:bg-muted"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    editorInstance?.commands.focus("end");
                  }
                }}
              >
                <div
                  className="mx-auto my-5 flex min-h-[calc(100%-40px)] w-[calc(100%-32px)] max-w-[820px] flex-col bg-card px-5 py-6 shadow-sm ring-1 ring-border md:my-5 md:w-[calc(100%-40px)] md:px-8 md:py-8"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      editorInstance?.commands.focus("end");
                    }
                  }}
                >
                  {isPreviewMode ? (
                    <div className="document-rich-content prose prose-sm dark:prose-invert max-w-none overflow-x-auto">
                      <h1 className="font-heading text-[31px] font-semibold tracking-[-0.035em]">
                        {title}
                      </h1>
                      <p className="mt-1 mb-6 text-foreground/70 text-xs">
                        {formatFullDate(activeNote.updatedAt)}
                      </p>
                      <div dangerouslySetInnerHTML={{ __html: content }} />
                    </div>
                  ) : (
                    <>
                      {/* Note title */}
                      <input
                        aria-label="Titre du document"
                        className="mb-2.5 w-full bg-transparent font-heading text-[31px] font-semibold leading-tight tracking-[-0.035em] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30 dark:text-foreground dark:placeholder:text-muted-foreground"
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Sans titre"
                        type="text"
                        value={title}
                      />

                      {/* Meta line below title */}
                      <div className="mb-9 flex flex-wrap items-center gap-2.5">
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

            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto bg-muted px-5 py-6 dark:bg-muted md:px-8 md:py-8">
              <div className="mx-auto flex min-h-[440px] w-full max-w-[820px] flex-col bg-card px-5 py-6 shadow-sm ring-1 ring-border md:px-8 md:py-8">
                <div className="flex flex-1 flex-col justify-center py-12">
                  <h2 className="max-w-md font-heading text-[32px] font-semibold leading-tight tracking-[-0.035em] text-foreground dark:text-foreground">{activePatient ? `Le dossier de ${activePatient.name} commence ici.` : "Un espace pour chaque observation."}</h2>
                  <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground dark:text-muted-foreground">{activePatient ? `Les nouvelles notes seront directement rattachées au dossier de ${activePatient.name}. Vous pourrez changer ce rattachement depuis l’en-tête du document.` : "Rédigez librement, puis rattachez votre document au dossier d’un patient. Les notes sont enregistrées au fil de l’écriture."}</p>
                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Button className="h-10 rounded-full px-5" onClick={() => void handleCreateTemplate("consultation")}>
                      <HugeiconsIcon className="mr-2 size-4" icon={Add01Icon} strokeWidth={1.5} />Note de consultation
                    </Button>
                    <button className="text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:text-foreground" onClick={() => void handleCreateNote()} type="button">Page vierge</button>
                  </div>
                  {filteredNotes[0] && (
                    <button className="mt-10 flex max-w-md items-center justify-between gap-4 border-border border-t py-4 text-left hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:border-white/10 dark:hover:text-foreground" onClick={() => handleSelectNote(filteredNotes[0].id)} type="button">
                      <span className="min-w-0"><span className="block text-xs text-muted-foreground dark:text-muted-foreground">Reprendre la dernière note</span><span className="mt-1 block truncate text-sm font-medium text-foreground dark:text-foreground">{filteredNotes[0].title || "Sans titre"}</span></span>
                      <span className="shrink-0 text-xs text-muted-foreground dark:text-muted-foreground">{formatDate(filteredNotes[0].updatedAt)}</span>
                    </button>
                  )}
                  {!showSidebar && <Button className="mt-6 w-fit" onClick={() => setShowSidebar(true)} variant="outline"><HugeiconsIcon className="mr-2 size-4" icon={Folder01Icon} strokeWidth={1.5} />Voir la bibliothèque</Button>}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default NotesPro;
