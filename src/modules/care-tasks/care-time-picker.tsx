import { useState } from "react";
import { Clock } from "./care-icons";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  QUICK_TIMES,
  TIME_PERIODS,
  addMinutesToTime,
} from "@/modules/agenda/components/agenda-shared";

export function CareTimePicker({
  value,
  onChange,
  label = "Heure du soin",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setDraft(value);
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger
        aria-label={`Choisir l’${label.toLocaleLowerCase("fr-FR")}`}
        render={
          <Button
            type="button"
            variant="outline"
            className="h-11 w-[115px] shrink-0 justify-start gap-2 rounded-xl px-3 text-[13px]"
          />
        }
      >
        <Clock className="size-4 shrink-0 text-muted-foreground" />
        <span className="tabular-nums">{value || "Heure"}</span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[320px] max-w-[calc(100vw-32px)] gap-4 p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">{label}</h3>
          <span className="text-lg font-medium tabular-nums" aria-live="polite">
            {draft || "À choisir"}
          </span>
        </div>
        <div className="max-h-[240px] space-y-4 overflow-y-auto">
          {TIME_PERIODS.map((period) => (
            <div key={period.id} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {period.label}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_TIMES.filter(
                  (slot) =>
                    slot >= period.from &&
                    (slot < period.to ||
                      (period.id === "evening" && slot === period.to))
                ).map((slot) => (
                  <Button
                    key={slot}
                    type="button"
                    variant={draft === slot ? "default" : "outline"}
                    className="h-11 rounded-lg px-2 text-sm tabular-nums"
                    aria-pressed={draft === slot}
                    onClick={() => setDraft(slot)}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">Ajuster à la minute</p>
          <div className="grid grid-cols-4 gap-2">
            {[-5, -1, 1, 5].map((delta) => (
              <Button
                key={delta}
                type="button"
                variant="secondary"
                disabled={!draft}
                className="h-11 px-2 text-xs"
                aria-label={`${delta > 0 ? "Ajouter" : "Retirer"} ${Math.abs(delta)} minute${Math.abs(delta) > 1 ? "s" : ""}`}
                onClick={() => setDraft(addMinutesToTime(draft, delta))}
              >
                {delta > 0 ? "+" : "−"}
                {Math.abs(delta)} min
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-11 text-xs"
              onClick={() => setDraft("00:00")}
            >
              Minuit
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 text-xs"
              onClick={() => setDraft("23:00")}
            >
              23:00
            </Button>
          </div>
        </div>
        <Button
          type="button"
          disabled={!draft}
          className="h-11 w-full"
          onClick={() => {
            onChange(draft);
            setOpen(false);
          }}
        >
          Choisir {draft || "une heure"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
