import { BookOpen, Bookmark, Copy, Download, FilePlus, FileText, MoreHorizontal, Pin, Star, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn, type DataRow } from "@/components/ui/data-table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusPill } from "@/components/ui/status-pill";
import { ViewSwitch } from "@/modules/dashboard/components/view-switch";
import { formatDisplayText } from "@/utils/display-format";
import type { Note } from "@/types/db";

/**
 * The library's documents as TuffUI's Data Table: sortable columns (title, folder, last change), the filter field, pages, a
 * selection, a CSV export, the state (pinned, favourite) as pills. A row opens the note in the editor; its menu keeps every
 * action the library's list had: favourite, pin, duplicate, follow-up, export, delete.
 */

export type DocumentFilter = "all" | "recent" | "favorites" | "pinned";

const FILTERS: { value: DocumentFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "recent", label: "Récents" },
  { value: "favorites", label: "Favoris" },
  { value: "pinned", label: "Épinglés" },
];

interface DocumentRow extends DataRow {
  title: string;
  folder: string;
  updated: string;
  state: string;
  actions: string;
}

const date = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** The note's text without its HTML tags: the filter field searches this raw
 * value, so a word from the body finds the note, as the placeholder promises. */
const notePlainText = (content: string) =>
  content.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export function DocumentsTable({
  notes,
  filter,
  filters,
  patientName,
  onFilter,
  onOpen,
  onOpenAssistant,
  onToggleFavorite,
  onTogglePin,
  onDuplicate,
  onFollowUp,
  onExport,
  onDelete,
}: {
  notes: Note[];
  filter: DocumentFilter;
  /** Beside the filter field: the patient picker. */
  filters: ReactNode;
  patientName: (patientId?: string | null) => string;
  onFilter: (filter: DocumentFilter) => void;
  onOpen: (noteId: string) => void;
  onOpenAssistant: (note: Note) => void;
  onToggleFavorite: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onDuplicate: (note: Note) => void;
  onFollowUp: (note: Note) => void;
  onExport: (note: Note) => void;
  onDelete: (noteId: string) => void;
}) {
  const byId = new Map(notes.map((note) => [note.id, note]));
  const pinned = (note: Note) => Boolean((note as Note & { isPinned?: boolean }).isPinned);
  const rows: DocumentRow[] = notes.map((note) => ({
    id: note.id,
    title: formatDisplayText(note.title || "Sans titre"),
    folder: patientName(note.patientId),
    updated: note.updatedAt,
    state: [pinned(note) ? "Épinglé" : "", note.isFavorite ? "Favori" : ""].filter(Boolean).join(" · "),
    // Raw value of the actions column: the note's full text, so the filter field finds words of the content.
    actions: notePlainText(note.content),
  }));

  const columns: DataColumn<DocumentRow>[] = [
    {
      key: "title",
      label: "Document",
      sortable: true,
      format: (value) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="max-w-80 truncate text-sm font-medium">{String(value)}</span>
        </span>
      ),
    },
    { key: "folder", label: "Dossier", sortable: true, priority: 2, format: (value) => <span className="text-muted-foreground">{String(value)}</span> },
    {
      key: "updated",
      label: "Modifié",
      sortable: true,
      priority: 2,
      format: (value) => <span className="tabular-nums text-muted-foreground">{date(String(value))}</span>,
    },
    {
      key: "state",
      label: "État",
      sortable: true,
      priority: 1,
      format: (_, row) => {
        const note = byId.get(row.id)!;
        return (
          <span className="flex flex-wrap gap-1">
            {pinned(note) ? (
              <StatusPill icon={Pin} size="sm" tone="brand">
                Épinglé
              </StatusPill>
            ) : null}
            {note.isFavorite ? (
              <StatusPill icon={Star} size="sm" tone="warning">
                Favori
              </StatusPill>
            ) : null}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      hideLabel: true,
      noExport: true,
      priority: 1,
      format: (_, row) => {
        const note = byId.get(row.id)!;
        return (
          <div className="flex items-center justify-end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button aria-label={`Plus d’actions pour ${row.title}`} className="rounded-full" size="icon-sm" variant="ghost" />}
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
                  {pinned(note) ? "Désépingler" : "Épingler"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(note)}>
                  <Copy className="mr-2 size-4" strokeWidth={1.5} />
                  Dupliquer la note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenAssistant(note)}>
                  <BookOpen className="mr-2 size-4" strokeWidth={1.5} />
                  Ouvrir dans l'assistant
                </DropdownMenuItem>
                {note.patientId ? (
                  <DropdownMenuItem onClick={() => onFollowUp(note)}>
                    <FilePlus className="mr-2 size-4" strokeWidth={1.5} />
                    Nouveau suivi clinique
                  </DropdownMenuItem>
                ) : null}
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
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      emptyDescription={filter === "all" ? "Vos notes apparaîtront ici après leur création." : "Choisissez Tous pour retrouver les autres documents."}
      emptyTitle={filter === "all" ? "Aucun document" : "Aucun document dans cette vue"}
      exportName="documents"
      filters={filters}
      icon={FileText}
      noun={["document", "documents"]}
      onRowClick={(row) => onOpen(row.id)}
      pageSize={10}
      rowProps={(row) => ({
        tabIndex: 0,
        onKeyDown: (event) => {
          if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            onOpen(row.id);
          }
        },
        ...({ "data-list-row": "", "data-row-id": row.id } as object),
      })}
      searchPlaceholder="Titre, dossier ou contenu"
      title="Documents"
      toolbar={<ViewSwitch<DocumentFilter> label="Filtrer les documents" onChange={onFilter} options={FILTERS} value={filter} />}
    />
  );
}
