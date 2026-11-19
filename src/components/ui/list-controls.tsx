import { useState, type ComponentProps } from "react";
import {
  ChevronDownIcon as ChevronDown,
  MagnifyingGlassIcon as Search,
  XMarkIcon as X,
} from "@heroicons/react/16/solid";
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
  label: string;
  value: string;
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
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`${label} : ${current}`}
            className={cn(
              "h-[30px] min-w-0 list-filter-control gap-0 overflow-hidden px-0 text-xs",
              className
            )}
            variant="outline"
          >
            <span className="shrink-0 border-border border-r px-2.5 font-normal text-muted-foreground">
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
          onValueChange={(next) => {
            onValueChange(next);
            setOpen(false);
          }}
          value={value}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem
              className="py-2 text-xs"
              key={option.value}
              value={option.value}
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
    <div className={cn("relative min-w-0 list-search-control", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        {...props}
        aria-label={label}
        className="h-[30px] rounded-full bg-background pr-8 pl-8 text-xs focus-visible:ring-2 focus-visible:ring-ring/15 md:text-xs [&::-webkit-search-cancel-button]:appearance-none"
        onChange={(event) => onValueChange(event.target.value)}
        type="search"
        value={value}
      />
      {value && (
        <button
          aria-label={`Effacer : ${label}`}
          className="absolute top-1/2 right-1 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => onValueChange("")}
          type="button"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
