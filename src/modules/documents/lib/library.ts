import { formatDisplayText } from "@/utils/display-format";
import type { LibraryItem, Note } from "@/types/db";

/**
 * The Documents page lists three kinds of things side by side: the notes (« Document »), and the files, images and links
 * the clinic keeps there. Everything here is pure: what a row shows, how the filters and the search read it, what a file
 * or an address must be to be kept.
 */

export type LibraryFilter = "all" | "document" | "file" | "image" | "link";
export type LibraryKind = "document" | "file" | "image" | "link";

export const LIBRARY_FILTERS: { value: LibraryFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "document", label: "Documents" },
  { value: "file", label: "Fichiers" },
  { value: "image", label: "Images" },
  { value: "link", label: "Liens" },
];

export const KIND_LABELS: Record<LibraryKind, string> = { document: "Document", file: "Fichier", image: "Image", link: "Lien" };

/** The bytes of a file are kept in the clinic's base: a ceiling keeps it, and every list reading it, light. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export interface LibraryEntry {
  kind: LibraryKind;
  id: string;
  title: string;
  patientId: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  updatedAt: string;
  createdAt: string;
  /** Everything the search field reads. */
  text: string;
  note?: Note;
  item?: LibraryItem;
}

/** The note's text without its HTML tags: the search field reads this value, so a word from the body finds the note. */
export const notePlainText = (content: string) =>
  content.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export const noteTitle = (note: Pick<Note, "title">) => formatDisplayText(note.title || "Sans titre");

export function entriesFrom(notes: Note[], items: LibraryItem[], patientName: (patientId?: string | null) => string): LibraryEntry[] {
  const fromNotes = notes.map((note): LibraryEntry => ({
    kind: "document",
    id: note.id,
    title: noteTitle(note),
    patientId: note.patientId ?? null,
    isFavorite: Boolean(note.isFavorite),
    isPinned: Boolean(note.isPinned),
    updatedAt: note.updatedAt,
    createdAt: note.createdAt,
    text: `${noteTitle(note)} ${patientName(note.patientId)} ${notePlainText(note.content)}`,
    note,
  }));
  const fromItems = items.map((item): LibraryEntry => ({
    kind: item.kind,
    id: item.id,
    title: item.title,
    patientId: item.patientId ?? null,
    isFavorite: Boolean(item.isFavorite),
    isPinned: Boolean(item.isPinned),
    updatedAt: item.updatedAt,
    createdAt: item.createdAt,
    text: `${item.title} ${patientName(item.patientId)} ${item.url ?? ""} ${item.mimeType ?? ""}`,
    item,
  }));
  return [...fromNotes, ...fromItems];
}

/** Pinned first, then the latest change first. */
export function sortEntries(entries: LibraryEntry[]): LibraryEntry[] {
  const time = (value: string) => {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return [...entries].sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || time(b.updatedAt) - time(a.updatedAt));
}

export const matchesFilter = (entry: LibraryEntry, filter: LibraryFilter) => filter === "all" || entry.kind === filter;

/** Whether an entry answers the search: every word typed is in its title, folder, body or address. */
export function matchesQuery(entry: LibraryEntry, query: string) {
  const words = query.trim().toLocaleLowerCase("fr").split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = entry.text.toLocaleLowerCase("fr");
  return words.every((word) => haystack.includes(word));
}

/** How many entries each filter would show, for the pills. */
export function countByKind(entries: LibraryEntry[]): Record<LibraryFilter, number> {
  const counts: Record<LibraryFilter, number> = { all: entries.length, document: 0, file: 0, image: 0, link: 0 };
  for (const entry of entries) counts[entry.kind] += 1;
  return counts;
}

/**
 * The address a link keeps, or null when it is not one a clinic should open. Only web and mail addresses pass: a
 * `javascript:`, `data:` or `file:` address is refused, and a bare « exemple.dz » becomes https://exemple.dz.
 */
export function normalizeLinkUrl(input: string): string | null {
  const text = input.trim();
  if (!text || /\s/.test(text)) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(text);
  // « localhost:3000 » and « exemple.dz:8080 » look like a scheme but are a host and a port.
  const hostAndPort = /^[^/?#:]+:\d+(?:[/?#]|$)/.test(text);
  const candidate = hasScheme && !hostAndPort ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol === "mailto:") return /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+/i.test(candidate) ? url.href : null;
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
  return url.href;
}

/** A readable title for a link kept without one: its site, without « www. ». */
export function linkTitle(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "mailto:") return parsed.pathname;
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export type FileVerdict = { ok: true; kind: "file" | "image" } | { ok: false; reason: string };

/** Whether a file can be kept, and as what. An image is only an image of a kind a page can show safely (no SVG). */
export function judgeFile(file: Pick<File, "name" | "size" | "type">, wanted: "file" | "image"): FileVerdict {
  if (file.size === 0) return { ok: false, reason: `« ${file.name} » est vide.` };
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: `« ${file.name} » dépasse ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} Mo (${(file.size / 1024 / 1024).toFixed(1).replace(".", ",")} Mo).` };
  }
  if (wanted === "image") {
    return IMAGE_TYPES.has(file.type) ? { ok: true, kind: "image" } : { ok: false, reason: `« ${file.name} » n’est pas une image PNG, JPEG, WebP ou GIF.` };
  }
  // A picture added as a file is still a picture, shown as one.
  return { ok: true, kind: IMAGE_TYPES.has(file.type) ? "image" : "file" };
}

export const readFileAsDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Lecture impossible")));
    reader.onerror = () => reject(reader.error ?? new Error("Lecture impossible"));
    reader.readAsDataURL(file);
  });

export const formatSize = (bytes?: number | null) => {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
};

/** Bytes of a data URL back into a Blob, to hand a kept file to the person who asks for it. */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  try {
    const raw = match[2] ? atob(match[3]) : decodeURIComponent(match[3]);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    return new Blob([bytes], { type: match[1] || "application/octet-stream" });
  } catch {
    return null;
  }
}

/** A file name that cannot climb out of a folder or break a download. */
export const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/^\.+/, "").trim() || "fichier";
