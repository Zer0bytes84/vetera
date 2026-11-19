import type { ComponentType, ReactNode } from "react";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/**
 * One block of Hospitalisation, built like the other views: a grey band with its header (icon, title, a few words, the
 * block's actions on the right) and its content on a white panel, set apart by the contrast of fills alone. It replaces
 * the bordered cards the page had before 19 November; what each block shows and does is unchanged.
 */
export function StaySection({
  title,
  subtitle,
  icon,
  aside,
  children,
  className,
  panelClassName,
  bare = false,
  as,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ComponentType<{ className?: string; strokeWidth?: number | string }>;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  /** The children lay their own panels on the band (a grid of cards), instead of sitting in one panel. */
  bare?: boolean;
  /** Heading level of the title (h3 by default). */
  as?: "h2" | "h3" | "h4";
}) {
  return (
    <Shell className={cn("max-w-none", className)}>
      <ShellHeader
        as={as}
        aside={aside}
        icon={icon}
        subtitle={subtitle}
        title={title}
      />
      {bare ? (
        children
      ) : (
        <Panel className={cn("space-y-3 p-5", panelClassName)}>
          {children}
        </Panel>
      )}
    </Shell>
  );
}
