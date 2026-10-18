import { cn } from "@/lib/utils";
import { firstNameOf } from "@/utils/display-format";

/** Initials of a person: first letter of the first and last word, upper case. */
export function personInitials(name?: string | null) {
  // Titles (Dr, Pr, Mme…) are not part of the initials: "Dr Lina Ait Salem" gives "LS".
  const words = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => firstNameOf(word) !== "");
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * People are shown by their initials on a quiet #F5F5F5 tile (animals have
 * their species icon). No emoji, no colour: the colour belongs to states.
 */
export function InitialsAvatar({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid size-10 shrink-0 place-items-center rounded-full bg-[#F5F5F5] ring-1 ring-black/5 t-13 font-medium text-[#5D5D5D] dark:bg-white/10 dark:text-white/70",
        className
      )}
      data-slot="initials-avatar"
    >
      {personInitials(name)}
    </span>
  );
}
