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
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import Editor from "@/components/Editor";
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
    return { total, favorites, pinned, recent };
  }, [notes, currentUser]);

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
    <div className="flex h-full w-full min-w-0">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-border/60 border-r transition-all duration-300",
          showSidebar ? "w-[340px]" : "w-0 overflow-hidden"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h2 className="font-semibold text-base tracking-tight">Notes</h2>
            <p className="text-[11px] text-muted-foreground">
              {stats.total} note{stats.total === 1 ? "" : "s"}
            </p>
          </div>
          <Button
            className="size-8 rounded-lg shadow-sm"
            onClick={handleCreateNote}
            size="icon"
          >
            <HugeiconsIcon className="size-4" icon={Add01Icon} />
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <HugeiconsIcon
              className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground/50"
              icon={SearchIcon}
            />
            <Input
              className="h-8 rounded-lg border-border/40 bg-muted/50 pl-8 text-xs placeholder:text-muted-foreground/40 focus:border-primary/30 focus:bg-background dark:bg-muted/30 dark:focus:bg-muted/50"
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher une note..."
              value={searchTerm}
            />
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1 px-3 pb-3">
          {(
            [
              { id: "all", label: "Toutes", count: stats.total },
              { id: "favorites", label: "★ Favoris", count: stats.favorites },
              { id: "pinned", label: "📌 Épinglées", count: stats.pinned },
              { id: "recent", label: "Récentes", count: stats.recent },
            ] as const
          ).map((f) => (
            <button
              className={cn(
                "rounded-md px-2.5 py-1 font-medium text-[11px] transition-all",
                filter === f.id
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/60"
              )}
              key={f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {f.count > 0 && filter === f.id && (
                <span className="ml-1 opacity-70">{f.count}</span>
              )}
            </button>
          ))}
        </div>

        <Separator className="opacity-50" />

        {/* Notes List */}
        <ScrollArea className="flex-1 px-2 pt-2">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted/50 dark:bg-muted/30">
                <HugeiconsIcon
                  className="size-6 text-muted-foreground/30"
                  icon={File01Icon}
                />
              </div>
              <p className="mt-3 font-medium text-muted-foreground/70 text-sm">
                {searchTerm ? "Aucun résultat" : "Aucune note"}
              </p>
              <p className="mt-1 text-muted-foreground/50 text-xs">
                {searchTerm
                  ? "Essayez un autre terme"
                  : "Créez votre première note"}
              </p>
              {!searchTerm && (
                <Button
                  className="mt-4 h-7 rounded-md text-xs"
                  onClick={handleCreateNote}
                  size="sm"
                  variant="outline"
                >
                  <HugeiconsIcon className="mr-1.5 size-3" icon={Add01Icon} />
                  Nouvelle note
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1 pb-2">
              {filteredNotes.map((note) => {
                const isSelected = selectedNoteId === note.id;
                const isPinned = (note as any).isPinned;
                const preview = extractPreview(note.content);
                const accent = getNoteAccent(note.title || "N");

                return (
                  <div
                    className={cn(
                      "group relative flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all duration-150",
                      isSelected
                        ? "bg-primary/[0.08] ring-1 ring-primary/20 dark:bg-primary/[0.12] dark:ring-primary/25"
                        : "hover:bg-muted/70 dark:hover:bg-muted/40"
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
                    {/* Color accent dot / initial */}
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg font-semibold text-xs",
                        accent
                      )}
                    >
                      {getInitial(note.title)}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {/* Title */}
                      <div className="flex items-center gap-1.5">
                        <p
                          className={cn(
                            "truncate font-medium text-[13px]",
                            isSelected
                              ? "text-foreground"
                              : "text-foreground/90 dark:text-foreground/80"
                          )}
                        >
                          {note.title || "Sans titre"}
                        </p>
                        {isPinned && (
                          <HugeiconsIcon
                            className="size-3 shrink-0 text-amber-500 dark:text-amber-400"
                            icon={Bookmark01Icon}
                          />
                        )}
                        {note.isFavorite && (
                          <HugeiconsIcon
                            className="size-3 shrink-0 text-amber-500 dark:text-amber-400"
                            fill="currentColor"
                            icon={StarIcon}
                          />
                        )}
                      </div>

                      {/* Preview */}
                      {preview && (
                        <p
                          className={cn(
                            "mt-0.5 line-clamp-2 text-[11px] leading-relaxed",
                            isSelected
                              ? "text-muted-foreground"
                              : "text-muted-foreground/70 dark:text-muted-foreground/60"
                          )}
                        >
                          {preview}
                        </p>
                      )}

                      {/* Meta row */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <span
                          className={cn(
                            "text-[10px]",
                            isSelected
                              ? "text-muted-foreground/80"
                              : "text-muted-foreground/50"
                          )}
                        >
                          {formatDate(note.updatedAt)}
                        </span>
                        {wordCount > 0 && isSelected && (
                          <>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-[10px] text-muted-foreground/50">
                              {extractPreview(note.content).split(/\s+/).length}{" "}
                              mots
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions (hover) */}
                    <div
                      className={cn(
                        "absolute top-2 right-2 flex items-center gap-0.5 rounded-md bg-background/90 p-0.5 shadow-sm ring-1 ring-border/50 backdrop-blur-sm transition-opacity dark:bg-background/80",
                        isSelected
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <Button
                        className="size-6 rounded-md hover:bg-muted"
                        onClick={(e) => togglePin(note, e)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <HugeiconsIcon
                          className={cn(
                            "size-3",
                            isPinned
                              ? "text-amber-500"
                              : "text-muted-foreground"
                          )}
                          icon={Bookmark01Icon}
                        />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              className="size-6 rounded-md hover:bg-muted"
                              onClick={(e) => e.stopPropagation()}
                              size="icon-sm"
                              variant="ghost"
                            >
                              <HugeiconsIcon
                                className="size-3 text-muted-foreground"
                                icon={MoreVerticalIcon}
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
                              icon={StarIcon}
                            />
                            {note.isFavorite
                              ? "Retirer des favoris"
                              : "Ajouter aux favoris"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleExportNote("md")}
                          >
                            <HugeiconsIcon
                              className="mr-2 size-4"
                              icon={DownloadIcon}
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
                              icon={Delete01Icon}
                            />
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

      {/* Editor */}
      <main className="flex min-w-0 flex-1 flex-col bg-background">
        {selectedNoteId && activeNote ? (
          <div className="flex flex-1 flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-border/40 border-b px-5 py-2 dark:border-border/30">
              <div className="flex items-center gap-2">
                <Button
                  className="size-7 rounded-md text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSidebar(!showSidebar)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <HugeiconsIcon className="size-3.5" icon={Folder01Icon} />
                </Button>
                <Separator className="h-5 opacity-50" orientation="vertical" />

                {/* Edit/Preview toggle */}
                <div className="flex items-center rounded-lg bg-muted/50 p-0.5 dark:bg-muted/30">
                  <button
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2.5 py-1 font-medium text-[11px] transition-all",
                      isPreviewMode
                        ? "text-muted-foreground hover:text-foreground"
                        : "bg-background text-foreground shadow-sm dark:bg-background/80"
                    )}
                    onClick={() => setIsPreviewMode(false)}
                  >
                    <HugeiconsIcon className="size-3" icon={EditIcon} />
                    Éditer
                  </button>
                  <button
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2.5 py-1 font-medium text-[11px] transition-all",
                      isPreviewMode
                        ? "bg-background text-foreground shadow-sm dark:bg-background/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setIsPreviewMode(true)}
                  >
                    <HugeiconsIcon className="size-3" icon={EyeIcon} />
                    Aperçu
                  </button>
                </div>

                <Separator className="h-5 opacity-50" orientation="vertical" />

                {/* Save status */}
                {isSaving ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                    </span>
                    Sauvegarde...
                  </span>
                ) : lastSaved ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                    <HugeiconsIcon
                      className="size-3 text-emerald-500"
                      icon={CheckmarkCircle02Icon}
                    />
                    Sauvegardé
                  </span>
                ) : null}

                <Separator className="h-5 opacity-50" orientation="vertical" />

                <span className="text-[11px] text-muted-foreground/40">
                  {wordCount} mots · {charCount} car.
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  className={cn(
                    "size-7 rounded-md",
                    (activeNote as any).isPinned
                      ? "text-amber-500 hover:text-amber-600"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => togglePin(activeNote)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <HugeiconsIcon className="size-3.5" icon={Bookmark01Icon} />
                </Button>
                <Button
                  className={cn(
                    "size-7 rounded-md",
                    activeNote.isFavorite
                      ? "text-amber-500 hover:text-amber-600"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => toggleFavorite(activeNote)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <HugeiconsIcon
                    className="size-3.5"
                    fill={activeNote.isFavorite ? "currentColor" : "none"}
                    icon={StarIcon}
                  />
                </Button>
                <Button
                  className="size-7 rounded-md text-muted-foreground hover:text-foreground"
                  onClick={handleCopyNote}
                  size="icon-sm"
                  variant="ghost"
                >
                  <HugeiconsIcon className="size-3.5" icon={CopyIcon} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        className="size-7 rounded-md text-muted-foreground hover:text-foreground"
                        size="icon-sm"
                        variant="ghost"
                      >
                        <HugeiconsIcon
                          className="size-3.5"
                          icon={MoreVerticalIcon}
                        />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleExportNote("md")}>
                      <HugeiconsIcon
                        className="mr-2 size-4"
                        icon={DownloadIcon}
                      />
                      Exporter en Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportNote("txt")}>
                      <HugeiconsIcon
                        className="mr-2 size-4"
                        icon={DownloadIcon}
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
                        icon={Delete01Icon}
                      />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Editor content */}
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-4xl px-8 py-6">
                {isPreviewMode ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <h1>{title}</h1>
                    <p className="text-muted-foreground text-sm">
                      {formatFullDate(activeNote.updatedAt)}
                    </p>
                    <div
                      className="mt-4"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  </div>
                ) : (
                  <>
                    {/* Title */}
                    <input
                      className="w-full bg-transparent font-bold text-2xl text-foreground tracking-tight outline-none placeholder:text-muted-foreground/25"
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Titre de la note"
                      type="text"
                      value={title}
                    />

                    {/* Date */}
                    <p className="mt-1.5 text-[11px] text-muted-foreground/50">
                      {formatFullDate(activeNote.updatedAt)}
                    </p>

                    {/* Rich Text Editor */}
                    <div className="mt-5">
                      <Editor
                        content={content}
                        onUpdate={handleContentChange}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center p-8">
            <div className="relative">
              <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/15 dark:to-primary/5">
                <HugeiconsIcon
                  className="size-9 text-primary/40"
                  icon={File01Icon}
                />
              </div>
              <div className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                <HugeiconsIcon className="size-3" icon={Add01Icon} />
              </div>
            </div>
            <h3 className="mt-5 font-semibold text-lg tracking-tight">
              Sélectionnez une note
            </h3>
            <p className="mt-1.5 max-w-sm text-center text-muted-foreground/70 text-sm">
              Choisissez une note dans la liste ou créez-en une nouvelle pour
              commencer à écrire
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button
                className="rounded-lg shadow-sm"
                onClick={handleCreateNote}
              >
                <HugeiconsIcon className="mr-1.5 size-4" icon={Add01Icon} />
                Créer une note
              </Button>
              {!showSidebar && (
                <Button
                  className="rounded-lg"
                  onClick={() => setShowSidebar(true)}
                  variant="outline"
                >
                  <HugeiconsIcon
                    className="mr-1.5 size-4"
                    icon={Folder01Icon}
                  />
                  Voir les notes
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NotesPro;
