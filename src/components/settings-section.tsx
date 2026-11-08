import type { LucideIcon } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Shell, ShellHeader } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/*
 * The building blocks of the Paramètres page, in the language of the patient record: a grey band (the Shell) with its
 * header (the section's own icon, a title and a subtitle), and inside it one white panel, sharp on its four sides, that
 * holds the rows or the form. Spacing is on the 12 / 24 / 48 scale (gap-3, p-6 and gap-6, pb-12); radii are R20 for the
 * band and R16 for the panel. Colours are our tokens (`--card-band`, `--card-inset`, `--border`), never TuffUI's.
 */

/** The sections of one page, 24 px apart. */
export function SettingsStack({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-6", className)} {...props} />;
}

/** One section: its band, its header and its white panel. */
export function SettingsSection({
  icon,
  title,
  subtitle,
  aside,
  children,
  className,
  panelClassName,
  ...props
}: Omit<ComponentProps<"section">, "title"> & {
  icon: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  /** The header's right side: an action or a status. */
  aside?: ReactNode;
  panelClassName?: string;
}) {
  const titleId = useId();
  return (
    <Shell aria-labelledby={titleId} className={cn("settings-section rounded-[20px]", className)} {...props}>
      <ShellHeader
        aside={aside}
        icon={icon}
        subtitle={subtitle}
        title={<span id={titleId}>{title}</span>}
      />
      <div
        className={cn(
          "settings-section-panel overflow-hidden rounded-2xl border border-border bg-[var(--card-inset)] divide-y divide-border",
          panelClassName,
        )}
      >
        {children}
      </div>
    </Shell>
  );
}

/** A label and its detail on the left, the control on the right; wraps under the label when the panel is narrow. */
export function SettingsRow({
  title,
  detail,
  htmlFor,
  detailId,
  children,
  className,
}: {
  title: ReactNode;
  detail?: ReactNode;
  /** Makes the title the control's label, so clicking the text toggles it. */
  htmlFor?: string;
  detailId?: string;
  children?: ReactNode;
  className?: string;
}) {
  const Title = htmlFor ? "label" : "p";
  return (
    <div className={cn("settings-row flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3", className)}>
      <div className="min-w-0 flex-1 basis-64">
        <Title
          className={cn("block text-sm font-medium", htmlFor && "cursor-pointer")}
          {...(htmlFor ? { htmlFor } : {})}
        >
          {title}
        </Title>
        {detail ? (
          <p className="text-xs leading-5 text-muted-foreground" id={detailId}>
            {detail}
          </p>
        ) : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap items-center gap-3">{children}</div> : null}
    </div>
  );
}

/** Free content of a panel (a form, a list): 24 px all round, its blocks 24 px apart. */
export function SettingsBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-6 p-6", className)} {...props} />;
}

/** The foot of a panel: the status on the left, the actions on the right. */
export function SettingsFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap items-center justify-between gap-3 px-6 py-3", className)} {...props} />;
}

/** A message above the sections, in the same white sharp panel. */
export function SettingsNotice({
  tone,
  className,
  ...props
}: ComponentProps<"p"> & { tone: "success" | "error" | "info" }) {
  return (
    <p
      className={cn(
        "rounded-2xl border bg-[var(--card-inset)] px-6 py-3 text-sm",
        tone === "success" && "border-positive/30 text-positive",
        tone === "error" && "border-negative/30 text-negative",
        tone === "info" && "border-border text-muted-foreground",
        className,
      )}
      role={tone === "error" ? "alert" : "status"}
      {...props}
    />
  );
}
