import { useState } from "react";
import { fr } from "date-fns/locale";
import { CalendarDays } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function StockDatePicker({value, onChange, label, disabled = false, clearable = false}: {
  value?: Date; onChange: (value?: Date) => void; label: string; disabled?: boolean; clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return <div className="flex min-w-0 gap-2">
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label={label} disabled={disabled} render={<Button type="button" variant="outline" className="h-11 min-w-0 flex-1 justify-start rounded-xl px-3"/>}>
        <CalendarDays className="size-4 shrink-0 text-muted-foreground"/><span className="truncate tabular-nums">{value ? value.toLocaleDateString("fr-FR") : "Choisir la date"}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2"><Calendar mode="single" locale={fr} selected={value} className="[--cell-size:44px] text-sm" onSelect={date => {onChange(date); if (date) setOpen(false);}}/></PopoverContent>
    </Popover>
    {clearable && value && <Button type="button" variant="ghost" disabled={disabled} className="h-11" onClick={() => onChange(undefined)}>Effacer</Button>}
  </div>;
}
