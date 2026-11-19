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
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setDraft(value);
        }
        setOpen(nextOpen);
      }}
      open={open}
    >
      <PopoverTrigger
        aria-label={`Choisir l’${label.toLocaleLowerCase("fr-FR")}`}
        render={
          <Button
            className="h-11 w-[115px] shrink-0 justify-start gap-2 rounded-xl px-3 t-13"
            data-field="time"
            type="button"
            variant="outline"
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
          <span aria-live="polite" className="text-lg font-medium tabular-nums">
            {draft || "À choisir"}
          </span>
        </div>
        <div className="max-h-[240px] space-y-4 overflow-y-auto">
          {TIME_PERIODS.map((period) => (
            <div className="space-y-2" key={period.id}>
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
                    aria-pressed={draft === slot}
                    className="h-11 rounded-lg px-2 text-sm tabular-nums"
                    key={slot}
                    onClick={() => setDraft(slot)}
                    type="button"
                    variant={draft === slot ? "default" : "outline"}
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
                aria-label={`${delta > 0 ? "Ajouter" : "Retirer"} ${Math.abs(delta)} minute${Math.abs(delta) > 1 ? "s" : ""}`}
                className="h-11 px-2 text-xs"
                disabled={!draft}
                key={delta}
                onClick={() => setDraft(addMinutesToTime(draft, delta))}
                type="button"
                variant="secondary"
              >
                {delta > 0 ? "+" : "−"}
                {Math.abs(delta)} min
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-11 text-xs"
              onClick={() => setDraft("00:00")}
              type="button"
              variant="ghost"
            >
              Minuit
            </Button>
            <Button
              className="h-11 text-xs"
              onClick={() => setDraft("23:00")}
              type="button"
              variant="ghost"
            >
              23:00
            </Button>
          </div>
        </div>
        <Button
          className="h-11 w-full"
          disabled={!draft}
          onClick={() => {
            onChange(draft);
            setOpen(false);
          }}
          type="button"
        >
          Choisir {draft || "une heure"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
