import { useMemo, useState } from "react";
import { fr } from "date-fns/locale";
import { Plus, CalendarDays } from "@/lib/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useProductsRepository } from "@/data/repositories";
import { isTauriRuntime } from "@/services/browser-store";
import { generateId } from "@/services/sqlite/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CareTimePicker } from "@/modules/care-tasks/care-time-picker";
import { StockError, parseStockQuantityInput, stockQuantityLabel } from "@/domain/stock";
import { stockDay } from "@/domain/stock-date";
import { inventoryService } from "../services/inventory-service";
import { useStockInventory } from "../hooks/use-stock-inventory";
import type { StockInventoryBalance } from "../services/inventory-store";

const dateLabel = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value.length === 10 ? value + "T12:00:00" : value).toLocaleDateString("fr-FR", {day: "numeric", month: "short", year: "numeric"}) : "Non renseignée";
function LotDate({value, onChange, label, clearable}: {value?: Date; onChange: (value?: Date) => void; label: string; clearable?: boolean}) {
  const [open, setOpen] = useState(false);
  return <div className="flex min-w-0 gap-2"><Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger aria-label={label} render={<Button type="button" variant="outline" className="h-11 min-w-0 flex-1 justify-start rounded-xl px-3" />}>
      <CalendarDays className="size-4 shrink-0 text-muted-foreground"/><span className="truncate tabular-nums">{value ? value.toLocaleDateString("fr-FR") : "Choisir la date"}</span>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-auto p-2"><Calendar mode="single" locale={fr} selected={value} className="[--cell-size:44px] text-sm" onSelect={date => {onChange(date); if (date) setOpen(false);}} /></PopoverContent>
  </Popover>{clearable && value && <Button type="button" variant="ghost" className="h-11" onClick={() => onChange(undefined)}>Effacer</Button>}</div>;
}

function LotForm({productId: initialProduct, onCancel, onSaved}: {productId: string; onCancel: () => void; onSaved: () => void}) {
  const products = useProductsRepository(); const {currentUser} = useAuth(); const inventory = useStockInventory();
  const [productId, setProductId] = useState(initialProduct);
  const [mode, setMode] = useState<"identify" | "receive">("identify");
  const [number, setNumber] = useState(""); const [quantity, setQuantity] = useState("");
  const [expiry, setExpiry] = useState<Date>(); const [received, setReceived] = useState<Date>(new Date());
  const [time, setTime] = useState(() => `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`);
  const [location, setLocation] = useState("stock-main"); const [requestId, setRequestId] = useState(generateId);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const product = products.data.find(row => row.id === productId);
  const requested = parseStockQuantityInput(quantity);
  const changed = (operation: () => void) => {operation(); setRequestId(generateId()); setError(null);};
  const unassigned = inventory.balances.filter(row => row.productId === productId && row.locationId === location && row.lotId === null).reduce((sum, row) => sum + Math.max(0, row.quantity), 0);
  return <form noValidate aria-label="Enregistrer un lot" className="space-y-4 border-y border-border bg-muted/10 p-5" onSubmit={async event => {
    event.preventDefault(); if (busy || !currentUser || !product || !number.trim() || !(requested > 0)) return;
    setBusy(true); setError(null);
    try {
      const receivedAt = new Date(`${stockDay(received)}T${time}:00`);
      if (mode === "receive" && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isFinite(receivedAt.getTime()) || stockDay(receivedAt) !== stockDay(received) || `${String(receivedAt.getHours()).padStart(2, "0")}:${String(receivedAt.getMinutes()).padStart(2, "0")}` !== time)) throw new StockError("SOURCE_CONFLICT", "Choisissez une date et une heure de réception valides.");
      await inventoryService.registerLot({id: requestId, productId, lotNumber: number, quantity: requested, mode, locationId: location,
        expiryDate: expiry ? stockDay(expiry) : null, receivedAt: mode === "receive" ? receivedAt.toISOString() : undefined, authorId: currentUser.id});
      onSaved();
    } catch (failure) {setError(failure instanceof StockError ? failure.message : "Le lot n’a pas pu être enregistré. Vérifiez les informations et réessayez.");}
    finally {setBusy(false);}
  }}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-base font-medium">Enregistrer un lot</h3><Tabs value={mode} onValueChange={value => changed(() => setMode(value as typeof mode))}><TabsList aria-label="Origine du stock"><TabsTrigger disabled={busy} value="identify">Stock existant</TabsTrigger><TabsTrigger disabled={busy} value="receive">Réception</TabsTrigger></TabsList></Tabs></div>
    <p className="text-sm text-muted-foreground">{mode === "identify" ? "Attribuez un numéro au stock déjà présent. Le total reste inchangé." : "Enregistrez une livraison réellement reçue. Cette quantité s’ajoute au stock."}</p>
    <fieldset disabled={busy} className="grid min-w-0 gap-4 md:grid-cols-2">
      <div className="min-w-0 space-y-1.5"><label htmlFor="lot-product" className="text-sm">Produit</label><SearchableSelect id="lot-product" controlClassName="h-11 rounded-xl" disabled={busy} label="Produit du lot" value={productId} onValueChange={value => changed(() => setProductId(value))} options={products.data.filter(row => !row.archivedAt && row.stockTracked !== false).map(row => ({value: row.id, label: row.name, keywords: row.category}))} placeholder="Rechercher un produit…" /></div>
      <div className="space-y-1.5"><label htmlFor="lot-number" className="text-sm">Numéro de lot</label><Input id="lot-number" className="h-11 rounded-xl" value={number} maxLength={120} onChange={event => changed(() => setNumber(event.target.value))} placeholder="Numéro indiqué sur l’emballage"/></div>
      <div className="space-y-1.5"><label htmlFor="lot-quantity" className="text-sm">Quantité{product ? ` (${product.unit})` : ""}</label><Input id="lot-quantity" className="h-11 rounded-xl tabular-nums" inputMode="decimal" value={quantity} onChange={event => changed(() => setQuantity(event.target.value))}/>{mode === "identify" && product && <p className="text-xs text-muted-foreground">Sans lot dans cet emplacement : {stockQuantityLabel(unassigned, product.unit)}.</p>}</div>
      <div className="space-y-1.5"><label className="text-sm">Péremption</label><LotDate label="Choisir la péremption du lot" clearable value={expiry} onChange={value => changed(() => setExpiry(value))}/><p className="text-xs text-muted-foreground">Facultative si le produit n’a pas de péremption indiquée.</p></div>
      <div className="min-w-0 space-y-1.5"><label htmlFor="lot-location" className="text-sm">Emplacement</label><SearchableSelect id="lot-location" controlClassName="h-11 rounded-xl" disabled={busy} value={location} label="Emplacement du lot" onValueChange={value => changed(() => setLocation(value))} options={inventory.locations.filter(row => row.active).map(row => ({value: row.id, label: row.name}))}/></div>
      {mode === "receive" && <div className="min-w-0 space-y-1.5"><label className="text-sm">Réception</label><div className="flex min-w-0 gap-2"><LotDate label="Choisir la date de réception" value={received} onChange={value => {if (value) changed(() => setReceived(value));}}/><CareTimePicker label="Heure de réception" value={time} onChange={value => changed(() => setTime(value))}/></div></div>}
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} className="h-11" onClick={onCancel}>Annuler</Button><Button type="submit" className="h-11" disabled={busy || !currentUser || !product || !(requested > 0) || !number.trim() || !inventory.ready}>{busy ? "Enregistrement…" : mode === "identify" ? "Identifier ce stock" : "Confirmer la réception"}</Button></div>
  </form>;
}

function CountForm({row, onClose}: {row: StockInventoryBalance; onClose: () => void}) {
  const {currentUser} = useAuth(); const [quantity, setQuantity] = useState(String(row.quantity)); const [reason, setReason] = useState("");
  const [requestId, setRequestId] = useState(generateId); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const count = parseStockQuantityInput(quantity);
  return <form noValidate aria-label="Comptage du lot" className="space-y-3 border-y border-border bg-muted/10 p-5" onSubmit={async event => {
    event.preventDefault(); if (busy || !currentUser || !reason.trim() || !(count >= 0)) return;
    setBusy(true); setError(null);
    try {await inventoryService.count({id: requestId, balanceId: row.id, quantity: count, reason, authorId: currentUser.id}); onClose();}
    catch (failure) {setError(failure instanceof StockError ? failure.message : "Le comptage n’a pas pu être enregistré. Réessayez.");}
    finally {setBusy(false);}
  }}><h3 className="text-base font-medium">Compter {row.lotNumber ? `le lot ${row.lotNumber}` : "le stock sans lot"}</h3><p className="text-sm text-muted-foreground">{row.productName} · {row.locationName} · Réception du {dateLabel(row.receivedAt)}. L’écart sera journalisé.</p>
    <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]"><div className="space-y-1.5"><label htmlFor="lot-count-quantity" className="text-sm">Quantité ({row.unit})</label><Input id="lot-count-quantity" className="h-11 rounded-xl" inputMode="decimal" disabled={busy} value={quantity} onChange={event => {setQuantity(event.target.value); setRequestId(generateId());}}/></div><div className="space-y-1.5"><label htmlFor="lot-count-reason" className="text-sm">Motif</label><Input id="lot-count-reason" className="h-11 rounded-xl" disabled={busy} value={reason} onChange={event => {setReason(event.target.value); setRequestId(generateId());}}/></div></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} className="h-11" onClick={onClose}>Annuler</Button><Button type="submit" className="h-11" disabled={busy || !currentUser || !(count >= 0) || !reason.trim()}>{busy ? "Enregistrement…" : "Confirmer le comptage"}</Button></div>
  </form>;
}

export function StockLotsPanel() {
  const inventory = useStockInventory(); const products = useProductsRepository();
  const [filter, setFilter] = useState(""); const [open, setOpen] = useState(false); const [counting, setCounting] = useState<StockInventoryBalance | null>(null);
  const today = stockDay(); const horizon = new Date(); horizon.setDate(horizon.getDate() + 90);
  const rows = useMemo(() => inventory.balances.filter(row => !row.productArchived && (!filter || row.productId === filter)), [inventory.balances, filter]);
  const alerts = rows.filter(row => row.quantity > 0 && row.expiryDate && row.expiryDate <= stockDay(horizon));
  const uniqueAlerts = new Set(alerts.map(row => row.lotId ?? `unassigned-${row.productId}`)).size;
  if (!isTauriRuntime()) return <p className="p-5 text-sm text-muted-foreground">Les lots et leur traçabilité sont disponibles dans l’application de bureau. Le catalogue web reste utilisable.</p>;
  return <section aria-label="Lots et réceptions" className="min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div className="w-full min-w-0 sm:w-72"><SearchableSelect controlClassName="[&_input]:text-foreground" value={filter} onValueChange={setFilter} label="Filtrer les lots par produit" options={[{value: "", label: "Tous les produits"}, ...products.data.filter(row => !row.archivedAt && row.stockTracked !== false).map(row => ({value: row.id, label: row.name}))]}/></div><Button disabled={!inventory.ready || !inventory.supported} onClick={() => {setCounting(null); setOpen(true);}}><Plus className="size-4"/>Enregistrer un lot</Button></div>
    {inventory.error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-destructive">{inventory.error}<Button variant="outline" onClick={inventory.refresh}>Actualiser</Button></div>}
    {!inventory.ready && !inventory.error && <p role="status" className="p-4 text-sm text-muted-foreground">Vérification des lots…</p>}
    {uniqueAlerts > 0 && <p role="status" className="border-b border-border p-4 text-sm text-destructive">{uniqueAlerts} {uniqueAlerts === 1 ? "lot ou stock à surveiller" : "lots ou stocks à surveiller"} : péremption dépassée ou dans les 90 prochains jours. Les stocks périmés ne peuvent pas être dispensés.</p>}
    {open && <LotForm productId={filter} onCancel={() => setOpen(false)} onSaved={() => setOpen(false)}/>}
    {counting && <CountForm key={counting.id} row={counting} onClose={() => setCounting(current => current?.id === counting.id ? null : current)}/>}
    <Table className="table-fixed"><TableHeader><TableRow><TableHead className="w-[24%]">Produit</TableHead><TableHead className="w-[19%]">Lot</TableHead><TableHead className="w-[15%] text-right">Quantité</TableHead><TableHead className="w-[27%]">Dates</TableHead><TableHead className="w-[15%]"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
      <TableBody>{rows.length === 0 ? <TableRow><TableCell colSpan={5} className="h-32 whitespace-normal text-center text-muted-foreground">{inventory.ready ? "Aucun stock pour ce filtre. Enregistrez une réception ou identifiez le stock déjà présent." : "Chargement…"}</TableCell></TableRow> : rows.map(row => {
        const expired = !!row.expiryDate && row.expiryDate < today; const near = !!row.expiryDate && row.expiryDate <= stockDay(horizon); const empty = row.quantity <= 0;
        return <TableRow key={row.id} className={empty ? "text-muted-foreground" : undefined}><TableCell className="whitespace-normal break-words align-top"><span className="font-medium">{row.productName}</span><p className="mt-1 text-xs text-muted-foreground">{row.locationName}</p></TableCell><TableCell className="whitespace-normal break-words align-top"><span>{row.lotNumber || "Sans lot"}</span><div className="mt-1"><Badge variant="outline" className={expired && !empty ? "text-destructive" : near && !empty ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}>{empty ? "Épuisé" : expired ? "Périmé" : near ? "À surveiller" : "Utilisable"}</Badge></div></TableCell><TableCell className="whitespace-normal text-right align-top tabular-nums">{stockQuantityLabel(row.quantity, row.unit)}</TableCell><TableCell className="whitespace-normal align-top text-xs text-muted-foreground"><span className="block">Réception : {dateLabel(row.receivedAt)}</span><span className="mt-1 block">Péremption : {dateLabel(row.expiryDate)}</span></TableCell><TableCell className="align-top"><Button variant="outline" size="sm" className="max-w-full px-2" disabled={!inventory.ready} onClick={() => {setOpen(false); setCounting(row);}}>Compter</Button></TableCell></TableRow>;
      })}</TableBody></Table>
    <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">Chaque réception conserve sa date pour le FIFO. Le stock ancien reste « sans lot » jusqu’à son identification.</p>
  </section>;
}
