"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { usePatientsRepository } from "@/data/repositories";
import { getSpeciesGlyph } from "@/lib/species-icons";
import type { Owner, Patient } from "@/types/db";

const ownerName = (owner?: Owner) => (owner ? `${owner.lastName} ${owner.firstName}`.trim() : "");

interface QuickPatientPickerProps {
  description: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (patient: Patient) => void;
  open: boolean;
  title: string;
}

export function QuickPatientPicker({
  open,
  onOpenChange,
  onSelect,
  title,
  description,
}: QuickPatientPickerProps) {
  const { t } = useTranslation();
  const { data: patients, owners } = usePatientsRepository();
  const ownersById = useMemo(() => new Map(owners.map((owner) => [owner.id, owner])), [owners]);
  const [query, setQuery] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setQuery("");
    }
  }

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const filtered = useMemo<Patient[]>(() => {
    const q = normalize(query.trim());
    if (!q) {
      return patients.slice(0, 20);
    }
    return patients
      .filter((p) => {
        const owner = ownersById.get(p.ownerId);
        const haystack = normalize(
          `${p.name} ${p.species} ${p.breed ?? ""} ${ownerName(owner)} ${owner?.phone ?? ""}`
        );
        return haystack.includes(q);
      })
      .slice(0, 20);
  }, [ownersById, patients, query]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader className="gap-1 px-5 pt-5 pb-1 pe-12">
          <DialogTitle className="t-18 font-semibold">{title}</DialogTitle>
          <DialogDescription className="t-13">{description}</DialogDescription>
        </DialogHeader>
        <div className="px-5 pt-3 pb-2">
          <Input
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("quickPatientPicker.search", {
              defaultValue: "Rechercher un patient...",
            })}
            value={query}
          />
        </div>
        <div className="min-h-0 max-h-80 overflow-y-auto px-5 pb-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-6 text-center text-muted-foreground text-sm">
              {t("quickPatientPicker.empty", {
                defaultValue: "Aucun patient trouvé.",
              })}
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {filtered.map((patient) => {
                const owner = ownersById.get(patient.ownerId);
                const details = [patient.species, patient.breed].filter(Boolean).join(" · ");
                return (
                  <li key={patient.id}>
                    <button
                      aria-label={`${patient.name}, ${ownerName(owner) || "propriétaire inconnu"}, ${details}`}
                      className="flex w-full items-center gap-3 rounded-lg px-1.5 py-2.5 text-left outline-none transition-colors hover:bg-frame focus-visible:bg-frame focus-visible:ring-2 focus-visible:ring-ring/40"
                      onClick={() => {
                        onSelect(patient);
                        onOpenChange(false);
                      }}
                      type="button"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-frame text-ink-muted">
                        <HugeiconsIcon
                          className="size-5"
                          icon={getSpeciesGlyph(patient.species)}
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="flex min-w-0 items-baseline gap-2">
                          <span className="truncate font-medium text-sm">{patient.name}</span>
                          {owner && <span className="truncate t-13 text-foreground">{ownerName(owner)}</span>}
                        </span>
                        <span className="truncate t-12 text-muted-foreground">{details}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between border-black/5 border-t px-4 py-2.5 t-12 text-muted-foreground/70 dark:border-white/5">
          <span>
            {t("quickPatientPicker.hint", {
              defaultValue: "Sélectionnez pour continuer",
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd className="h-4 px-1 t-12">esc</Kbd>
            {t("common.close")}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
