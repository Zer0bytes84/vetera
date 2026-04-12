import React, { useState, useEffect, useMemo, useRef } from "react"
import MotivationalHeader from "./MotivationalHeader"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Clock01Icon,
  Delete01Icon,
  File01Icon,
  SearchIcon,
  StarIcon,
} from "@hugeicons/core-free-icons"
import { useNotesRepository } from "@/data/repositories"
import { useAuth } from "../contexts/AuthContext"
import { Note } from "../types/db"
import { BlockNoteShadcnEditor } from "./blocknote-editor"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Badge } from "@/components/ui/badge"

// Helper to normalize date
const normalizeDate = (dateInput: any): Date => {
  if (!dateInput) return new Date()
  if (dateInput instanceof Date) return dateInput
  return new Date(dateInput)
}
const formatDate = (dateInput: any) => {
  if (!dateInput) return ""
  const date = normalizeDate(dateInput)
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

const formatDetailedDate = (dateInput: any) => {
  if (!dateInput) return ""
  const date = normalizeDate(dateInput)
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

const extractNotePreview = (content: string) => {
  if (!content) return "Aucun contenu pour le moment."

  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      const text = parsed
        .map((block) => {
          if (typeof block?.content === "string") return block.content
          if (Array.isArray(block?.content)) {
            return block.content
              .map((item: any) =>
                typeof item === "string" ? item : item?.text || ""
              )
              .join("")
          }
          return ""
        })
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()

      return text || "Aucun contenu pour le moment."
    }
  } catch {
    // Fallback below for legacy HTML/plaintext content.
  }

  const plain = content.replace(/<[^>]*>?/gm, "").replace(/\s+/g, " ").trim()
  return plain || "Aucun contenu pour le moment."
}

const FILTER_OPTIONS = [
  { value: "all", label: "Toutes" },
  { value: "favorites", label: "Favoris" },
]

const Notes: React.FC = () => {
  const { currentUser } = useAuth()
  const {
    data: notes,
    loading,
    update: updateNote,
    remove: removeNote,
    createEmptyNote,
  } = useNotesRepository()

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterFavorites, setFilterFavorites] = useState(false)

  // Editor State
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Refs for logic safety
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDeletingRef = useRef(false)

  // Filter Logic
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => n.userId === currentUser?.uid) // Only my notes
      .filter((n) => (filterFavorites ? n.isFavorite : true))
      .filter(
        (n) =>
          n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          n.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        // Sort by updated descending
        const da = normalizeDate(a.updatedAt).getTime()
        const db = normalizeDate(b.updatedAt).getTime()
        return db - da
      })
  }, [notes, searchTerm, filterFavorites, currentUser])

  // Handle Note Selection Data Sync
  const activeNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId),
    [notes, selectedNoteId]
  )

  // Loading state for creation/selection sync
  const isSyncingSelection = selectedNoteId && !activeNote

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title)
      setContent(activeNote.content)
    } else if (!selectedNoteId) {
      setTitle("")
      setContent("")
      setLastSaved(null)
    }
  }, [activeNote, selectedNoteId])

  // Auto-Save Logic
  const handleContentChange = (newContent: string) => {
    // Avoid updating state if we are in the process of deleting
    if (isDeletingRef.current) return
    setContent(newContent)
    triggerAutoSave(title, newContent)
  }

  const handleTitleChange = (newTitle: string) => {
    if (isDeletingRef.current) return
    setTitle(newTitle)
    triggerAutoSave(newTitle, content)
  }

  const triggerAutoSave = (t: string, c: string) => {
    if (!selectedNoteId || isDeletingRef.current) return

    setIsSaving(true)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(async () => {
      if (isDeletingRef.current) return // Double check inside timeout

      await updateNote(selectedNoteId, {
        title: t,
        content: c,
      })
      setIsSaving(false)
      setLastSaved(new Date())
    }, 1500) // 1.5s debounce
  }

  const handleCreateNote = async () => {
    if (!currentUser) return

    // Clear search to show the new note
    setSearchTerm("")
    setFilterFavorites(false)

    try {
      const newNote = await createEmptyNote(currentUser.uid)

      if (newNote) {
        setSelectedNoteId(newNote.id)
      }
    } catch (err: any) {
      console.error("Failed to create note:", err)
      alert(
        "Erreur lors de la création de la note: " +
          (err.message || JSON.stringify(err))
      )
    }
  }

  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    const noteToDelete = notes.find((n) => n.id === id)

    const isDefaultTitle =
      !noteToDelete?.title ||
      noteToDelete.title === "" ||
      noteToDelete.title === "Nouvelle Note" ||
      noteToDelete.title === "Sans titre"
    const contentText =
      noteToDelete?.content?.replace(/<[^>]*>?/gm, "").trim() || ""
    const isContentEmpty =
      !noteToDelete?.content ||
      noteToDelete?.content === "<p></p>" ||
      contentText === ""

    // Auto-delete if it looks like an untouched draft or empty note
    const shouldDeleteWithoutConfirm =
      isContentEmpty || (isDefaultTitle && contentText.length < 20)

    if (
      shouldDeleteWithoutConfirm ||
      window.confirm("Supprimer cette note définitivement ?")
    ) {
      // 1. Set Flag to prevent Auto-save from resurrecting the note
      isDeletingRef.current = true
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

      try {
        // 2. Optimistic UI clear if it's the selected one
        if (selectedNoteId === id) {
          setSelectedNoteId(null)
          setTitle("")
          setContent("")
        }

        // 3. Perform Delete
        await removeNote(id)
      } catch (err) {
        console.error("Failed to delete note", err)
        alert("Erreur lors de la suppression.")
      } finally {
        // 4. Reset Flag
        setTimeout(() => {
          isDeletingRef.current = false
        }, 500)
      }
    }
  }

  const toggleFavorite = async (note: Note, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    await updateNote(note.id, { isFavorite: !note.isFavorite })
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 pt-4 pb-6 lg:px-6">
      <MotivationalHeader
        section="notes"
        title=""
        subtitle="Gardez une trace de tout."
      />

      <div className="flex min-h-[calc(100vh-18rem)] flex-1 rounded-[30px] border border-border/60 bg-background/85 shadow-[0_20px_60px_-28px_hsl(var(--foreground)/0.18)] backdrop-blur-xl">
        <aside className="flex w-[320px] shrink-0 flex-col bg-background/55">
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.26em] text-muted-foreground uppercase">
                Notes
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Espace clinique
              </h2>
            </div>
            <Button size="icon-sm" onClick={handleCreateNote}>
              <HugeiconsIcon
                icon={Add01Icon}
                strokeWidth={2}
                className="size-4.5"
              />
            </Button>
          </div>

          <div className="space-y-3 px-5 pb-4">
            <div className="relative">
              <HugeiconsIcon
                icon={SearchIcon}
                strokeWidth={2}
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher une note..."
                className="h-10 rounded-2xl border-border/70 bg-background/80 pl-9 shadow-none"
              />
            </div>

            <ToggleGroup
              multiple={false}
              value={[filterFavorites ? "favorites" : "all"]}
              onValueChange={(value) => {
                setFilterFavorites(value[0] === "favorites")
              }}
              variant="outline"
              size="sm"
              spacing={0}
              className="w-fit rounded-2xl bg-muted/40 p-0.5"
            >
              {FILTER_OPTIONS.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-muted-foreground">
                {filteredNotes.length} note{filteredNotes.length > 1 ? "s" : ""}
              </span>
              {filterFavorites ? (
                <Badge variant="secondary" className="rounded-full">
                  Favoris
                </Badge>
              ) : null}
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            {loading ? (
              <div className="space-y-2 px-3 pb-4">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div
                    key={`notes-skeleton-item-${index}`}
                    className="rounded-2xl px-3 py-3"
                  >
                    <Skeleton className="mb-2 h-4 w-2/3 rounded-md" />
                    <Skeleton className="mb-2 h-3 w-4/5 rounded-md" />
                    <Skeleton className="h-3 w-1/3 rounded-md" />
                  </div>
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-5">
                <Empty className="rounded-3xl border border-dashed border-border/80 bg-muted/20">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon
                        icon={File01Icon}
                        strokeWidth={2}
                        className="size-5"
                      />
                    </EmptyMedia>
                    <EmptyTitle>Aucune note trouvée</EmptyTitle>
                    <EmptyDescription>
                      Créez une note pour commencer.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className="px-3 pb-4">
                {filteredNotes.map((note) => {
                  const isActive = selectedNoteId === note.id

                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => setSelectedNoteId(note.id)}
                      className={cn(
                        "group w-full rounded-2xl px-3 py-3 text-left transition-colors",
                        isActive
                          ? "bg-muted/70 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.9)]"
                          : "hover:bg-muted/35"
                      )}
                    >
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              isActive ? "text-foreground" : "text-foreground/88"
                            )}
                          >
                            {note.title || "Sans titre"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {extractNotePreview(note.content)}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          {note.isFavorite ? (
                            <HugeiconsIcon
                              icon={StarIcon}
                              strokeWidth={2}
                              className="size-3.5 text-amber-400"
                              fill="currentColor"
                            />
                          ) : null}
                          <span className="text-[11px] whitespace-nowrap text-muted-foreground">
                            {formatDate(note.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </aside>

        <Separator orientation="vertical" className="h-auto bg-border/60" />

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-r-[30px] bg-background/35">
          {isSyncingSelection ? (
            <div className="flex flex-1 animate-in flex-col items-center justify-center duration-200 fade-in">
              <Spinner className="mb-2 size-8 text-primary" />
              <p className="text-sm text-muted-foreground">
                Chargement de la note...
              </p>
            </div>
          ) : selectedNoteId ? (
            <>
              <div className="flex items-center justify-between border-b border-border/50 px-8 py-5">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold tracking-[0.24em] text-muted-foreground uppercase">
                    Note active
                  </p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>Modifiée le {formatDetailedDate(activeNote?.updatedAt)}</span>
                    {activeNote?.isFavorite ? (
                      <Badge variant="secondary" className="rounded-full">
                        Favorite
                      </Badge>
                    ) : null}
                    {isSaving ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Spinner className="size-3" />
                        Enregistrement...
                      </span>
                    ) : lastSaved ? (
                      <span className="inline-flex items-center gap-1.5">
                        <HugeiconsIcon
                          icon={Clock01Icon}
                          strokeWidth={2}
                          className="size-3"
                        />
                        Sauvegardé à{" "}
                        {lastSaved.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeNote ? (
                    <Button variant="ghost" size="sm" onClick={() => toggleFavorite(activeNote)}>
                      <HugeiconsIcon
                        icon={StarIcon}
                        strokeWidth={2}
                        className="size-4"
                        fill={activeNote.isFavorite ? "currentColor" : "none"}
                      />
                      {activeNote.isFavorite ? "Retirer" : "Favori"}
                    </Button>
                  ) : null}

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="sm" type="button" />}
                    >
                      <span>
                        Actions
                      </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {activeNote ? (
                        <DropdownMenuItem onClick={() => toggleFavorite(activeNote)}>
                          {activeNote.isFavorite
                            ? "Retirer des favoris"
                            : "Ajouter aux favoris"}
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() =>
                          activeNote && handleDeleteNote(activeNote.id)
                        }
                      >
                        Supprimer la note
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto flex w-full max-w-[72rem] flex-col px-14 py-10 lg:px-16">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Titre de la note"
                    className="w-full border-none bg-transparent text-[2.85rem] leading-[1.02] font-semibold tracking-[-0.045em] text-foreground outline-none placeholder:text-muted-foreground/35"
                  />

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      Bloc-notes clinique
                    </Badge>
                    <span>Tapez “/” pour les commandes et l’IA locale.</span>
                  </div>

                  <div className="mt-8 min-h-[520px]">
                    <BlockNoteShadcnEditor
                      initialContent={content}
                      onChange={handleContentChange}
                      editable={true}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <Empty className="animate-in duration-500 fade-in">
                <EmptyHeader>
                  <EmptyMedia
                    variant="icon"
                    className="size-20 rotate-3 rounded-3xl"
                  >
                    <HugeiconsIcon
                      icon={File01Icon}
                      strokeWidth={1}
                      className="size-10"
                    />
                  </EmptyMedia>
                  <EmptyTitle className="text-xl">
                    Aucune note sélectionnée
                  </EmptyTitle>
                  <EmptyDescription className="max-w-sm leading-relaxed">
                    Choisissez une note à gauche ou créez-en une nouvelle pour
                    retrouver une expérience de rédaction plus proche de Notion.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={handleCreateNote} size="lg">
                    <HugeiconsIcon
                      icon={Add01Icon}
                      strokeWidth={2}
                      data-icon="inline-start"
                      className="size-5"
                    />
                    Créer une note
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Notes
