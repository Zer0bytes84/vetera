import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowLeft } from "@/lib/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useProductsRepository } from "@/data/repositories";
import { StockError, parseStockQuantityInput, stockBalance, stockQuantityLabel } from "@/domain/stock";
import { stockDay } from "@/domain/stock-date";
import { restockNeed } from "@/domain/stock-alerts";
import { isTauriRuntime } from "@/services/browser-store";
import { generateId } from "@/services/sqlite/database";
import { formatDZD, toCentimes } from "@/utils/currency";
import { formatPhone } from "@/utils/display-format";
import { CareTimePicker } from "@/modules/care-tasks/care-time-picker";
import { StockDatePicker } from "./stock-date-picker";
import { useStockInventory } from "../hooks/use-stock-inventory";
import { usePurchasing } from "../hooks/use-purchasing";
import { purchasingService } from "../services/purchasing-service";
import { exportPurchaseOrder } from "../services/purchase-order-pdf";
import type { PurchaseOrder, PurchaseOrderLine, StockSupplier } from "../services/purchasing-store";

const labels: Record<PurchaseOrder["status"], string> = {draft: "Brouillon", ordered: "Commandée", partial: "Réception partielle", received: "Reçue", cancelled: "Annulée"};
const dateLabel = (value: string) => new Date(value).toLocaleDateString("fr-FR");
const failure = (error: unknown) => error instanceof StockError ? error.message : "L’opération n’a pas pu être enregistrée. Réessayez.";
const parseCost = (value: string) => /^\d+(?:[,.]\d{1,2})?$/.test(value.trim()) ? toCentimes(Number(value.replace(",", "."))) : Number.NaN;

function SupplierForm({supplier, onClose}: {supplier?: StockSupplier; onClose: () => void}) {
  const [id] = useState(() => supplier?.id ?? generateId());
  const [draft, setDraft] = useState({name: supplier?.name ?? "", phone: supplier?.phone ?? "", email: supplier?.email ?? "", address: supplier?.address ?? "", notes: supplier?.notes ?? ""});
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  return <form noValidate aria-label="Fiche fournisseur" className="space-y-4 border-y border-border bg-muted/10 p-5" onSubmit={async event => {
    event.preventDefault(); if (busy || !draft.name.trim()) return; setBusy(true); setError(null);
    try {await purchasingService.supplier({id, ...draft}); onClose();} catch (error) {setError(failure(error));} finally {setBusy(false);}
  }}>
    <h3 className="text-base font-medium">{supplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}</h3>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
      {([['name','Nom'],['phone','Téléphone'],['email','E-mail'],['address','Adresse']] as const).map(([key,label]) => <div key={key} className="space-y-1.5"><label htmlFor={`supplier-${key}`} className="text-sm">{label}</label><Input className="h-11" id={`supplier-${key}`} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} value={draft[key]} onChange={event => setDraft(current => ({...current, [key]: event.target.value}))}/></div>)}
      <div className="space-y-1.5 sm:col-span-2"><label htmlFor="supplier-notes" className="text-sm">Notes</label><Textarea id="supplier-notes" value={draft.notes} onChange={event => setDraft(current => ({...current, notes: event.target.value}))}/></div>
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Annuler</Button><Button type="submit" disabled={busy || !draft.name.trim()}>{busy ? "Enregistrement…" : "Enregistrer le fournisseur"}</Button></div>
  </form>;
}

function OrderForm({order, initialLines, fromAlerts, onClose, onSaved}: {order?: PurchaseOrder; initialLines: PurchaseOrderLine[]; fromAlerts: boolean; onClose: () => void; onSaved: (id: string) => void}) {
  const {currentUser} = useAuth(); const purchasing = usePurchasing(); const products = useProductsRepository();
  const [orderId] = useState(() => order?.id ?? generateId()); const [supplier, setSupplier] = useState(order?.supplier_id ?? "");
  const [rows, setRows] = useState(() => initialLines.length ? initialLines.map(line => ({key: generateId(), productId: line.product_id, quantity: String(line.quantity), cost: String(line.unit_cost_amount / 100)}))
    : fromAlerts ? products.data.filter(product => !product.archivedAt && restockNeed(product) > 0).map(product => ({key: generateId(), productId: product.id,
      quantity: String(restockNeed(product)), cost: String(product.purchasePriceAmount / 100)}))
    : [{key: generateId(), productId: "", quantity: "1", cost: "0"}]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const payload = rows.map(row => ({productId: row.productId, quantity: parseStockQuantityInput(row.quantity), unitCostAmount: parseCost(row.cost)}));
  const valid = !!supplier && payload.length > 0 && payload.every(line => line.productId && line.quantity > 0 && Number.isSafeInteger(line.unitCostAmount));
  const total = payload.reduce((sum, line) => sum + Math.round(line.quantity * line.unitCostAmount), 0);
  const update = (key: string, patch: Partial<typeof rows[number]>) => setRows(items => items.map(row => row.key === key ? {...row, ...patch} : row));
  return <form noValidate aria-label="Bon de commande" className="space-y-4 border-y border-border bg-muted/10 p-5" onSubmit={async event => {
    event.preventDefault(); if (busy || !valid || !currentUser) return; setBusy(true); setError(null);
    try {await purchasingService.saveOrder({id: orderId, create: !order, supplierId: supplier, lines: payload, authorId: currentUser.id, expectedFingerprint: order?.fingerprint}); onSaved(orderId);} catch (error) {setError(failure(error));} finally {setBusy(false);}
  }}>
    <div><h3 className="text-base font-medium">{order ? "Modifier le brouillon" : "Préparer une commande"}</h3><p className="mt-1 text-sm text-muted-foreground">{fromAlerts ? "Les quantités proposées correspondent au manque par rapport aux seuils actuels. Vérifiez-les avant confirmation." : "Choisissez les produits, leurs quantités physiques et le coût d’achat convenu."}</p></div>
    <div className="max-w-lg space-y-1.5"><label htmlFor="order-supplier" className="text-sm">Fournisseur</label><SearchableSelect id="order-supplier" controlClassName="h-11 [&_input]:text-foreground" label="Fournisseur de la commande" value={supplier} onValueChange={setSupplier} disabled={busy} options={purchasing.suppliers.filter(row => !row.archived_at).map(row => ({value: row.id, label: row.name}))}/></div>
    {rows.map((row, index) => {
      const product = products.data.find(item => item.id === row.productId);
      return <fieldset key={row.key} disabled={busy} className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_9rem_10rem_auto]">
        <div className="min-w-0 space-y-1.5"><label htmlFor={`order-product-${row.key}`} className="text-sm">Produit {index + 1}</label><SearchableSelect id={`order-product-${row.key}`} controlClassName="h-11 [&_input]:text-foreground" label={`Produit à commander ${index + 1}`} disabled={busy} value={row.productId} onValueChange={productId => update(row.key, {productId, cost: String((products.data.find(item => item.id === productId)?.purchasePriceAmount ?? 0) / 100)})} options={products.data.filter(item => !item.archivedAt && item.stockTracked !== false).map(item => ({value: item.id, label: item.name}))}/></div>
        <div className="space-y-1.5"><label htmlFor={`order-qty-${row.key}`} className="text-sm">Quantité{product ? ` (${product.unit})` : ""}</label><Input className="h-11 tabular-nums" id={`order-qty-${row.key}`} aria-label={`Quantité à commander ${index + 1}`} inputMode="decimal" value={row.quantity} onChange={event => update(row.key, {quantity: event.target.value})}/></div>
        <div className="space-y-1.5"><label htmlFor={`order-cost-${row.key}`} className="text-sm">Coût unitaire (DA)</label><Input className="h-11 tabular-nums" id={`order-cost-${row.key}`} aria-label={`Coût unitaire ${index + 1}`} inputMode="decimal" value={row.cost} onChange={event => update(row.key, {cost: event.target.value})}/></div>
        <Button type="button" variant="ghost" className="h-11 self-end" aria-label={`Retirer le produit ${index + 1}`} onClick={() => setRows(items => items.filter(item => item.key !== row.key))}>Retirer</Button>
      </fieldset>;
    })}
    <div className="flex flex-wrap items-center justify-between gap-3"><Button type="button" variant="outline" disabled={busy} onClick={() => setRows(items => [...items, {key: generateId(), productId: "", quantity: "1", cost: "0"}])}><Plus className="size-4"/>Ajouter un produit</Button><p className="text-sm tabular-nums">Total : <strong>{valid ? formatDZD(total) : "À compléter"}</strong></p></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Annuler</Button><Button type="submit" disabled={busy || !valid || !currentUser}>{busy ? "Enregistrement…" : "Enregistrer le brouillon"}</Button></div>
  </form>;
}

function ReceiptForm({order, lines, onClose}: {order: PurchaseOrder; lines: PurchaseOrderLine[]; onClose: () => void}) {
  const {currentUser} = useAuth(); const inventory = useStockInventory();
  const [requestId] = useState(generateId); const [reference, setReference] = useState(""); const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(() => `${String(new Date().getHours()).padStart(2,"0")}:${String(new Date().getMinutes()).padStart(2,"0")}`);
  const [rows, setRows] = useState(() => lines.filter(line => line.quantity > line.received_quantity).map(line => ({...line, received: String(stockBalance(line.quantity - line.received_quantity)), lot: "", expiry: undefined as Date | undefined, location: "stock-main"})));
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const quantities = rows.map(row => parseStockQuantityInput(row.received));
  const valid = quantities.some(qty => qty > 0) && quantities.every((qty, index) => qty >= 0 && qty <= stockBalance(rows[index].quantity - rows[index].received_quantity));
  const update = (lineId: string, patch: Partial<typeof rows[number]>) => setRows(items => items.map(row => row.id === lineId ? {...row, ...patch} : row));
  return <form noValidate aria-label="Réception de commande" className="space-y-5 border-y border-border bg-muted/10 p-5" onSubmit={async event => {
    event.preventDefault(); if (busy || !valid || !currentUser) return; setBusy(true); setError(null);
    try {
      const receivedAt = new Date(`${stockDay(date)}T${time}:00`);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isFinite(receivedAt.getTime()) || stockDay(receivedAt) !== stockDay(date) || `${String(receivedAt.getHours()).padStart(2,"0")}:${String(receivedAt.getMinutes()).padStart(2,"0")}` !== time) throw new StockError("SOURCE_CONFLICT", "Choisissez une date et une heure de réception valides.");
      await purchasingService.receive({id: requestId, orderId: order.id, reference, receivedAt: receivedAt.toISOString(), authorId: currentUser.id,
        lines: rows.filter((_, index) => quantities[index] > 0).map(row => ({orderLineId: row.id, quantity: parseStockQuantityInput(row.received), lotNumber: row.lot, expiryDate: row.expiry ? stockDay(row.expiry) : null, locationId: row.location}))}); onClose();
    } catch (error) {setError(failure(error));} finally {setBusy(false);}
  }}>
    <div><h3 className="text-base font-medium">Réceptionner {order.reference}</h3><p className="mt-1 text-sm text-muted-foreground">Vérifiez les quantités réellement reçues. Laissez 0 pour un produit non livré.</p></div>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><label htmlFor="receipt-reference" className="text-sm">Référence du bon de livraison</label><Input id="receipt-reference" className="h-11" value={reference} onChange={event => setReference(event.target.value)}/></div><div className="space-y-1.5"><label className="text-sm">Date et heure de réception</label><div className="flex gap-2"><StockDatePicker disabled={busy} label="Date de réception de commande" value={date} onChange={value => {if(value) setDate(value);}}/><CareTimePicker label="Heure de réception" value={time} onChange={setTime}/></div></div></fieldset>
    {rows.map((row,index) => <fieldset key={row.id} disabled={busy} className="space-y-3 border-t border-border pt-4"><div className="flex flex-wrap justify-between gap-2"><h4 className="text-sm font-medium">{row.product_name}</h4><span className="text-xs text-muted-foreground tabular-nums">Reste à recevoir : {stockQuantityLabel(stockBalance(row.quantity - row.received_quantity),row.unit)}</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5"><label htmlFor={`receive-qty-${row.id}`} className="text-sm">Quantité ({row.unit})</label><Input className="h-11 tabular-nums" id={`receive-qty-${row.id}`} aria-label={`Quantité reçue ${index+1}`} inputMode="decimal" value={row.received} onChange={event => update(row.id,{received:event.target.value})}/></div>
      <div className="space-y-1.5"><label htmlFor={`receive-lot-${row.id}`} className="text-sm">Numéro de lot</label><Input className="h-11" id={`receive-lot-${row.id}`} aria-label={`Lot reçu ${index+1}`} value={row.lot} placeholder="Facultatif" onChange={event=>update(row.id,{lot:event.target.value})}/></div>
      <div className="space-y-1.5"><label className="text-sm">Péremption</label><StockDatePicker disabled={busy} clearable label={`Péremption reçue ${index+1}`} value={row.expiry} onChange={expiry=>update(row.id,{expiry})}/></div>
      <div className="min-w-0 space-y-1.5"><label className="text-sm">Emplacement</label><SearchableSelect label={`Emplacement reçu ${index+1}`} controlClassName="h-11 [&_input]:text-foreground" value={row.location} onValueChange={location=>update(row.id,{location})} disabled={busy} options={inventory.locations.filter(item=>item.active).map(item=>({value:item.id,label:item.name}))}/></div>
    </div></fieldset>)}
    {!valid && <p className="text-sm text-muted-foreground">Saisissez au moins une quantité positive, sans dépasser le restant commandé.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Annuler</Button><Button type="submit" disabled={busy||!valid||!inventory.ready||!currentUser}>{busy?"Réception…":"Confirmer la réception"}</Button></div>
  </form>;
}

export function PurchasingPanel() {
  const purchasing=usePurchasing(); const products=useProductsRepository(); const {currentUser}=useAuth();
  const [view,setView]=useState("orders"); const [supplierFilter,setSupplierFilter]=useState("");
  const [supplierEdit,setSupplierEdit]=useState<StockSupplier|"new"|null>(null);
  const [orderEdit,setOrderEdit]=useState<{order?:PurchaseOrder;fromAlerts:boolean}|null>(null);
  const [selected,setSelected]=useState<string|null>(null); const [receiving,setReceiving]=useState(false);
  const [cancelling,setCancelling]=useState<PurchaseOrder|null>(null);
  const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null);
  const activeSuppliers=purchasing.suppliers.filter(item=>!item.archived_at);
  const needs=products.data.filter(item=>!item.archivedAt&&restockNeed(item)>0);
  const order=purchasing.orders.find(item=>item.id===selected); const lines=purchasing.lines.filter(line=>line.order_id===selected);
  const supplier=purchasing.suppliers.find(item=>item.id===order?.supplier_id);
  const run=async(operation:()=>Promise<unknown>)=>{if(busy)return;setBusy(true);setError(null);try{await operation();}catch(error){setError(failure(error));}finally{setBusy(false);}};
  if(!isTauriRuntime())return <p className="p-5 text-sm text-muted-foreground">Les fournisseurs, commandes et réceptions sont disponibles dans l’application de bureau.</p>;
  return <section aria-label="Approvisionnements" className="min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><Tabs value={view} onValueChange={value=>{setView(value);setSelected(null);setOrderEdit(null);setReceiving(false);}}><TabsList aria-label="Vue des approvisionnements"><TabsTrigger value="orders">Commandes</TabsTrigger><TabsTrigger value="suppliers">Fournisseurs</TabsTrigger></TabsList></Tabs>
      <div className="flex flex-wrap gap-2">{view==="orders"?<><Button variant="outline" disabled={!purchasing.ready||!activeSuppliers.length||!needs.length||products.data.some(item=>item.availabilityPending)} onClick={()=>{setOrderEdit({fromAlerts:true});setSelected(null);}}>Depuis les alertes ({needs.length})</Button><Button disabled={!purchasing.ready||!activeSuppliers.length} onClick={()=>{setOrderEdit({fromAlerts:false});setSelected(null);}}><Plus className="size-4"/>Nouvelle commande</Button></>:<Button disabled={!purchasing.ready} onClick={()=>setSupplierEdit("new")}><Plus className="size-4"/>Nouveau fournisseur</Button>}</div>
    </div>
    {(purchasing.error||error)&&<div role="alert" className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-destructive">{purchasing.error||error}{purchasing.error&&<Button variant="outline" onClick={purchasing.refresh}>Actualiser</Button>}</div>}
    {!purchasing.ready&&!purchasing.error&&<p role="status" className="p-4 text-sm text-muted-foreground">Chargement des approvisionnements…</p>}
    {view==="suppliers"?<>
      {supplierEdit&&<SupplierForm key={supplierEdit==="new"?"new":supplierEdit.id} supplier={supplierEdit==="new"?undefined:supplierEdit} onClose={()=>setSupplierEdit(null)}/>}
      <Table className="table-fixed"><TableHeader><TableRow><TableHead className="w-[30%]">Fournisseur</TableHead><TableHead className="w-[35%]">Contact</TableHead><TableHead className="w-[35%]"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>
        {!purchasing.suppliers.length?<TableRow><TableCell colSpan={3} className="h-32 whitespace-normal text-center text-muted-foreground">Ajoutez un fournisseur pour préparer votre première commande.</TableCell></TableRow>:purchasing.suppliers.map(item=><TableRow key={item.id}><TableCell className="whitespace-normal break-words align-top"><span className="font-medium">{item.name}</span>{item.archived_at&&<Badge variant="outline" className="ml-2">Archivé</Badge>}</TableCell><TableCell className="whitespace-normal break-words align-top"><span className="block">{formatPhone(item.phone)}</span><span className="block text-xs text-muted-foreground">{item.email||item.address||"Contact non renseigné"}</span></TableCell><TableCell className="whitespace-normal align-top"><div className="flex flex-wrap justify-end gap-1"><Button size="sm" variant="ghost" onClick={()=>{setView("orders");setSupplierFilter(item.id);}}>Historique</Button><Button size="sm" variant="ghost" onClick={()=>setSupplierEdit(item)}>Modifier</Button><Button size="sm" variant="ghost" disabled={busy} onClick={()=>void run(()=>purchasingService.supplier({id:item.id,name:item.name,phone:item.phone,email:item.email,address:item.address,notes:item.notes,archivedAt:item.archived_at?null:new Date().toISOString()}))}>{item.archived_at?"Restaurer":"Archiver"}</Button></div></TableCell></TableRow>)}
      </TableBody></Table>
    </>:<>
      {!activeSuppliers.length&&purchasing.ready&&<p className="p-4 text-sm text-muted-foreground">Ajoutez un fournisseur dans l’onglet Fournisseurs pour préparer une commande.</p>}
      {orderEdit?<OrderForm key={orderEdit.order?.id??"new"} order={orderEdit.order} fromAlerts={orderEdit.fromAlerts} initialLines={purchasing.lines.filter(line=>line.order_id===orderEdit.order?.id)} onClose={()=>setOrderEdit(null)} onSaved={id=>{setOrderEdit(null);setSelected(id);}}/>:order?<>
        <div className="space-y-4 p-5"><Button size="sm" variant="ghost" onClick={()=>{setSelected(null);setReceiving(false);}}><ArrowLeft className="size-4"/>Toutes les commandes</Button><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-lg font-medium">{order.reference}</h3><p className="mt-1 text-sm text-muted-foreground">{order.supplier_name} · {dateLabel(order.created_at)}</p></div><Badge variant="outline">{labels[order.status]}</Badge></div>
          <div className="flex flex-wrap gap-2">{order.status==="draft"&&<><Button disabled={busy||!purchasing.ready||!currentUser} onClick={()=>void run(()=>purchasingService.transition(order.id,"order",currentUser!.id))}>Confirmer la commande</Button><Button variant="outline" onClick={()=>setOrderEdit({order,fromAlerts:false})}>Modifier le brouillon</Button></>}{["ordered","partial"].includes(order.status)&&<Button disabled={busy||!purchasing.ready} onClick={()=>setReceiving(true)}>Réceptionner</Button>}<Button variant="outline" disabled={busy||!supplier} onClick={()=>void run(()=>exportPurchaseOrder(order,supplier!,lines))}>Exporter le bon</Button>{["draft","ordered","partial"].includes(order.status)&&<Button variant="ghost" disabled={busy||!currentUser} onClick={()=>{setError(null);setCancelling(order);}}>{order.status==="partial"?"Annuler le reliquat":"Annuler la commande"}</Button>}</div>
        </div>
        {receiving&&<ReceiptForm key={order.id} order={order} lines={lines} onClose={()=>setReceiving(false)}/>}
        <Table className="table-fixed"><TableHeader><TableRow><TableHead className="w-[40%]">Produit</TableHead><TableHead className="w-[20%] text-right">Commandé</TableHead><TableHead className="w-[20%] text-right">Reçu</TableHead><TableHead className="w-[20%] text-right">Coût unitaire</TableHead></TableRow></TableHeader><TableBody>{lines.map(line=><TableRow key={line.id}><TableCell className="whitespace-normal break-words font-medium">{line.product_name}</TableCell><TableCell className="whitespace-normal text-right tabular-nums">{stockQuantityLabel(line.quantity,line.unit)}</TableCell><TableCell className="whitespace-normal text-right tabular-nums">{stockQuantityLabel(line.received_quantity,line.unit)}</TableCell><TableCell className="whitespace-normal text-right tabular-nums">{formatDZD(line.unit_cost_amount)}</TableCell></TableRow>)}</TableBody></Table>
        <p className="border-y border-border p-4 text-right text-sm tabular-nums">Total de la commande : <strong>{formatDZD(order.total_amount)}</strong></p>
        <div className="space-y-3 p-5"><h4 className="font-medium">Réceptions</h4>{!purchasing.receipts.some(item=>item.order_id===order.id)?<p className="text-sm text-muted-foreground">Aucune réception enregistrée.</p>:purchasing.receipts.filter(item=>item.order_id===order.id).map(item=><div key={item.id} className="border-t border-border pt-3"><p className="text-sm font-medium">{item.reference||"Livraison sans référence"} · {dateLabel(item.received_at)}</p><ul className="mt-2 space-y-1 text-xs text-muted-foreground">{purchasing.receiptLines.filter(line=>line.receipt_id===item.id).map(line=>{const source=lines.find(item=>item.id===line.order_line_id);return <li key={line.id}>{source?.product_name} · {stockQuantityLabel(line.quantity,source?.unit||"unité")} · {line.lot_number?`Lot ${line.lot_number}`:"Sans lot"} · Mouvement enregistré</li>;})}</ul></div>)}</div>
      </>:<>
        <div className="max-w-sm p-4"><SearchableSelect label="Historique du fournisseur" controlClassName="[&_input]:text-foreground" value={supplierFilter} onValueChange={setSupplierFilter} options={[{value:"",label:"Tous les fournisseurs"},...purchasing.suppliers.map(item=>({value:item.id,label:item.name}))]}/></div>
        <Table className="table-fixed"><TableHeader><TableRow><TableHead className="w-[30%]">Commande</TableHead><TableHead className="w-[30%]">Fournisseur</TableHead><TableHead className="w-[23%]">État</TableHead><TableHead className="w-[17%] text-right">Total</TableHead></TableRow></TableHeader><TableBody>{!purchasing.orders.some(item=>!supplierFilter||item.supplier_id===supplierFilter)?<TableRow><TableCell colSpan={4} className="h-32 whitespace-normal text-center text-muted-foreground">Aucune commande pour ce filtre.</TableCell></TableRow>:purchasing.orders.filter(item=>!supplierFilter||item.supplier_id===supplierFilter).map(item=><TableRow key={item.id}><TableCell className="whitespace-normal break-words"><Button variant="link" className="h-auto whitespace-normal p-0 text-left dark:text-blue-300 dark:hover:text-blue-200" onClick={()=>{setSelected(item.id);setReceiving(false);}}>{item.reference}</Button><span className="mt-1 block text-xs text-muted-foreground">{dateLabel(item.created_at)}</span></TableCell><TableCell className="whitespace-normal break-words">{item.supplier_name}</TableCell><TableCell className="whitespace-normal"><Badge variant="outline">{labels[item.status]}</Badge></TableCell><TableCell className="whitespace-normal text-right tabular-nums">{formatDZD(item.total_amount)}</TableCell></TableRow>)}</TableBody></Table>
      </>}
    </>}
    <AlertDialog open={!!cancelling} onOpenChange={open=>{if(!open&&!busy)setCancelling(null);}}>
      <AlertDialogContent className="data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-lg"><AlertDialogHeader>
        <AlertDialogTitle>{cancelling?.status==="partial"?"Annuler le reliquat de":"Annuler la commande"} {cancelling?.reference} ?</AlertDialogTitle>
        <AlertDialogDescription>{cancelling?.status==="partial"?"Seules les quantités restant à recevoir seront annulées. Les réceptions déjà enregistrées et leurs mouvements sont conservés.":"Cette commande ne pourra plus être réceptionnée. Aucun stock ne sera modifié."} Cette annulation est définitive.</AlertDialogDescription>
      </AlertDialogHeader>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<AlertDialogFooter className="sm:flex-wrap">
        <AlertDialogCancel disabled={busy}>Conserver la commande</AlertDialogCancel>
        <Button variant="destructive" className="text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200" disabled={busy||!cancelling||!currentUser} onClick={()=>void run(async()=>{await purchasingService.transition(cancelling!.id,"cancel",currentUser!.id);setCancelling(null);setReceiving(false);})}>{busy?"Annulation…":cancelling?.status==="partial"?"Confirmer l’annulation du reliquat":"Confirmer l’annulation"}</Button>
      </AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </section>;
}
