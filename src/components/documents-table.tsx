import { BookOpen, Bookmark, Copy, Download, FileText, MoreHorizontal, Pin, Plus, SearchX, Star, Trash2 } from "lucide-react";
import { DocumentTextIcon } from "@heroicons/react/20/solid";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { EmptyState, IconButton, SearchField } from "@/components/ui/tuff-controls";
import { cn } from "@/lib/utils";
import { ViewSwitch } from "@/modules/dashboard/components/view-switch";
import { formatDisplayText } from "@/utils/display-format";
import type { Note } from "@/types/db";

/**
 * The library as a plain list, after TuffUI's Docs page: one search field, the filters as pills, and a row per document
 * on two lines (the title, then its folder and its last change). The pin sits at the row's end; every other action
 * (favourite, duplicate, assistant, export, delete) stays in the « … » menu. A row opens the note.
 * The search reads the title, the folder and the body of the notes.
 */

export type DocumentFilter = "all" | "recent" | "favorites" | "pinned";

const FILTERS: { value: DocumentFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "recent", label: "Récents" },
  { value: "favorites", label: "Favoris" },
  { value: "pinned", label: "Épinglés" },
];

const date = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** The note's text without its HTML tags: the search field reads this value, so a word from the body finds the note. */
export const notePlainText = (content: string) =>
  content.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const pinned = (note: Note) => Boolean((note as Note & { isPinned?: boolean }).isPinned);

/** Whether a note answers the search: its title, its folder or its body contains every word typed. */
export const noteMatches = (note: Note, folder: string, query: string) => {
  const words = query.trim().toLocaleLowerCase("fr").split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = `${formatDisplayText(note.title || "Sans titre")} ${folder} ${notePlainText(note.content)}`.toLocaleLowerCase("fr");
  return words.every((word) => haystack.includes(word));
};

export function DocumentsTable({
  notes,
  filter,
  filters,
  headerActions,
  patientName,
  onCreate,
  onFilter,
  onOpen,
  onOpenAssistant,
  onToggleFavorite,
  onTogglePin,
  onDuplicate,
  onExport,
  onDelete,
}: {
  notes: Note[];
  filter: DocumentFilter;
  /** Beside the search field: the patient picker. */
  filters: ReactNode;
  /** In the band, left of the « + »: the secondary pages (assistant, templates). */
  headerActions?: ReactNode;
  patientName: (patientId?: string | null) => string;
  /** The « + »: a blank page, in one gesture. */
  onCreate: () => void;
  onFilter: (filter: DocumentFilter) => void;
  onOpen: (noteId: string) => void;
  onOpenAssistant: (note: Note) => void;
  onToggleFavorite: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onDuplicate: (note: Note) => void;
  onExport: (note: Note) => void;
  onDelete: (noteId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const shown = notes.filter((note) => noteMatches(note, patientName(note.patientId), query));
  const word = shown.length === 1 ? "document" : "documents";
  const searching = query.trim() !== "";

  return (
    <Shell>
      <ShellHeader
        aside={
          <>
            {headerActions}
            <Button aria-label="Nouveau document" className="size-9 rounded-full" onClick={onCreate} size="icon" title="Nouveau document" type="button">
              <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
            </Button>
          </>
        }
        as="h2"
        icon={DocumentTextIcon}
        subtitle={`${shown.length} ${word}`}
        title="Documents"
      />
      <Panel className="p-2">
        <div className="flex flex-wrap items-center gap-2 p-1 pb-2">
          <SearchField
            className="min-w-48 flex-1"
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery("")}
            placeholder="Rechercher un document"
            value={query}
          />
          <ViewSwitch<DocumentFilter> label="Filtrer les documents" onChange={onFilter} options={FILTERS} value={filter} />
          {filters}
        </div>

        {shown.length === 0 ? (
          <EmptyState
            action={
              searching || filter !== "all" ? undefined : (
                <Button className="mt-4 rounded-full" onClick={onCreate} size="sm" type="button">
                  <Plus aria-hidden="true" className="size-4" /> Nouveau document
                </Button>
              )
            }
            description={
              searching
                ? `Rien ne correspond à « ${query.trim()} ».`
                : filter === "all"
                  ? "Écrivez un document, il apparaîtra ici."
                  : "Choisissez Tous pour retrouver les autres documents."
            }
            icon={searching ? SearchX : FileText}
            title={searching ? "Aucun résultat" : filter === "all" ? "Rien ici pour l’instant" : "Aucun document dans cette vue"}
          />
        ) : (
          <ul aria-label="Documents" className="flex flex-col">
            {shown.map((note) => {
              const title = formatDisplayText(note.title || "Sans titre");
              const isPinned = pinned(note);
              return (
                <li
                  className="group relative flex items-center gap-1 rounded-xl pr-2 transition-colors duration-150 hover:bg-foreground/[0.05] has-[[data-list-row][data-current]]:bg-foreground/[0.06]"
                  key={note.id}
                >
                  <button
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    data-list-row=""
                    data-row-id={note.id}
                    onClick={() => onOpen(note.id)}
                    type="button"
                  >
                    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                      <DocumentTextIcon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{title}</span>
                        {note.isFavorite ? <Star aria-label="Favori" className="size-3 shrink-0 fill-current text-warning" strokeWidth={1.5} /> : null}
                      </span>
                      <span className="block truncate text-[0.8125rem] text-muted-foreground">
                        {patientName(note.patientId)} · Modifié le {date(note.updatedAt)}
                      </span>
                    </span>
                  </button>
                  <IconButton
                    aria-pressed={isPinned}
                    className={cn(isPinned ? "text-brand" : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100")}
                    icon={Pin}
                    label={isPinned ? `Désépingler ${title}` : `Épingler ${title}`}
                    onClick={() => onTogglePin(note)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button aria-label={`Plus d’actions pour ${title}`} className="rounded-full" size="icon-sm" variant="ghost" />}
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => onToggleFavorite(note)}>
                        <Star className="mr-2 size-4" strokeWidth={1.5} />
                        {note.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onTogglePin(note)}>
                        <Bookmark className="mr-2 size-4" strokeWidth={1.5} />
                        {isPinned ? "Désépingler" : "Épingler"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(note)}>
                        <Copy className="mr-2 size-4" strokeWidth={1.5} />
                        Dupliquer la note
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onOpenAssistant(note)}>
                        <BookOpen className="mr-2 size-4" strokeWidth={1.5} />
                        Ouvrir dans l'assistant
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport(note)}>
                        <Download className="mr-2 size-4" strokeWidth={1.5} />
                        Exporter (.md)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(note.id)}>
                        <Trash2 className="mr-2 size-4" strokeWidth={1.5} />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </Shell>
  );
}
