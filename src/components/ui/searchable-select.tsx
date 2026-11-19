import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { useMemo } from "react";

export interface SearchableOption {
  keywords?: string;
  label: string;
  value: string;
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");

export function SearchableSelect({
  id,
  label,
  options,
  value,
  onValueChange,
  placeholder = "Rechercher…",
  disabled = false,
  controlClassName = "",
}: {
  id?: string;
  label: string;
  options: SearchableOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  controlClassName?: string;
}) {
  const selected = options.find((option) => option.value === value);
  const selectedValue = selected?.value;
  const selectedLabel = selected?.label;
  const selectedKeywords = selected?.keywords;
  // Keep the controlled value stable while refreshed options retain the same
  // selection. Otherwise an async refresh can replace a user's search text.
  const selectedOption = useMemo(
    () =>
      selectedValue === undefined
        ? null
        : {
            value: selectedValue,
            label: selectedLabel ?? "",
            keywords: selectedKeywords,
          },
    [selectedValue, selectedLabel, selectedKeywords]
  );
  return (
    <Combobox<SearchableOption>
      disabled={disabled}
      filter={(option, query) =>
        normalize(`${option.label} ${option.keywords ?? ""}`).includes(
          normalize(query)
        )
      }
      isItemEqualToValue={(option, selected) => option.value === selected.value}
      items={options}
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.value}
      onValueChange={(option) => onValueChange(option?.value ?? "")}
      value={selectedOption}
    >
      <div
        data-no-drag
        onContextMenu={(event) => {
          if (!(event.target instanceof HTMLInputElement)) {
            event.preventDefault();
          }
        }}
      >
        <ComboboxInput
          aria-label={label}
          className={`w-full ${controlClassName}`}
          id={id}
          placeholder={placeholder}
        />
      </div>
      <ComboboxContent
        data-no-drag
        onContextMenu={(event) => event.preventDefault()}
      >
        <ComboboxEmpty>Aucun résultat.</ComboboxEmpty>
        <ComboboxList>
          {(option: SearchableOption) => (
            <ComboboxItem key={option.value} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
