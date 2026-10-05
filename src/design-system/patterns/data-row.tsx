import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { focusRing } from "../primitives";
export function DataRow({
  children,
  leading,
  actions,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  leading?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group/row flex min-w-0 items-center gap-3 rounded-control px-3 py-3 transition-[background-color,box-shadow] duration-150 hover:bg-frame",
        focusRing,
        className
      )}
      {...props}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">{children}</div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
