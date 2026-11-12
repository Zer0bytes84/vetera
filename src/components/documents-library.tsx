import { BookOpen, Bookmark, Copy, Download, ExternalLink, FileText, Folder, Image as ImageIcon, Link2, MoreHorizontal, Paperclip, Pin, Plus, Search, SearchX, Star, Trash2, X } from "lucide-react";
import { DocumentTextIcon } from "@heroicons/react/20/solid";
import { useRef, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { EmptyState, IconButton, SearchField } from "@/components/ui/tuff-controls";
import {
  KIND_LABELS,
  LIBRARY_FILTERS,
  formatSize,
  linkTitle,
  matchesFilter,
  matchesQuery,
  normalizeLinkUrl,
  sortEntries,
  type LibraryEntry,
  type LibraryFilter,
  type LibraryKind,
} from "@/modules/documents/lib/library";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/db";

/**
 * The Documents page, as the Docs page of TuffUI: a white page, the title with its small « + », a magnifier at the far
 * right, the kinds as pills, then one rounded block of plain rows. The « + » adds a document, a file, an image or a
 * link. A row opens what it holds: a document in the editor, an image in a preview, a file as a download, a link in the
 * browser. The pin sits at the row's end; every other action is in the « … » menu.
 */

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

const FILTER_ICONS: Record<LibraryFilter, Icon> = { all: Folder, document: FileText, file: Paperclip, image: ImageIcon, link: Link2 };
const KIND_ICONS: Record<LibraryKind, Icon> = {
  document: ({ className }) => <DocumentTextIcon className={className} />,
  file: Paperclip,
  image: ImageIcon,
  link: Link2,
};

const date = (value: string) => {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
};

/** Plain round buttons, as TuffUI's own: the Clean skin sizes every `[data-slot="button"]` by force, a circle needs a bare one. */
const ROUND = "inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-150 outline-none hover:bg-foreground/[0.1] focus-visible:ring-2 focus-visible:ring-ring/40";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/** What a row says under its title: its kind first, then what tells it apart. */
function detailOf(entry: LibraryEntry, folder: string) {
  const parts: string[] = [KIND_LABELS[entry.kind]];
  if (entry.kind === "link" && entry.item?.url) parts.push(linkTitle(entry.item.url));
  if ((entry.kind === "file" || entry.kind === "image") && entry.item?.size) parts.push(formatSize(entry.item.size));
  if (entry.patientId) parts.push(folder);
  const changed = date(entry.updatedAt);
  if (entry.kind === "document" && changed) parts.push(`Modifié le ${changed}`);
  return parts.join(" · ");
}

export function DocumentsLibrary({
  entries,
  filter,
  headerActions,
  patientActive,
  patientPicker,
  patientName,
  onFilter,
  onCreateDocument,
  onAddFiles,
  onAddLink,
  onOpenDocument,
  onOpenAssistant,
  onDuplicate,
  onExport,
  onOpenLink,
  onCopyLink,
  onDownload,
  onToggleFavorite,
  onTogglePin,
  onDelete,
}: {
  /** The notes and the items, already limited to the chosen folder. */
  entries: LibraryEntry[];
  filter: LibraryFilter;
  /** At the far right, left of the magnifier: the assistant. */
  headerActions?: ReactNode;
  /** A folder filter is on: the search row stays open so the list never looks filtered for no reason. */
  patientActive: boolean;
  /** In the search row: the folder picker. */
  patientPicker: ReactNode;
  patientName: (patientId?: string | null) => string;
  onFilter: (filter: LibraryFilter) => void;
  onCreateDocument: () => void;
  onAddFiles: (files: File[], wanted: "file" | "image") => void;
  onAddLink: (url: string, title: string) => void;
  onOpenDocument: (noteId: string) => void;
  onOpenAssistant: (note: Note) => void;
  onDuplicate: (note: Note) => void;
  onExport: (note: Note) => void;
  onOpenLink: (url: string) => void;
  onCopyLink: (url: string) => void;
  onDownload: (entry: LibraryEntry) => void;
  onToggleFavorite: (entry: LibraryEntry) => void;
  onTogglePin: (entry: LibraryEntry) => void;
  onDelete: (entry: LibraryEntry) => void;
}) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [preview, setPreview] = useState<LibraryEntry | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  const shown = sortEntries(entries.filter((entry) => matchesFilter(entry, filter) && matchesQuery(entry, query)));
  const searching = query.trim() !== "";
  const showSearch = searchOpen || searching || patientActive;
  const normalizedUrl = normalizeLinkUrl(linkUrl);

  const toggleSearch = () => {
    if (showSearch) {
      setQuery("");
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
    }
  };

  const picked = (wanted: "file" | "image") => (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length) onAddFiles(files, wanted);
  };

  const submitLink = (event: FormEvent) => {
    event.preventDefault();
    if (!normalizedUrl) return;
    onAddLink(normalizedUrl, linkName.trim() || linkTitle(normalizedUrl));
    setLinkOpen(false);
    setLinkUrl("");
    setLinkName("");
  };

  const open = (entry: LibraryEntry) => {
    if (entry.kind === "document") onOpenDocument(entry.id);
    else if (entry.kind === "link" && entry.item?.url) onOpenLink(entry.item.url);
    else if (entry.kind === "image") setPreview(entry);
    else onDownload(entry);
  };

  const emptyTitle = searching ? "Aucun résultat" : filter === "all" ? "Rien ici pour l’instant" : `Aucun ${KIND_LABELS[filter as LibraryKind].toLowerCase()}`;
  const emptyText = searching
    ? `Rien ne correspond à « ${query.trim()} ».`
    : filter === "all"
      ? "Écrivez un document, ajoutez un fichier, une image ou un lien."
      : "Utilisez le + pour en ajouter un.";

  return (
    <section aria-label="Documents" className="mx-auto flex w-full max-w-[40rem] flex-col gap-4 pb-8">
      <div className="flex items-center gap-2">
        <h2 className="text-xl/8 font-semibold">Documents</h2>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<button aria-label="Ajouter" className={cn(ROUND, "size-7 bg-foreground/[0.07] text-foreground")} title="Ajouter" type="button" />}
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={onCreateDocument}>
              <DocumentTextIcon aria-hidden="true" className="mr-2 size-4" />
              Nouveau document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInput.current?.click()}>
              <Paperclip aria-hidden="true" className="mr-2 size-4" strokeWidth={1.75} />
              Ajouter un fichier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => imageInput.current?.click()}>
              <ImageIcon aria-hidden="true" className="mr-2 size-4" strokeWidth={1.75} />
              Ajouter une image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLinkOpen(true)}>
              <Link2 aria-hidden="true" className="mr-2 size-4" strokeWidth={1.75} />
              Ajouter un lien
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto flex items-center gap-1">
          {headerActions}
          <IconButton icon={showSearch ? X : Search} label={showSearch ? "Fermer la recherche" : "Rechercher"} onClick={toggleSearch} />
        </div>
      </div>

      <input aria-label="Choisir un fichier" className="sr-only" hidden multiple onChange={picked("file")} ref={fileInput} tabIndex={-1} type="file" />
      <input accept={IMAGE_ACCEPT} aria-label="Choisir une image" className="sr-only" hidden multiple onChange={picked("image")} ref={imageInput} tabIndex={-1} type="file" />

      {showSearch ? (
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            autoFocus
            className="min-w-48 flex-1"
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery("")}
            onKeyDown={(event) => {
              if (event.key === "Escape") toggleSearch();
            }}
            placeholder="Rechercher un document"
            value={query}
          />
          {patientPicker}
        </div>
      ) : null}

      <div aria-label="Filtrer les documents" className="flex flex-wrap gap-1 self-start rounded-full bg-foreground/[0.06] p-1" role="group">
        {LIBRARY_FILTERS.map((option) => {
          const FilterIcon = FILTER_ICONS[option.value];
          const active = filter === option.value;
          return (
            <button
              aria-pressed={active}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-colors duration-150",
                active ? "bg-[var(--card-inset)] font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              key={option.value}
              onClick={() => onFilter(option.value)}
              type="button"
            >
              <FilterIcon aria-hidden="true" className="size-3.5" strokeWidth={2} />
              {option.label}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <EmptyState description={emptyText} icon={searching ? SearchX : FileText} title={emptyTitle} />
      ) : (
        <ul aria-label="Documents" className="flex flex-col gap-px overflow-hidden rounded-2xl bg-background">
          {shown.map((entry) => {
            const KindIcon = KIND_ICONS[entry.kind];
            const folder = patientName(entry.patientId);
            return (
              <li
                className="group relative flex items-center gap-1 bg-[var(--card-band)] pr-2 transition-colors duration-150 hover:bg-foreground/[0.07] has-[[data-list-row][data-current]]:bg-foreground/[0.07]"
                key={`${entry.kind}:${entry.id}`}
              >
                <button
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
                  data-list-row=""
                  data-row-id={entry.id}
                  onClick={() => open(entry)}
                  type="button"
                >
                  <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white dark:text-zinc-900">
                    <KindIcon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{entry.title}</span>
                      {entry.isFavorite ? <Star aria-label="Favori" className="size-3 shrink-0 fill-current text-warning" strokeWidth={1.5} /> : null}
                    </span>
                    <span className="block truncate text-[0.8125rem] text-muted-foreground">{detailOf(entry, folder)}</span>
                  </span>
                </button>
                <IconButton
                  aria-pressed={entry.isPinned}
                  className={cn(entry.isPinned ? "text-brand" : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100")}
                  icon={Pin}
                  label={entry.isPinned ? `Désépingler ${entry.title}` : `Épingler ${entry.title}`}
                  onClick={() => onTogglePin(entry)}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<button aria-label={`Plus d’actions pour ${entry.title}`} className={cn(ROUND, "size-8 text-muted-foreground hover:text-foreground")} type="button" />}
                  >
                    <MoreHorizontal aria-hidden="true" className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {entry.kind === "link" && entry.item?.url ? (
                      <>
                        <DropdownMenuItem onClick={() => onOpenLink(entry.item!.url!)}>
                          <ExternalLink className="mr-2 size-4" strokeWidth={1.5} />
                          Ouvrir le lien
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCopyLink(entry.item!.url!)}>
                          <Copy className="mr-2 size-4" strokeWidth={1.5} />
                          Copier l’adresse
                        </DropdownMenuItem>
                      </>
                    ) : null}
                    {entry.kind === "image" ? (
                      <DropdownMenuItem onClick={() => setPreview(entry)}>
                        <ImageIcon className="mr-2 size-4" strokeWidth={1.5} />
                        Aperçu
                      </DropdownMenuItem>
                    ) : null}
                    {entry.kind === "file" || entry.kind === "image" ? (
                      <DropdownMenuItem onClick={() => onDownload(entry)}>
                        <Download className="mr-2 size-4" strokeWidth={1.5} />
                        Télécharger
                      </DropdownMenuItem>
                    ) : null}
                    {entry.note ? (
                      <>
                        <DropdownMenuItem onClick={() => onDuplicate(entry.note!)}>
                          <Copy className="mr-2 size-4" strokeWidth={1.5} />
                          Dupliquer la note
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onOpenAssistant(entry.note!)}>
                          <BookOpen className="mr-2 size-4" strokeWidth={1.5} />
                          Ouvrir dans l'assistant
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onExport(entry.note!)}>
                          <Download className="mr-2 size-4" strokeWidth={1.5} />
                          Exporter (.md)
                        </DropdownMenuItem>
                      </>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onToggleFavorite(entry)}>
                      <Star className="mr-2 size-4" strokeWidth={1.5} />
                      {entry.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onTogglePin(entry)}>
                      <Bookmark className="mr-2 size-4" strokeWidth={1.5} />
                      {entry.isPinned ? "Désépingler" : "Épingler"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(entry)}>
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

      <Dialog onOpenChange={(next) => { if (!next) setLinkOpen(false); }} open={linkOpen}>
        <DialogContent>
          <form className="grid gap-4" onSubmit={submitLink}>
            <DialogHeader>
              <DialogTitle>Ajouter un lien</DialogTitle>
              <DialogDescription>L’adresse d’un site ou d’un e-mail. Un titre est facultatif.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <label className="text-[0.8125rem] font-medium" htmlFor="library-link-url">Adresse</label>
              <Input autoFocus id="library-link-url" inputMode="url" onChange={(event) => setLinkUrl(event.target.value)} placeholder="exemple.dz" value={linkUrl} />
              {linkUrl.trim() && !normalizedUrl ? (
                <p className="text-[0.8125rem] text-destructive" role="alert">Cette adresse n’est pas valide. Seuls les liens web (http, https) et les e-mails sont acceptés.</p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <label className="text-[0.8125rem] font-medium" htmlFor="library-link-title">Titre</label>
              <Input id="library-link-title" onChange={(event) => setLinkName(event.target.value)} placeholder={normalizedUrl ? linkTitle(normalizedUrl) : "Nom affiché dans la liste"} value={linkName} />
            </div>
            <DialogFooter>
              <Button onClick={() => setLinkOpen(false)} type="button" variant="ghost">Annuler</Button>
              <Button disabled={!normalizedUrl} type="submit">Ajouter</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(next) => { if (!next) setPreview(null); }} open={preview !== null}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{preview?.title}</DialogTitle>
            <DialogDescription>{preview ? detailOf(preview, patientName(preview.patientId)) : ""}</DialogDescription>
          </DialogHeader>
          {preview?.item?.dataUrl ? (
            <img alt={preview.title} className="mx-auto max-h-[65vh] w-auto max-w-full rounded-xl object-contain" src={preview.item.dataUrl} />
          ) : null}
          <DialogFooter>
            <Button onClick={() => setPreview(null)} type="button" variant="ghost">Fermer</Button>
            <Button onClick={() => preview && onDownload(preview)} type="button">
              <Download aria-hidden="true" className="size-4" /> Télécharger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
