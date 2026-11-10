import { IconTile } from "@/components/ui/surface";
import { cn } from "@/lib/utils";
import type { ReleaseNote } from "./release-notes";

/** Les nouveautés d'une version : une icône dans sa pastille, le titre, une ou deux phrases. Espacement 12 / 24. */
export function ReleaseHighlights({ note, className }: { note: ReleaseNote; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-6", className)}>
      {note.highlights.map(({ icon: Icon, title, text }) => (
        <li className="flex items-start gap-3" key={title}>
          <IconTile>
            <Icon className="size-4" />
          </IconTile>
          <div className="min-w-0">
            <h3 className="text-[1rem] font-medium leading-6">{title}</h3>
            <p className="text-[0.8125rem] leading-5 text-muted-foreground">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** « 8 novembre 2026 », pour une date `AAAA-MM-JJ`. */
export function formatReleaseDate(date?: string): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
