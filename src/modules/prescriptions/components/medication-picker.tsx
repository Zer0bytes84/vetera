import { CaretUpDown, Check, Pill } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import {
  type MedicationSearchResult,
  type SpeciesKey,
  searchMedications,
  speciesLabel,
} from "../lib/medication-catalog";

interface MedicationPickerProps {
  className?: string;
  disabled?: boolean;
  onSelect: (medication: MedicationSearchResult) => void;
  speciesKey: SpeciesKey | null;
}

export function MedicationPicker({
  className,
  disabled,
  onSelect,
  speciesKey,
}: MedicationPickerProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const language = i18n.language?.startsWith("en") ? "en" : "fr";

  const results = useMemo(
    () => searchMedications(query, speciesKey),
    [query, speciesKey]
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            className={cn(
              "h-9 w-full justify-between gap-2 border-dashed bg-background/60",
              className
            )}
            disabled={disabled}
            type="button"
            variant="outline"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <Pill className="size-3.5" weight="duotone" />
              {t("prescriptions.builder.addMedication")}
            </span>
            <CaretUpDown className="size-3.5 opacity-50" />
          </Button>
        }
      />
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        sideOffset={6}
      >
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={setQuery}
            placeholder={t("prescriptions.builder.searchPlaceholder")}
            value={query}
          />
          <CommandList className="max-h-[320px]">
            <CommandEmpty className="py-6 text-center text-muted-foreground text-xs">
              {t("prescriptions.builder.noResults")}
            </CommandEmpty>
            {speciesKey ? (
              <div className="border-border/50 border-b bg-muted/30 px-2 py-1.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                {speciesLabel(speciesKey, language)}
              </div>
            ) : null}
            <CommandGroup>
              {results.slice(0, 25).map((med) => (
                <MedicationRow
                  key={med.id}
                  med={med}
                  onSelect={() => {
                    onSelect(med);
                    setOpen(false);
                    setQuery("");
                  }}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function MedicationRow({
  med,
  onSelect,
}: {
  med: MedicationSearchResult;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      className="flex items-start gap-3 px-2 py-2"
      onSelect={onSelect}
      value={med.id}
    >
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Pill className="size-3.5" weight="duotone" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">{med.nom}</span>
          {med.nomCommercial?.[0] ? (
            <span className="truncate text-[11px] text-muted-foreground">
              ({med.nomCommercial[0]})
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>{med.classe}</span>
          {med.posologyForSpecies ? (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="font-medium text-foreground/70">
                {med.posologyForSpecies}
              </span>
            </>
          ) : null}
          {med.frequencyForSpecies ? (
            <span className="text-muted-foreground/70">
              · {med.frequencyForSpecies}
            </span>
          ) : null}
        </div>
      </div>
      {med.hasComputableDose ? (
        <Badge className="shrink-0 text-[10px]" variant="secondary">
          ✓
        </Badge>
      ) : null}
      <Check className="size-3.5 shrink-0 opacity-0" />
    </CommandItem>
  );
}
