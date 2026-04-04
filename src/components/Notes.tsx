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
import Editor from "./Editor"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

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

  const toggleFavorite = async (note: Note, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await updateNote(note.id, { isFavorite: !note.isFavorite })
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 pt-4 pb-6 lg:px-6">
      <MotivationalHeader
        section="notes"
        title=""
        subtitle="Gardez une trace de tout."
      />

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Sidebar List */}
        <Card className="flex w-[320px] shrink-0 flex-col overflow-hidden rounded-2xl py-0">
          <CardHeader className="border-b px-4 py-4">
            <CardTitle className="text-lg font-bold">Notes</CardTitle>
            <CardAction>
              <Button
                size="icon-sm"
                onClick={handleCreateNote}
                className="rounded-[0.95rem] bg-[linear-gradient(135deg,#316CFF,#6F7CFF)] shadow-[0_18px_35px_rgba(49,108,255,0.24)] transition-all duration-300 hover:scale-105 hover:shadow-[0_18px_35px_rgba(49,108,255,0.32)] active:scale-95"
              >
                <HugeiconsIcon
                  icon={Add01Icon}
                  strokeWidth={2}
                  className="size-4.5"
                />
              </Button>
            </CardAction>
          </CardHeader>

          <CardContent className="flex flex-col gap-3 px-4 py-4">
            {/* Search */}
            <div className="relative">
              <HugeiconsIcon
                icon={SearchIcon}
                strokeWidth={2}
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                className="h-9 pl-9"
              />
            </div>

            {/* Tabs */}
            <ToggleGroup
              multiple={false}
              value={[filterFavorites ? "favorites" : "all"]}
              onValueChange={(value) => {
                setFilterFavorites(value[0] === "favorites")
              }}
              variant="outline"
              size="sm"
              spacing={0}
              className="w-fit rounded-3xl bg-muted/30 p-0.5"
            >
              {FILTER_OPTIONS.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </CardContent>

          <Separator />

          {/* Notes List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex justify-center p-8">
                <Spinner className="size-5 text-muted-foreground" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-6">
                <Empty className="border border-dashed border-border/80 bg-muted/20">
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
                      Créez une nouvelle note pour commencer.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={cn(
                      "group relative cursor-pointer border-l-4 p-4 pr-12 transition-colors hover:bg-muted/30",
                      selectedNoteId === note.id
                        ? "border-l-primary bg-muted/20 shadow-sm"
                        : "border-l-transparent"
                    )}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3
                        className={cn(
                          "truncate text-sm font-semibold",
                          selectedNoteId === note.id
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {note.title || "Sans titre"}
                      </h3>
                      <span className="shrink-0 text-[10px] whitespace-nowrap text-muted-foreground">
                        {formatDate(note.updatedAt)}
                      </span>
                    </div>
                    <p className="h-4 truncate text-xs text-muted-foreground">
                      {note.content.replace(/<[^>]*>?/gm, "") || "Vide..."}
                    </p>

                    {/* Quick Actions */}
                    <div className="absolute top-1/2 right-2 z-10 flex -translate-y-1/2 flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => toggleFavorite(note, e)}
                        className={cn(
                          "transition-all",
                          note.isFavorite
                            ? "text-amber-400 opacity-100"
                            : "text-muted-foreground opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <HugeiconsIcon
                          icon={StarIcon}
                          strokeWidth={2}
                          className="size-3.5"
                          fill={note.isFavorite ? "currentColor" : "none"}
                        />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <HugeiconsIcon
                          icon={Delete01Icon}
                          strokeWidth={2}
                          className="size-3.5"
                        />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Main Editor Area */}
        <Card className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl py-0">
          {isSyncingSelection ? (
            <div className="flex flex-1 animate-in flex-col items-center justify-center duration-200 fade-in">
              <Spinner className="mb-2 size-8 text-primary" />
              <p className="text-sm text-muted-foreground">
                Chargement de la note...
              </p>
            </div>
          ) : selectedNoteId ? (
            <>
              {/* Toolbar / Header */}
              <CardHeader className="flex h-16 shrink-0 flex-row items-center justify-between border-b px-8 py-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isSaving ? (
                    <>
                      <Spinner className="size-3" /> Enregistrement...
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon
                        icon={Clock01Icon}
                        strokeWidth={2}
                        className="size-3"
                      />{" "}
                      Sauvegardé à{" "}
                      {lastSaved?.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </>
                  )}
                </div>

                <CardAction>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      activeNote && handleDeleteNote(activeNote.id)
                    }
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Supprimer la note"
                  >
                    <HugeiconsIcon
                      icon={Delete01Icon}
                      strokeWidth={2}
                      className="size-4.5"
                    />
                  </Button>
                </CardAction>
              </CardHeader>

              {/* Note Content */}
              <CardContent className="flex-1 overflow-y-auto px-0">
                <div className="mx-auto max-w-3xl px-8 py-12">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Titre de la note médicale..."
                    className="mb-8 w-full border-none bg-transparent text-4xl font-bold text-foreground outline-none placeholder:text-muted-foreground/40"
                  />

                  <Editor content={content} onUpdate={handleContentChange} />
                </div>
              </CardContent>
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
                    Sélectionnez une note dans la liste latérale ou créez-en une
                    nouvelle pour commencer à rédiger avec l'aide de l'IA.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    onClick={handleCreateNote}
                    className="rounded-[0.95rem] bg-[linear-gradient(135deg,#316CFF,#6F7CFF)] px-6 py-3 shadow-[0_18px_35px_rgba(49,108,255,0.24)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_18px_35px_rgba(49,108,255,0.32)] active:scale-95"
                  >
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
        </Card>
      </div>
    </div>
  )
}

export default Notes
