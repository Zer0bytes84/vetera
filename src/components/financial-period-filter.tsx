import { useState } from "react";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type FinancialPeriod = "day" | "week" | "month" | "year";
export function financialPeriodRange(period: FinancialPeriod, anchor: Date) {
  const starts = { day: startOfDay, week: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }), month: startOfMonth, year: startOfYear };
  const ends = { day: endOfDay, week: (d: Date) => endOfWeek(d, { weekStartsOn: 1 }), month: endOfMonth, year: endOfYear };
  return { from: format(starts[period](anchor), "yyyy-MM-dd"), to: format(ends[period](anchor), "yyyy-MM-dd") };
}
export function FinancialPeriodFilter({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const parse = (value: string) => value ? new Date(value + "T12:00:00") : undefined;
  const display = (value: string) => format(parse(value)!, "d MMM yyyy", { locale: fr });
  const label = from && to ? (from === to ? display(from) : `${display(from)} – ${display(to)}`) : from ? `Depuis le ${display(from)}` : to ? `Jusqu’au ${display(to)}` : "Toutes les dates";
  const apply = (start: string, end: string) => { onChange(start, end); setOpen(false); };
  return <div className="py-2">
    <Popover open={open} onOpenChange={(next) => { if (next) setDraft({ from: parse(from), to: parse(to) }); setOpen(next); }}>
      <PopoverTrigger render={<Button variant="outline" className="h-9 gap-2 rounded-xl bg-background/70 px-3 text-xs font-medium" aria-label={`Choisir la période : ${label}`}><CalendarDays className="size-4 text-muted-foreground" /><span>{label}</span><ChevronDown className="ml-1 size-3.5 text-muted-foreground" /></Button>} />
      <PopoverContent align="start" sideOffset={8} className="w-auto max-w-[calc(100vw-24px)] gap-0 rounded-2xl p-0 overflow-hidden">
        <div className="border-b px-4 py-3"><p className="font-semibold">Période</p><p className="mt-1 text-xs text-muted-foreground">Choisissez un raccourci ou deux dates.</p></div>
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-wrap gap-1 border-b p-2 sm:w-36 sm:flex-col sm:border-b-0 sm:border-r">
            {([['day',"Aujourd’hui"],['week','Cette semaine'],['month','Ce mois'],['year','Cette année']] as const).map(([key,text]) => <Button key={key} variant="ghost" size="sm" className="justify-start rounded-lg text-xs" onClick={() => { const r = financialPeriodRange(key, new Date()); apply(r.from, r.to); }}>{text}</Button>)}
            <Button variant="ghost" size="sm" className="justify-start rounded-lg text-xs text-muted-foreground" onClick={() => apply('', '')}>Toutes les dates</Button>
          </div>
          <Calendar mode="range" locale={fr} weekStartsOn={1} selected={draft} onSelect={setDraft} defaultMonth={parse(from) ?? new Date()} className="p-3 [--cell-size:--spacing(8)]" />
        </div>
        <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-3 py-3">
          <span className="text-xs text-muted-foreground">{draft?.from ? `${format(draft.from, 'dd/MM/yyyy')}${draft.to ? ` – ${format(draft.to, 'dd/MM/yyyy')}` : ' · Date de fin à choisir'}` : 'Aucune date sélectionnée'}</span>
          <Button size="sm" className="rounded-lg" disabled={!draft?.from} onClick={() => draft?.from && apply(format(draft.from, 'yyyy-MM-dd'), format(draft.to ?? draft.from, 'yyyy-MM-dd'))}>Appliquer</Button>
        </div>
      </PopoverContent>
    </Popover>
  </div>;
}
