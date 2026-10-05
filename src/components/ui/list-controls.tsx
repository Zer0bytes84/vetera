import { useState, type ComponentProps } from "react";
import { ChevronDown, Search, X } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export interface ListFilterOption {
  value: string;
  label: string;
}

/** Compact, controlled list filter; label and selected value stay visually distinct. */
export function ListFilter({
  label,
  value,
  options,
  onValueChange,
  className,
}: {
  label: string;
  value: string;
  options: ListFilterOption[];
  onValueChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current =
    options.find((option) => option.value === value)?.label ?? value;
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "list-filter-control h-[30px] min-w-0 gap-0 overflow-hidden px-0 text-xs",
              className
            )}
            aria-label={`${label} : ${current}`}
          >
            <span className="shrink-0 border-r border-border px-2.5 font-normal text-muted-foreground">
              {label}
            </span>
            <span className="flex min-w-0 items-center gap-1.5 px-2.5">
              <span className="truncate">{current}</span>
              <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
            </span>
          </Button>
        }
      />
      <DropdownMenuContent
        align="start"
        className="w-auto min-w-44 max-w-[calc(100vw-24px)]"
      >
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            onValueChange(next);
            setOpen(false);
          }}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="py-2 text-xs"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ListSearch({
  value,
  onValueChange,
  label,
  className,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className={cn("list-search-control relative min-w-0", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        {...props}
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="h-[30px] rounded-full bg-background pl-8 pr-8 text-xs md:text-xs focus-visible:ring-2 focus-visible:ring-ring/15 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          aria-label={`Effacer : ${label}`}
          onClick={() => onValueChange("")}
          className="absolute right-1 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
