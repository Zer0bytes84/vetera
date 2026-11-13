// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan

/** Header and tile icons: a Lucide glyph or a Heroicons solid, both take className. */
type ShellIcon = import("react").ComponentType<{ className?: string; strokeWidth?: number | string }>;
import { cn } from "@/lib/utils";

/*
 * Adapted for Baitari: the frame, which is also the header's band, is the grey of TuffUI's Chart Card
 * (`--card-band`, one token for the four themes), the panel the inset white / darker grey of the same card (`--card-inset`), icons come from
 * lucide. A `Shell` holds `Panel`s, a panel holds `Inset` blocks. As in TuffUI there is no border and no shadow: the
 * edge is only the contrast between the shell's fill and the panel's. The shell is a frame of `--card-frame` (6px) around
 * the panel, and the radii are concentric: outer = inner + frame (16 + 6 = 22px).
 */

type DivProps = React.ComponentProps<"div">;

/** Outer frame. Headers and footers sit in its padding, content in panels. */
export function Shell({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="band"
      className={cn(
        "@container w-full rounded-[calc(var(--radius-panel)+var(--card-frame))] bg-[var(--card-band)] p-[var(--card-frame)]",
        className,
      )}
      {...props}
    />
  );
}

/** Main content area inside a shell. */
export function Panel({ className, ...props }: DivProps) {
  return (
    <div
      className={cn("rounded-[var(--radius-panel)] bg-[var(--card-inset)]", className)}
      data-slot="panel"
      {...props}
    />
  );
}

/** One level deeper: code, payloads, details inside a panel. */
export function Inset({ className, ...props }: DivProps) {
  return <div className={cn("rounded-xl bg-foreground/[0.04]", className)} {...props} />;
}

/** Icon in a tinted square. Pass a Phosphor icon, or children for anything else. */
export function IconTile({
  icon: IconComponent,
  className,
  children,
  ...props
}: DivProps & { icon?: ShellIcon }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.06] text-muted-foreground",
        className,
      )}
      {...props}
    >
      {IconComponent ? <IconComponent className="size-4" /> : children}
    </div>
  );
}

export type ShellHeaderProps = Omit<DivProps, "title"> & {
  icon?: ShellIcon;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right side: a stat, a pill or actions. Vertically centered with the title. */
  aside?: React.ReactNode;
  /** Overrides the subtitle truncation (a date range must read in full). */
  subtitleClassName?: string;
  /** Heading level for the title. */
  as?: "h2" | "h3" | "h4";
};

/**
 * Header row for a shell. The icon tile sits 12px from the shell edge, in line
 * with panel content below it, and everything is vertically centered.
 */
export function ShellHeader({
  icon,
  title,
  subtitle,
  subtitleClassName,
  aside,
  as: Heading = "h3",
  className,
  ...props
}: ShellHeaderProps) {
  return (
    <div
      className={cn("flex items-center gap-3 pt-1.5 pr-3.5 pb-3 pl-1.5", className)}
      {...props}
    >
      {icon && <IconTile icon={icon} />}
      <div className={cn("min-w-0 flex-1", !icon && "pl-2")}>
        <Heading className="truncate text-sm/6 font-semibold">{title}</Heading>
        {subtitle && (
          <p className={cn("text-[0.8125rem] text-muted-foreground", subtitleClassName ?? "truncate")}>
            {subtitle}
          </p>
        )}
      </div>
      {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
    </div>
  );
}
