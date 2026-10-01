import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { DEFAULT_INVOICE_SETTINGS, getInvoiceSettings, INVOICE_ACCENTS, prepareInvoiceLogo, saveInvoiceSettings, type InvoiceSettings } from "@/services/invoiceSettingsService";
import { InvoicePdfPreview } from "./invoice-pdf-preview";
import type { InvoicePdfData } from "@/lib/invoice-pdf";

const SAMPLE: InvoicePdfData = {
  number: "EXEMPLE-001", date: new Date("2026-09-29T12:00:00"),
  patientName: "Milo", ownerName: "Propriétaire exemple",
  items: [{ description: "Consultation vétérinaire", amount: 400000 }, { description: "Soins complémentaires", amount: 300000 }],
  totalAmount: 700000, paidAmount: 400000, balanceAmount: 300000,
};

export function InvoiceSettingsPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const load = async () => {
    setLoading(true); setError("");
    try { const value = await getInvoiceSettings(); setSettings(value); setSaved(JSON.stringify(value)); }
    catch (error) { setError(error instanceof Error ? error.message : "Impossible de charger les réglages."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const change = (key: keyof InvoiceSettings, value: string) => setSettings((previous) => ({ ...previous, [key]: value }));
  const save = async () => {
    setSaving(true);
    try {
      await saveInvoiceSettings(settings);
      const value = await getInvoiceSettings(); setSettings(value); setSaved(JSON.stringify(value));
      toast.success("Identité du cabinet et modèle de facture enregistrés.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer les réglages."); }
    finally { setSaving(false); }
  };
  if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;
  if (error) return <div role="alert"><p className="mb-3 text-destructive">{error}</p><Button onClick={() => void load()} variant="outline">Réessayer</Button></div>;
  const dirty = JSON.stringify(settings) !== saved;
  return (
    <div className="settings-section-stack">
      <section className="settings-panel">
        <div className="settings-panel-heading"><h3>Identité du cabinet</h3><p>Ces coordonnées figurent dans l’en-tête des nouvelles factures.</p></div>
        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <Field className="sm:col-span-2"><FieldLabel htmlFor="invoice-clinic-name">Nom du cabinet</FieldLabel><Input id="invoice-clinic-name" maxLength={120} onChange={(e) => change("name", e.target.value)} value={settings.name} /></Field>
          <Field className="sm:col-span-2"><FieldLabel htmlFor="invoice-address">Adresse</FieldLabel><Textarea id="invoice-address" maxLength={400} onChange={(e) => change("address", e.target.value)} placeholder="Adresse du cabinet" rows={2} value={settings.address} /></Field>
          <Field><FieldLabel htmlFor="invoice-phone">Téléphone du cabinet</FieldLabel><Input id="invoice-phone" type="tel" maxLength={80} onChange={(e) => change("phone", e.target.value)} value={settings.phone} /></Field>
          <Field><FieldLabel htmlFor="invoice-email">E-mail du cabinet</FieldLabel><Input id="invoice-email" type="email" maxLength={160} onChange={(e) => change("email", e.target.value)} value={settings.email} /></Field>
          <Field className="sm:col-span-2"><FieldLabel htmlFor="invoice-registration">Identification professionnelle ou fiscale</FieldLabel><Input id="invoice-registration" maxLength={160} onChange={(e) => change("registrationNumber", e.target.value)} placeholder="N° d’inscription, NIF… (facultatif)" value={settings.registrationNumber} /></Field>
        </div>
      </section>
      <section className="settings-panel">
        <div className="settings-panel-heading"><h3>Présentation de la facture</h3><p>Un document lisible, à l’image de votre cabinet.</p></div>
        <div className="settings-row">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-lg border border-border bg-white p-2">{settings.logoDataUrl ? <img alt="Logo du cabinet" className="max-h-full max-w-full object-contain" src={settings.logoDataUrl} /> : <span className="text-xs text-zinc-500">Sans logo</span>}</div>
            <div><p className="settings-row-title">Votre logo</p><p className="settings-row-detail">PNG, JPEG ou WebP · 5 Mo max.<br />Les proportions sont conservées.</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={uploading} onClick={() => fileInputRef.current?.click()} size="sm" variant="outline">{uploading ? "Préparation…" : "Choisir un logo"}</Button>
            <input accept="image/png,image/jpeg,image/webp" className="sr-only" ref={fileInputRef} tabIndex={-1} aria-label="Fichier du logo du cabinet" disabled={uploading} id="invoice-logo" type="file" onChange={async (event) => {
              const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
              setUploading(true);
              try { change("logoDataUrl", await prepareInvoiceLogo(file)); }
              catch (error) { toast.error(error instanceof Error ? error.message : "Cette image ne peut pas être utilisée."); }
              finally { setUploading(false); }
            }} />
            {settings.logoDataUrl && <Button disabled={uploading} onClick={() => change("logoDataUrl", "")} size="sm" variant="ghost">Retirer</Button>}
          </div>
        </div>
        <div className="settings-row"><div><p className="settings-row-title">Couleur du document</p><p className="settings-row-detail">En-tête et montants principaux.</p></div><div aria-label="Couleur des factures" className="settings-segmented" role="group">{Object.entries(INVOICE_ACCENTS).map(([key, value]) => <button aria-pressed={settings.accent === key} className={cn(settings.accent === key && "settings-segmented-active")} key={key} onClick={() => change("accent", key)} type="button"><span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: value.color }} />{value.label}</button>)}</div></div>
        <div className="border-t border-border p-6"><Field><FieldLabel htmlFor="invoice-footer">Message de pied de page</FieldLabel><Textarea id="invoice-footer" maxLength={400} onChange={(e) => change("footer", e.target.value)} rows={3} value={settings.footer} /><p className="text-xs text-muted-foreground">Remerciement ou mentions du cabinet. Facultatif.</p></Field></div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground" role="status">{dirty ? "Modifications non enregistrées" : "Les factures déjà émises conservent leur identité d’origine."}</p>
        <div className="flex gap-2"><Button disabled={!settings.name.trim() || uploading} onClick={() => setPreview(true)} variant="outline">Aperçu PDF</Button><Button disabled={!dirty || saving || uploading || !settings.name.trim()} onClick={() => void save()}>{saving ? "Enregistrement…" : "Enregistrer"}</Button></div>
      </div>
      {preview && <InvoicePdfPreview data={SAMPLE} settings={settings} onClose={() => setPreview(false)} sample />}
    </div>
  );
}
