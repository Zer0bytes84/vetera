import type { ReactNode } from "react";
import type { AppIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/**
 * The one heading of every block of the record: a small grey line icon, then
 * the label in a light grey. Same size, gap and spacing from block to block.
 */
export function RecordBlockHeading({
  as: Tag = "h3",
  children,
  className,
  icon: Icon,
  id,
}: {
  as?: "h2" | "h3";
  children: ReactNode;
  className?: string;
  icon: AppIcon;
  id?: string;
}) {
  return (
    <Tag className={cn("record-block-heading", className)} id={id}>
      <Icon aria-hidden="true" className="record-block-heading-icon" />
      <span>{children}</span>
    </Tag>
  );
}
