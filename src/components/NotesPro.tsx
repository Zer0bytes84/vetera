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
  SearchIcon,
  StarIcon,
  Undo02Icon,
  Redo02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { FileText, Star, Pin, BookOpen, PenLine, Sparkles, Hash } from "lucide-react";
import Editor from "@/components/Editor";
import MotivationalHeader from "@/components/MotivationalHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useNotesRepository } from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/db";
import { StatsTrending, type StatItem } from "@/components/StatsTrending";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


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

const extractPreview = (content: string) => {
  if (!content) {
    return "";
  }
  return (
    content
      .replace(/<[^>]*>?/gm, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || ""
  );
};

// Types
type FilterType = "all" | "favorites" | "recent" | "pinned";

const NotesPro: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    data: notes,
    createEmptyNote,
    update: updateNote,
    remove: removeNote,
  } = useNotesRepository();

  // State
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState({
    loading: false,
    ready: false,
    initializing: false,
  });

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

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(term) ||
          n.content.toLowerCase().includes(term)
      );
    }

    return result.sort(
      (a, b) =>
        normalizeDate(b.updatedAt).getTime() -
        normalizeDate(a.updatedAt).getTime()
    );
  }, [notes, filter, searchTerm, currentUser]);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId),
    [notes, selectedNoteId]
  );

  // Stats
  const stats = useMemo(() => {
    const userNotes = notes.filter((n) => n.userId === currentUser?.uid);
    const total = userNotes.length;
    const favorites = userNotes.filter((n) => n.isFavorite).length;
    const pinned = userNotes.filter((n) => (n as any).isPinned).length;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recent = userNotes.filter(
      (n) => new Date(n.updatedAt) > oneWeekAgo
    ).length;

    const totalWords = userNotes.reduce((acc, n) => {
      if (!n.content) return acc;
      const text = n.content.replace(/<[^>]*>?/gm, "").trim();
      if (!text) return acc;
      const count = text.split(/\s+/).filter(Boolean).length;
      return acc + count;
    }, 0);

    const sortedByDate = [...userNotes].sort(
      (a, b) => normalizeDate(b.updatedAt).getTime() - normalizeDate(a.updatedAt).getTime()
    );
    const lastModifiedText = sortedByDate[0]
      ? `Dernière modif. : ${formatDate(sortedByDate[0].updatedAt).toLowerCase()}`
      : "Aucune note modifiée";

    return { total, favorites, pinned, recent, totalWords, lastModifiedText };
  }, [notes, currentUser]);

  const sectionCardItems = useMemo<StatItem[]>(
    () => [
      {
        id: "total",
        title: "Total Notes",
        value: String(stats.total),
        trend: stats.recent > 0 ? `+${stats.recent}` : "0",
        trendDirection: stats.recent > 0 ? "up" : "neutral",
      },
      {
        id: "favorites",
        title: "Favoris",
        value: String(stats.favorites),
        trend: `${stats.total > 0 ? Math.round((stats.favorites / stats.total) * 100) : 0}%`,
        trendDirection: "neutral",
      },
      {
        id: "pinned",
        title: "Épinglées",
        value: String(stats.pinned),
        trend: `${stats.total > 0 ? Math.round((stats.pinned / stats.total) * 100) : 0}%`,
        trendDirection: "neutral",
      },
      {
        id: "words",
        title: "Mots Rédigés",
        value: stats.totalWords.toLocaleString("fr-FR"),
        trend: `~${stats.total > 0 ? Math.round(stats.totalWords / stats.total) : 0} m/note`,
        trendDirection: "neutral",
      },
    ],
    [stats]
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
      setSelectedNoteId(newNote.id);
      setTitle("Nouvelle note");
      setContent("");
      setLastSaved(new Date());
    }
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
  const handleExportNote = (format: "md" | "txt") => {
    if (!activeNote) {
      return;
    }
    let exportContent = "";
    if (format === "md") {
      exportContent = `# ${activeNote.title}\n\n${activeNote.content}`;
    } else {
      exportContent = `${activeNote.title}\n\n${activeNote.content}`;
    }
    const blob = new Blob([exportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeNote.title}.${format}`;
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

  const charCount = useMemo(() => content.length, [content]);

  // Color accent for note (based on title hash)
  const getNoteAccent = (noteTitle: string) => {
    const accents = [
      "bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
      "bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
      "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
      "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
      "bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
      "bg-cyan-500/15 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400",
    ];
    let hash = 0;
    for (let i = 0; i < noteTitle.length; i++) {
      hash = noteTitle.charCodeAt(i) + ((hash << 5) - hash);
    }
    return accents[Math.abs(hash) % accents.length];
  };

  const getInitial = (title: string) => (title || "N").charAt(0).toUpperCase();

  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-5 px-4 lg:px-6 h-full pb-8 pt-16 md:pt-28">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <MotivationalHeader section="notes" />
        <Button
          className="h-9 rounded-full px-5 gap-2 shadow-sm"
          onClick={handleCreateNote}
        >
          <HugeiconsIcon
            className="size-4"
            icon={Add01Icon}
            strokeWidth={1.5}
          />
          Nouvelle note
        </Button>
      </div>

      {/* Widget Cards Row */}
      <StatsTrending items={sectionCardItems} className="shrink-0" />

      {/* Main workspace */}
      <div className="flex flex-1 min-h-[520px] gap-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">

        <aside
          className={cn(
            "flex flex-col shrink-0 border-r border-border/50 transition-all duration-300 ease-in-out bg-white dark:bg-zinc-950",
            showSidebar ? "w-[300px]" : "w-0 overflow-hidden"
          )}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/15">
                <PenLine className="size-3.5 text-primary" />
              </div>
              <span className="font-semibold text-sm tracking-tight">Mes notes</span>
            </div>
            <Button
              className="size-7 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              onClick={handleCreateNote}
              size="icon-sm"
            >
              <HugeiconsIcon className="size-3.5" icon={Add01Icon} strokeWidth={2} />
            </Button>
          </div>

          {/* Search bar */}
          <div className="px-3 pb-3">
            <div className="relative">
              <HugeiconsIcon
                className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/50"
                icon={SearchIcon}
              />
              <Input
                className="h-8 rounded-lg border-border/40 bg-white dark:bg-zinc-950 pl-8 text-xs placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/30 shadow-xs"
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                value={searchTerm}
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="px-3 pb-3">
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 rounded-md p-1">
              {(
                [
                  { id: "all", label: "Toutes", count: stats.total },
                  { id: "favorites", label: "Favoris", count: stats.favorites },
                  { id: "pinned", label: "Épinglées", count: stats.pinned },
                  { id: "recent", label: "Récents", count: stats.recent },
                ] as const
              ).map((f) => (
                <button
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1 rounded px-2 py-1 font-medium text-[10px] transition-colors",
                    filter === f.id
                      ? "bg-white dark:bg-zinc-700 text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-3 border-t border-border/40" />

          {/* Notes list */}
          <ScrollArea className="flex-1 mt-1">
            {filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary/15 mb-3 ring-1 ring-primary/20 shadow-sm">
                  <HugeiconsIcon
                    className="size-7 text-primary/70 dark:text-primary/60"
                    icon={File01Icon}
                  />
                </div>
                <p className="font-medium text-muted-foreground/70 text-sm">
                  {searchTerm ? "Aucun résultat" : "Aucune note"}
                </p>
                <p className="mt-1 text-muted-foreground/50 text-xs">
                  {searchTerm ? "Essayez un autre terme" : "Créez votre première note"}
                </p>
                {!searchTerm && (
                  <Button
                    className="mt-4 h-7 rounded-lg text-xs gap-1.5"
                    onClick={handleCreateNote}
                    size="sm"
                    variant="outline"
                  >
                    <HugeiconsIcon className="size-3" icon={Add01Icon} />
                    Nouvelle note
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-0.5 px-2 py-2 pb-4">
                {filteredNotes.map((note) => {
                  const isSelected = selectedNoteId === note.id;
                  const isPinned = (note as any).isPinned;
                  const preview = extractPreview(note.content);
                  const accent = getNoteAccent(note.title || "N");
                  const noteWordCount = preview ? preview.split(/\s+/).filter(Boolean).length : 0;

                  return (
                    <div
                      className={cn(
                        "group relative flex w-full flex-col gap-1.5 rounded-xl p-3 text-left transition-all duration-150 cursor-pointer",
                        isSelected
                          ? "bg-white dark:bg-zinc-800/90 shadow-sm ring-1 ring-primary/30 dark:ring-primary/40"
                          : "hover:bg-white/70 dark:hover:bg-zinc-800/50"
                      )}
                      key={note.id}
                      onClick={() => handleSelectNote(note.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelectNote(note.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* Color pill */}
                          <div
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-lg font-bold text-[11px]",
                              accent
                            )}
                          >
                            <FileText className="size-3.5" strokeWidth={2.5} />
                          </div>
                          <p
                            className={cn(
                              "truncate font-semibold text-[13px] leading-tight",
                              isSelected ? "text-foreground" : "text-foreground/85"
                            )}
                          >
                            {note.title || "Sans titre"}
                          </p>
                        </div>
                        {/* Badges */}
                        <div className="flex shrink-0 items-center gap-1">
                          {isPinned && (
                            <Pin className="size-2.5 text-amber-500" />
                          )}
                          {note.isFavorite && (
                            <Star className="size-2.5 fill-amber-400 text-amber-400" />
                          )}
                        </div>
                      </div>

                      {/* Preview */}
                      {preview && (
                        <p
                          className={cn(
                            "line-clamp-2 text-[11px] leading-relaxed pl-9",
                            isSelected
                              ? "text-muted-foreground"
                              : "text-muted-foreground/60"
                          )}
                        >
                          {preview}
                        </p>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center justify-between pl-9">
                        <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                          {formatDate(note.updatedAt)}
                        </span>
                        {noteWordCount > 0 && (
                          <span className="text-[10px] text-muted-foreground/40 tabular-nums">
                            {noteWordCount} mots
                          </span>
                        )}
                      </div>

                      {/* Hover actions */}
                      <div
                        className={cn(
                          "absolute top-2 right-2 flex items-center gap-0.5 rounded-lg bg-white/95 dark:bg-zinc-900/95 p-0.5 shadow-md ring-1 ring-border/50 backdrop-blur-sm transition-opacity",
                          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <Button
                          className="size-5 rounded-md hover:bg-muted"
                          onClick={(e) => togglePin(note, e)}
                          size="icon-sm"
                          variant="ghost"
                        >
                          <HugeiconsIcon
                            className={cn("size-2.5", isPinned ? "text-amber-500" : "text-muted-foreground")}
                            icon={Bookmark01Icon}
                          />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                className="size-5 rounded-md hover:bg-muted"
                                onClick={(e) => e.stopPropagation()}
                                size="icon-sm"
                                variant="ghost"
                              >
                                <HugeiconsIcon
                                  className="size-2.5 text-muted-foreground"
                                  icon={MoreVerticalIcon}
                                />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => toggleFavorite(note)}>
                              <HugeiconsIcon className="mr-2 size-4" icon={StarIcon} />
                              {note.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportNote("md")}>
                              <HugeiconsIcon className="mr-2 size-4" icon={DownloadIcon} />
                              Exporter (.md)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <HugeiconsIcon className="mr-2 size-4" icon={Delete01Icon} />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* ── EDITOR AREA ── */}
        <main className="flex min-w-0 flex-1 flex-col bg-white dark:bg-zinc-950">
          {selectedNoteId && activeNote ? (
            <div className="flex h-full flex-col">

              {/* Editor toolbar — glassmorphic */}
              <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-4 py-2 sticky top-0 z-10">
                <div className="flex items-center gap-1.5">
                  {/* Toggle sidebar */}
                  <Button
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    onClick={() => setShowSidebar(!showSidebar)}
                    size="icon-sm"
                    variant="ghost"
                    title={showSidebar ? "Masquer la liste" : "Afficher la liste"}
                  >
                    <HugeiconsIcon className="size-3.5" icon={Folder01Icon} />
                  </Button>

                  <div className="w-px h-4 bg-border/60 mx-0.5" />

                  {/* Edit / Preview toggle */}
                  <div className="flex items-center rounded-lg bg-muted/60 dark:bg-zinc-800/60 p-0.5 gap-0.5">
                    <button
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-[11px] transition-all duration-150",
                        !isPreviewMode
                          ? "bg-white dark:bg-zinc-700 text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setIsPreviewMode(false)}
                    >
                      <HugeiconsIcon className="size-3" icon={EditIcon} />
                      Éditer
                    </button>
                    <button
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-[11px] transition-all duration-150",
                        isPreviewMode
                          ? "bg-white dark:bg-zinc-700 text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setIsPreviewMode(true)}
                    >
                      <HugeiconsIcon className="size-3" icon={EyeIcon} />
                      Aperçu
                    </button>
                  </div>

                  {!isPreviewMode && (
                    <>
                      <div className="w-px h-4 bg-border/60 mx-0.5" />
                      <div className="flex items-center gap-0.5">
                        <Button
                          className="size-7 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={!editorInstance?.can().undo()}
                          onClick={() => editorInstance?.chain().focus().undo().run()}
                          size="icon-sm"
                          variant="ghost"
                          title="Annuler (Ctrl+Z)"
                        >
                          <HugeiconsIcon className="size-3.5" icon={Undo02Icon} />
                        </Button>
                        <Button
                          className="size-7 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={!editorInstance?.can().redo()}
                          onClick={() => editorInstance?.chain().focus().redo().run()}
                          size="icon-sm"
                          variant="ghost"
                          title="Rétablir (Ctrl+Y)"
                        >
                          <HugeiconsIcon className="size-3.5" icon={Redo02Icon} />
                        </Button>
                      </div>
                    </>
                  )}

                  <div className="w-px h-4 bg-border/60 mx-0.5" />

                  {/* Save status */}
                  {isSaving ? (
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="relative flex size-1.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
                      </span>
                      Enregistrement...
                    </span>
                  ) : lastSaved ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                      <HugeiconsIcon className="size-3" icon={CheckmarkCircle02Icon} />
                      Sauvegardé
                    </span>
                  ) : null}
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-0.5">
                  {/* Word / char count badge */}
                  <Badge
                    variant="outline"
                    className="hidden sm:flex h-6 gap-1 text-[10px] text-muted-foreground/60 border-border/40 font-normal tabular-nums"
                  >
                    <Hash className="size-2.5" />
                    {wordCount} mots
                  </Badge>

                  <div className="w-px h-4 bg-border/60 mx-1" />

                  <Button
                    className={cn(
                      "size-7 rounded-lg",
                      (activeNote as any).isPinned
                        ? "text-amber-500 hover:text-amber-600"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => togglePin(activeNote)}
                    size="icon-sm"
                    variant="ghost"
                    title="Épingler"
                  >
                    <HugeiconsIcon className="size-3.5" icon={Bookmark01Icon} />
                  </Button>
                  <Button
                    className={cn(
                      "size-7 rounded-lg",
                      activeNote.isFavorite
                        ? "text-amber-500 hover:text-amber-600"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => toggleFavorite(activeNote)}
                    size="icon-sm"
                    variant="ghost"
                    title="Favori"
                  >
                    <HugeiconsIcon
                      className="size-3.5"
                      fill={activeNote.isFavorite ? "currentColor" : "none"}
                      icon={StarIcon}
                    />
                  </Button>
                  <Button
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={handleCopyNote}
                    size="icon-sm"
                    variant="ghost"
                    title="Copier"
                  >
                    <HugeiconsIcon className="size-3.5" icon={CopyIcon} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                          size="icon-sm"
                          variant="ghost"
                        >
                          <HugeiconsIcon className="size-3.5" icon={MoreVerticalIcon} />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleExportNote("md")}>
                        <HugeiconsIcon className="mr-2 size-4" icon={DownloadIcon} />
                        Exporter en Markdown
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportNote("txt")}>
                        <HugeiconsIcon className="mr-2 size-4" icon={DownloadIcon} />
                        Exporter en Texte
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteNote(activeNote.id)}
                      >
                        <HugeiconsIcon className="mr-2 size-4" icon={Delete01Icon} />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Editor content area */}
              <div
                className="flex-1 overflow-y-auto cursor-text pb-20 select-text bg-white dark:bg-zinc-950"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    editorInstance?.commands.focus("end");
                  }
                }}
              >
                <div
                  className="mx-auto max-w-3xl px-8 py-10 min-h-full flex flex-col"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      editorInstance?.commands.focus("end");
                    }
                  }}
                >
                  {isPreviewMode ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {/* Document icon in preview */}
                      <div className="mb-6 flex">
                        <div
                          className={cn(
                            "flex size-14 items-center justify-center rounded-2xl font-bold shadow-[0_8px_30px_rgb(0,0,0,0.02)] ring-1 ring-border/40 select-none",
                            getNoteAccent(activeNote.title || "N")
                          )}
                        >
                          <FileText className="size-6 stroke-[1.8]" />
                        </div>
                      </div>

                      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                      <p className="text-muted-foreground text-xs mt-1 mb-6">
                        {formatFullDate(activeNote.updatedAt)}
                      </p>
                      <div dangerouslySetInnerHTML={{ __html: content }} />
                    </div>
                  ) : (
                    <>
                      {/* Document icon */}
                      <div className="mb-6 flex">
                        <div
                          className={cn(
                            "flex size-14 items-center justify-center rounded-2xl font-bold shadow-[0_8px_30px_rgb(0,0,0,0.02)] ring-1 ring-border/40 select-none",
                            getNoteAccent(activeNote.title || "N")
                          )}
                        >
                          <FileText className="size-6 stroke-[1.8]" />
                        </div>
                      </div>

                      {/* Note title */}
                      <input
                        className="w-full bg-transparent font-heading font-bold text-[32px] leading-tight text-foreground tracking-tight outline-none placeholder:text-muted-foreground/15 mb-2.5"
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Sans titre"
                        type="text"
                        value={title}
                      />

                      {/* Meta line below title */}
                      <div className="flex items-center gap-2.5 mb-8">
                        <p className="text-[11px] text-muted-foreground/50">
                          {formatFullDate(activeNote.updatedAt)}
                        </p>
                        {wordCount > 0 && (
                          <>
                            <span className="text-muted-foreground/25">·</span>
                            <p className="text-[11px] text-muted-foreground/50 tabular-nums">
                              {wordCount} mots
                            </p>
                          </>
                        )}
                        {(activeNote as any).isPinned && (
                          <>
                            <span className="text-muted-foreground/25">·</span>
                            <span className="flex items-center gap-1 text-[11px] text-amber-500">
                              <Pin className="size-2.5" />
                              Épinglée
                            </span>
                          </>
                        )}
                        {activeNote.isFavorite && (
                          <>
                            <span className="text-muted-foreground/25">·</span>
                            <span className="flex items-center gap-1 text-[11px] text-amber-400">
                              <Star className="size-2.5 fill-amber-400" />
                              Favori
                            </span>
                          </>
                        )}
                      </div>

                      {/* Rich text editor */}
                      <Editor
                        content={content}
                        onUpdate={handleContentChange}
                        onEditorCreated={setEditorInstance}
                        onAiStatusChange={setAiStatus}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Editor footer */}
              {!isPreviewMode && (
                <div className="flex items-center justify-between border-t border-border/40 bg-white dark:bg-zinc-950 px-4 py-2 text-[11px] text-muted-foreground/40 shrink-0 select-none">
                  <span className="flex items-center gap-1">
                    <span>Tapez</span>
                    <kbd className="rounded bg-muted/80 dark:bg-zinc-800/80 px-1 py-px font-mono text-[10px] text-muted-foreground/60">
                      /
                    </kbd>
                    <span>pour les commandes</span>
                  </span>

                  {/* AI Status */}
                  {aiStatus.loading && (
                    <span className="flex items-center gap-1.5 text-primary font-medium">
                      <span className="animate-spin size-3 border-2 border-primary border-t-transparent rounded-full" />
                      Assistant IA en cours...
                    </span>
                  )}
                  {!aiStatus.loading && aiStatus.ready && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500 status-dot-alive" />
                      Assistant IA prêt
                    </span>
                  )}
                  {!aiStatus.loading && aiStatus.initializing && !aiStatus.ready && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <span className="animate-pulse size-1.5 rounded-full bg-amber-500" />
                      Préparation de l'IA...
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-12 relative overflow-hidden bg-white dark:bg-zinc-950">
              {/* Clean Icon */}
              <div className="relative mb-6 flex size-20 items-center justify-center rounded-3xl bg-white dark:bg-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-border/50">
                <PenLine className="size-8 text-zinc-400 dark:text-zinc-500 stroke-[1.5]" />
                {/* Subtle accent dot */}
                <div className="absolute top-4 right-4 size-2 rounded-full bg-primary/40" />
              </div>

              {/* Text */}
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Prêt à écrire ?
              </h2>
              <p className="mt-2 max-w-xs text-center text-[13px] text-muted-foreground/70 leading-relaxed">
                Sélectionnez une note dans la liste ou créez-en une nouvelle pour commencer à rédiger.
              </p>

              {/* Actions */}
              <div className="mt-7 flex items-center gap-2.5">
                <Button
                  className="rounded-full gap-2 shadow-sm h-9 px-5"
                  onClick={handleCreateNote}
                >
                  <HugeiconsIcon className="size-4" icon={Add01Icon} strokeWidth={1.5} />
                  Créer une note
                </Button>
                {!showSidebar && (
                  <Button
                    className="rounded-full gap-2 h-9 px-5"
                    onClick={() => setShowSidebar(true)}
                    variant="outline"
                  >
                    <HugeiconsIcon className="size-4" icon={Folder01Icon} />
                    Voir les notes
                  </Button>
                )}
              </div>

              {/* Footer hint */}
              {stats.total > 0 && (
                <p className="mt-8 text-[11px] text-muted-foreground/35">
                  {stats.total} note{stats.total !== 1 ? "s" : ""} enregistrée{stats.total !== 1 ? "s" : ""} · {stats.totalWords.toLocaleString("fr-FR")} mots rédigés
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default NotesPro;

