"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { StethoscopeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePatientsRepository } from "@/data/repositories";
import { Kbd } from "@/components/ui/kbd";
import type { Patient } from "@/types/db";

interface QuickPatientPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (patient: Patient) => void;
  title: string;
  description: string;
}

export function QuickPatientPicker({
  open,
  onOpenChange,
  onSelect,
  title,
  description,
}: QuickPatientPickerProps) {
  const { t } = useTranslation();
  const { data: patients } = usePatientsRepository();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

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
        const haystack = normalize(`${p.name} ${p.species} ${p.breed ?? ""}`);
        return haystack.includes(q);
      })
      .slice(0, 20);
  }, [patients, query]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-black/5 px-5 py-4 dark:border-white/5">
          <DialogTitle className="text-base font-semibold tracking-[-0.02em]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground/80">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="p-3">
          <Input
            autoFocus
            className="h-10"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("quickPatientPicker.search", {
              defaultValue: "Rechercher un patient...",
            })}
            value={query}
          />
        </div>
        <div className="max-h-72 overflow-y-auto px-2 pb-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-6 text-center text-sm text-muted-foreground">
              {t("quickPatientPicker.empty", {
                defaultValue: "Aucun patient trouvé.",
              })}
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {filtered.map((patient) => (
                <li key={patient.id}>
                  <Button
                    className="h-auto w-full justify-start gap-3 rounded-lg px-3 py-2 text-left"
                    onClick={() => {
                      onSelect(patient);
                      onOpenChange(false);
                    }}
                    variant="ghost"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200/50 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <HugeiconsIcon
                        className="size-4"
                        icon={StethoscopeIcon}
                        strokeWidth={2}
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {patient.name}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground/70">
                        {patient.species}
                        {patient.breed ? ` · ${patient.breed}` : ""}
                      </span>
                    </div>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-black/5 px-4 py-2.5 text-[11px] text-muted-foreground/70 dark:border-white/5">
          <span>
            {t("quickPatientPicker.hint", {
              defaultValue: "Sélectionnez pour continuer",
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd className="h-4 px-1 text-[9px]">esc</Kbd>
            {t("common.close")}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
