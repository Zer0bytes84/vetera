import React, { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useNotesRepository } from "@/data/repositories"
import { useAuth } from "@/contexts/AuthContext"
import { Note } from "@/types/db"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  File01Icon,
  SearchIcon,
  StarIcon,
  MoreVerticalIcon,
  Delete01Icon,
  Clock01Icon,
  CheckmarkCircle02Icon,
  TextBoldIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  Link01Icon,
  Heading01Icon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  TextAlignLeft01Icon,
} from "@hugeicons/core-free-icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Utils
const normalizeDate = (dateInput: any): Date =>
  !dateInput
    ? new Date()
    : dateInput instanceof Date
      ? dateInput
      : new Date(dateInput)

const formatDate = (dateInput: any) => {
  if (!dateInput) return ""
  return normalizeDate(dateInput).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })
}

const formatFullDate = (dateInput: any) => {
  if (!dateInput) return ""
  return normalizeDate(dateInput).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const extractPreview = (content: string) => {
  if (!content) return ""
  return (
    content
      .replace(/<[^>]*>?/gm, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100) || ""
  )
}

// Filter types
type FilterType = "all" | "favorites" | "recent"

const Notes: React.FC = () => {
  const { currentUser } = useAuth()
  const {
    data: notes,
    createEmptyNote,
    update: updateNote,
    remove: removeNote,
  } = useNotesRepository()

  // State
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filter logic
  const filteredNotes = useMemo(() => {
    let result = notes.filter((n) => n.userId === currentUser?.uid)

    // Apply filter
    if (filter === "favorites") {
      result = result.filter((n) => n.isFavorite)
    } else if (filter === "recent") {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      result = result.filter((n) => new Date(n.updatedAt) > oneWeekAgo)
    }

    // Apply search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(term) ||
          n.content.toLowerCase().includes(term)
      )
    }

    // Sort by updated date desc
    return result.sort(
      (a, b) =>
        normalizeDate(b.updatedAt).getTime() -
        normalizeDate(a.updatedAt).getTime()
    )
  }, [notes, filter, searchTerm, currentUser])

  const activeNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId),
    [notes, selectedNoteId]
  )

  // Select note
  const handleSelectNote = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId)
    if (note) {
      setSelectedNoteId(noteId)
      setTitle(note.title)
      setContent(note.content)
      setLastSaved(new Date(note.updatedAt))
    }
  }

  // Auto-save
  const triggerSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (!selectedNoteId) return

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      setIsSaving(true)
      saveTimeoutRef.current = setTimeout(async () => {
        await updateNote(selectedNoteId, {
          title: newTitle,
          content: newContent,
        })
        setIsSaving(false)
        setLastSaved(new Date())
      }, 800)
    },
    [selectedNoteId, updateNote]
  )

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    triggerSave(newTitle, content)
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    triggerSave(title, newContent)
  }

  // Handle Enter key for auto-list continuation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return

    const textarea = e.currentTarget
    const cursorPos = textarea.selectionStart
    const textBeforeCursor = content.substring(0, cursorPos)
    const textAfterCursor = content.substring(cursorPos)
    const lines = textBeforeCursor.split("\n")
    const currentLine = lines[lines.length - 1]

    // Check for numbered list (1. 2. 3. etc)
    const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s/)
    if (numberedMatch) {
      e.preventDefault()
      const [, indent, num] = numberedMatch
      const nextNum = parseInt(num) + 1
      const newLine = `${indent}${nextNum}. `
      const newContent = textBeforeCursor + "\n" + newLine + textAfterCursor
      handleContentChange(newContent)
      setTimeout(() => {
        const newCursorPos = cursorPos + 1 + newLine.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
      return
    }

    // Check for bullet list (- or *)
    const bulletMatch = currentLine.match(/^(\s*)([-*])\s/)
    if (bulletMatch) {
      e.preventDefault()
      const [, indent, bullet] = bulletMatch
      const newLine = `${indent}${bullet} `
      const newContent = textBeforeCursor + "\n" + newLine + textAfterCursor
      handleContentChange(newContent)
      setTimeout(() => {
        const newCursorPos = cursorPos + 1 + newLine.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
      return
    }

    // Check for checkbox list (- [ ] or * [ ])
    const checkboxMatch = currentLine.match(/^(\s*)([-*])\s\[([ x])\]\s/)
    if (checkboxMatch) {
      e.preventDefault()
      const [, indent, bullet] = checkboxMatch
      const newLine = `${indent}${bullet} [ ] `
      const newContent = textBeforeCursor + "\n" + newLine + textAfterCursor
      handleContentChange(newContent)
      setTimeout(() => {
        const newCursorPos = cursorPos + 1 + newLine.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
      return
    }
  }

  // Create note
  const handleCreateNote = async () => {
    if (!currentUser) return
    const newNote = await createEmptyNote(currentUser.uid)
    if (newNote) {
      setSelectedNoteId(newNote.id)
      setTitle("Nouvelle note")
      setContent("")
      setLastSaved(new Date())
    }
  }

  // Toggle favorite
  const toggleFavorite = async (note: Note, e?: React.MouseEvent) => {
    e?.stopPropagation()
    await updateNote(note.id, { isFavorite: !note.isFavorite })
  }

  // Delete note
  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (window.confirm("Supprimer cette note ?")) {
      await removeNote(id)
      if (selectedNoteId === id) {
        setSelectedNoteId(null)
        setTitle("")
        setContent("")
      }
    }
  }

  // Editor formatting
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertFormatting = (before: string, after: string = "") => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const newContent =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end)

    handleContentChange(newContent)

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + selectedText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const formatButtons = [
    { icon: TextBoldIcon, action: () => insertFormatting("**", "**"), label: "Gras" },
    { icon: TextItalicIcon, action: () => insertFormatting("*", "*"), label: "Italique" },
    { icon: TextStrikethroughIcon, action: () => insertFormatting("~~", "~~"), label: "Barré" },
    { icon: Heading01Icon, action: () => insertFormatting("# ", ""), label: "Titre" },
    { icon: LeftToRightListBulletIcon, action: () => insertFormatting("\n- ", ""), label: "Liste" },
    { icon: LeftToRightListNumberIcon, action: () => insertFormatting("\n1. ", ""), label: "Numérotée" },
    { icon: TextAlignLeft01Icon, action: () => insertFormatting("> ", ""), label: "Citation" },
    { icon: Link01Icon, action: () => insertFormatting("[", "](url)"), label: "Lien" },
  ]

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedNoteId) return
      const modifier = e.metaKey || e.ctrlKey
      if (!modifier) return

      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault()
          insertFormatting("**", "**")
          break
        case "i":
          e.preventDefault()
          insertFormatting("*", "*")
          break
        case "k":
          e.preventDefault()
          insertFormatting("[", "](url)")
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [selectedNoteId, content])

  // Stats
  const stats = useMemo(() => {
    const total = notes.filter((n) => n.userId === currentUser?.uid).length
    const favorites = notes.filter(
      (n) => n.userId === currentUser?.uid && n.isFavorite
    ).length
    const recent = notes.filter((n) => {
      if (n.userId !== currentUser?.uid) return false
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      return new Date(n.updatedAt) > oneWeekAgo
    }).length
    return { total, favorites, recent }
  }, [notes, currentUser])

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <aside className="flex w-[320px] shrink-0 flex-col border-r border-border bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div>
            <h2 className="text-base font-semibold">Notes</h2>
            <p className="text-xs text-muted-foreground">{stats.total} notes</p>
          </div>
          <Button
            size="icon"
            onClick={handleCreateNote}
            className="size-8 rounded-full"
          >
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <HugeiconsIcon
              icon={SearchIcon}
              className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground/50"
            />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="h-9 rounded-lg border-border/50 bg-muted/40 pl-9 text-sm placeholder:text-muted-foreground/50 focus:bg-background"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 px-3 pb-3">
          {[
            { id: "all", label: "Toutes", count: stats.total },
            { id: "favorites", label: "Favoris", count: stats.favorites },
            { id: "recent", label: "Récents", count: stats.recent },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as FilterType)}
              className={cn(
                "py-1.5 text-xs transition-colors",
                filter === f.id
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              {f.count > 0 && (
                <span className="ml-1 opacity-60">({f.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Notes List */}
        <ScrollArea className="flex-1 px-2">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HugeiconsIcon
                icon={File01Icon}
                className="mb-2 size-10 text-muted-foreground/30"
              />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "Aucune note trouvée" : "Aucune note"}
              </p>
              {searchTerm && (
                <p className="text-xs text-muted-foreground/60">
                  Essayez une autre recherche
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredNotes.map((note) => {
                const isSelected = selectedNoteId === note.id
                const preview = extractPreview(note.content)

                return (
                  <button
                    key={note.id}
                    onClick={() => handleSelectNote(note.id)}
                    className={cn(
                      "group relative flex w-full flex-col gap-1 rounded-lg p-3 text-left transition-all",
                      isSelected
                        ? "bg-muted dark:bg-muted/80"
                        : "hover:bg-muted/50"
                    )}
                  >
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex-1 truncate text-sm font-medium">
                        {note.title || "Sans titre"}
                      </p>
                      {note.isFavorite && (
                        <HugeiconsIcon
                          icon={StarIcon}
                          className="size-3.5 shrink-0 text-amber-500"
                          fill="currentColor"
                        />
                      )}
                    </div>

                    {/* Preview */}
                    {preview && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {preview}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground/60">
                        {formatDate(note.updatedAt)}
                      </span>

                      {/* Actions on hover */}
                      <div
                        className={cn(
                          "flex items-center gap-0.5 transition-opacity",
                          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-6 hover:bg-background"
                          onClick={(e) => toggleFavorite(note, e)}
                        >
                          <HugeiconsIcon
                            icon={StarIcon}
                            className={cn(
                              "size-3",
                              note.isFavorite
                                ? "text-amber-500"
                                : "text-muted-foreground"
                            )}
                            fill={note.isFavorite ? "currentColor" : "none"}
                          />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-6 hover:bg-background"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <HugeiconsIcon
                              icon={MoreVerticalIcon}
                              className="size-3 text-muted-foreground"
                            />
                          </Button>
                        </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <HugeiconsIcon
                                icon={Delete01Icon}
                                className="mr-2 size-4"
                              />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* Editor */}
      <main className="flex min-w-0 flex-1 flex-col bg-background">
        {selectedNoteId && activeNote ? (
          <div className="flex flex-1 flex-col">
            {/* Simple toolbar */}
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-2">
              <div className="flex items-center gap-1">
                {formatButtons.map((btn) => (
                  <Button
                    key={btn.label}
                    variant="ghost"
                    size="icon-sm"
                    onClick={btn.action}
                    title={`${btn.label} (Ctrl+${btn.label[0]})`}
                    className="size-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <HugeiconsIcon icon={btn.icon} className="size-4" />
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {isSaving ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
                    Sauvegarde...
                  </span>
                ) : lastSaved ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      className="size-3.5"
                    />
                    Sauvegardé
                  </span>
                ) : null}

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => toggleFavorite(activeNote)}
                  className={cn(
                    "size-8 rounded-md",
                    activeNote.isFavorite
                      ? "text-amber-500 hover:text-amber-600"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <HugeiconsIcon
                    icon={StarIcon}
                    className="size-4"
                    fill={activeNote.isFavorite ? "currentColor" : "none"}
                  />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-8 rounded-md text-muted-foreground hover:text-foreground"
                    >
                      <HugeiconsIcon icon={MoreVerticalIcon} className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleDeleteNote(activeNote.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete01Icon} className="mr-2 size-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Editor content */}
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl px-8 py-6">
                {/* Title - no background, clean */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Titre de la note"
                  className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/30"
                />

                {/* Date */}
                <p className="mt-1 text-xs text-muted-foreground/60">
                  {formatFullDate(activeNote.updatedAt)}
                </p>

                {/* Content */}
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Commencez à écrire... (Markdown supporté)"
                  className="mt-4 min-h-[calc(100vh-300px)] w-full resize-none bg-transparent font-mono text-base leading-relaxed outline-none placeholder:text-muted-foreground/30"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <HugeiconsIcon
                icon={File01Icon}
                className="size-8 text-muted-foreground/40"
              />
            </div>
            <h3 className="mt-4 text-lg font-medium">Sélectionnez une note</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choisissez une note dans la liste ou créez-en une nouvelle
            </p>
            <Button onClick={handleCreateNote} className="mt-4 rounded-lg">
              <HugeiconsIcon icon={Add01Icon} className="mr-2 size-4" />
              Créer une note
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

export default Notes
