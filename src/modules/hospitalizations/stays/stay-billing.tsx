import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePatientsRepository, useProductsRepository } from "@/data/repositories";
import { emitSQLiteDataChanged } from "@/hooks/useSQLite";
import { isTauriRuntime } from "@/services/browser-store";
import { billingService } from "@/services/billingService";
import { stayDays } from "./domain";
import { prepareStayInvoice, stayInvoiceInput } from "./billing";
import { staysService } from "./service";
import type { Stay } from "./store";

export function StayBilling({ stay }: { stay: Stay }) {
  const { currentUser } = useAuth();
  const patients = usePatientsRepository(), products = useProductsRepository();
  const [productId, setProductId] = useState("");
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const desktop = isTauriRuntime();
  useEffect(() => {
    if (!desktop) { setLoading(false); return; }
    let alive = true;
    void billingService.getInvoice(`stay-invoice:${stay.id}`).then(invoice => { if (alive) setInvoiceId(invoice?.id ?? null); }).catch(() => { if (alive) setError("La facture du séjour n’a pas pu être chargée."); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [stay.id, desktop]);
  const product = products.data.find(item => item.id === productId);
  const days = stayDays(new Date(stay.admitted_at), new Date(stay.discharged_at!));
  return <section className="space-y-3 rounded-2xl border border-[#F2F2F2] bg-card p-5 dark:border-border">
    <h3 className="text-[16px] font-medium">Facturation du séjour</h3>
    <p className="text-[13px] text-muted-foreground">{days} journée{days > 1 ? "s" : ""} occupée{days > 1 ? "s" : ""}. Minimum une journée, sortie à minuit exclue. Le brouillon devra être vérifié et émis dans Finances.</p>
    {!desktop ? <p className="text-[13px] text-muted-foreground">Facturation indisponible sur le web.</p> : loading ? <p role="status" className="text-[13px]">Chargement de la facture…</p> : invoiceId ? <p className="text-[13px]">La facture de ce séjour est disponible dans Finances.</p> :
      <form className="space-y-3" onSubmit={async event => {
        event.preventDefault();
        const patient = patients.data.find(item => item.id === stay.patient_id);
        if (!currentUser || !patient || !product || busy) return;
        setBusy(true); setError(null);
        try {
          const current = await staysService.get(stay.id);
          const invoice = await prepareStayInvoice(stayInvoiceInput(current, patient, product, currentUser.id), billingService);
          setInvoiceId(invoice.id);
          emitSQLiteDataChanged("invoices"); emitSQLiteDataChanged("invoice_lines");
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Le brouillon n’a pas pu être préparé."); }
        finally { setBusy(false); }
      }}>
        <label className="block space-y-2 text-[13px]">Tarif par journée
          <select aria-label="Tarif par journée" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[13px]" value={productId} onChange={event => setProductId(event.target.value)}>
            <option value="">Choisir un tarif du catalogue</option>
            {products.data.filter(item => !item.archivedAt).map(item => <option key={item.id} value={item.id}>{item.name} · {(item.salePriceAmount / 100).toLocaleString("fr-FR")} DA</option>)}
          </select>
        </label>
        {product && <p className="text-[14px] font-medium">Total proposé : {(days * product.salePriceAmount / 100).toLocaleString("fr-FR")} DA</p>}
        <Button type="submit" className="h-11" disabled={!product || !currentUser || busy}>{busy ? "Préparation…" : "Créer le brouillon de facture"}</Button>
      </form>}
    {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
  </section>;
}
