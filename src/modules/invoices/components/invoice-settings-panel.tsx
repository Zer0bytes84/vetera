import { BedDouble, Building2, FileText } from "lucide-react";
import { ErrorState } from "@/design-system/patterns/error-state";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { saveHospitalizationEnabled, useHospitalizationEnabled } from "@/modules/clinique/clinic-services";
import {
  SettingsBody,
  SettingsFooter,
  SettingsRow,
  SettingsSection,
  SettingsStack,
} from "@/components/settings-section";
import {
  DEFAULT_INVOICE_SETTINGS,
  getInvoiceSettings,
  INVOICE_ACCENTS,
  prepareInvoiceLogo,
  saveInvoiceSettings,
  type InvoiceSettings,
} from "@/services/invoiceSettingsService";
import { InvoicePdfPreview } from "./invoice-pdf-preview";
import type { InvoicePdfData } from "@/lib/invoice-pdf";

const SAMPLE: InvoicePdfData = {
  number: "EXEMPLE-001", date: new Date("2026-09-29T12:00:00"),
  patientName: "Milo", ownerName: "Propriétaire exemple",
  items: [{ description: "Consultation vétérinaire", amount: 400000 }, { description: "Soins complémentaires", amount: 300000 }],
  totalAmount: 700000, paidAmount: 400000, balanceAmount: 300000,
};

/** What « Mon cabinet » edits; the invoice panel edits the rest. Together: every field of `InvoiceSettings`. */
const IDENTITY_KEYS = ["name", "address", "phone", "email", "registrationNumber", "logoDataUrl"] as const;
const INVOICE_KEYS = ["footer", "accent"] as const;

function pick<K extends keyof InvoiceSettings>(settings: InvoiceSettings, keys: readonly K[]) {
  return Object.fromEntries(keys.map((key) => [key, settings[key]])) as Pick<InvoiceSettings, K>;
}

/**
 * One source: `invoiceSettingsService`, the same stored value the invoices and every PDF read. Each panel loads it when it
 * opens and, on save, re-reads the stored value and writes back only its own fields, so the two panels never overwrite one
 * another with a stale copy.
 */
function useInvoiceSettings<K extends keyof InvoiceSettings>(keys: readonly K[]) {
  const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const value = await getInvoiceSettings(); setSettings(value); setSaved(JSON.stringify(pick(value, keys))); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de charger les réglages."); }
    finally { setLoading(false); }
    // `keys` is a module constant at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { void load(); }, [load]);
  const change = <F extends keyof InvoiceSettings>(key: F, value: InvoiceSettings[F]) =>
    setSettings((previous) => ({ ...previous, [key]: value }));
  const save = async (success: string) => {
    setSaving(true);
    try {
      const stored = await getInvoiceSettings();
      await saveInvoiceSettings({ ...stored, ...pick(settings, keys) });
      const value = await getInvoiceSettings();
      setSettings(value); setSaved(JSON.stringify(pick(value, keys)));
      toast.success(success);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Impossible d’enregistrer les réglages."); }
    finally { setSaving(false); }
  };
  const dirty = JSON.stringify(pick(settings, keys)) !== saved;
  return { settings, change, save, saving, dirty, loading, error, reload: load };
}

/** « Mon cabinet »: the clinic's identity, as the invoices and documents print it. */
export function ClinicIdentityPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { settings, change, save, saving, dirty, loading, error, reload } = useInvoiceSettings(IDENTITY_KEYS);
  const [uploading, setUploading] = useState(false);
  if (loading) return <div className="flex justify-center p-12"><Spinner /></div>;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;
  return (
    <SettingsStack>
      <SettingsSection icon={Building2} subtitle="Ces coordonnées figurent dans l’en-tête des factures et des documents." title="Identité du cabinet">
        <SettingsBody>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field className="sm:col-span-2"><FieldLabel htmlFor="invoice-clinic-name">Nom du cabinet</FieldLabel><Input id="invoice-clinic-name" maxLength={120} onChange={(e) => change("name", e.target.value)} value={settings.name} /></Field>
            <Field className="sm:col-span-2"><FieldLabel htmlFor="invoice-address">Adresse</FieldLabel><Textarea id="invoice-address" maxLength={400} onChange={(e) => change("address", e.target.value)} placeholder="Adresse du cabinet" rows={2} value={settings.address} /></Field>
            <Field><FieldLabel htmlFor="invoice-phone">Téléphone du cabinet</FieldLabel><Input id="invoice-phone" type="tel" maxLength={80} onChange={(e) => change("phone", e.target.value)} value={settings.phone} /></Field>
            <Field><FieldLabel htmlFor="invoice-email">E-mail du cabinet</FieldLabel><Input id="invoice-email" type="email" maxLength={160} onChange={(e) => change("email", e.target.value)} value={settings.email} /></Field>
            <Field className="sm:col-span-2"><FieldLabel htmlFor="invoice-registration">Identification professionnelle ou fiscale</FieldLabel><Input id="invoice-registration" maxLength={160} onChange={(e) => change("registrationNumber", e.target.value)} placeholder="N° d’inscription, NIF… (facultatif)" value={settings.registrationNumber} /></Field>
          </div>
        </SettingsBody>
        <SettingsRow
          detail={<>PNG, JPEG ou WebP · 5 Mo max. Les proportions sont conservées.</>}
          title="Votre logo"
        >
          <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-2xl border border-border bg-white p-2">
            {settings.logoDataUrl
              ? <img alt="Logo du cabinet" className="max-h-full max-w-full object-contain" src={settings.logoDataUrl} />
              : <span className="text-xs text-zinc-500">Sans logo</span>}
          </div>
          <Button className="rounded-full" disabled={uploading} onClick={() => fileInputRef.current?.click()} size="sm" variant="outline">{uploading ? "Préparation…" : "Choisir un logo"}</Button>
          <input accept="image/png,image/jpeg,image/webp" aria-label="Fichier du logo du cabinet" className="sr-only" disabled={uploading} id="invoice-logo" onChange={async (event) => {
            const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
            setUploading(true);
            try { change("logoDataUrl", await prepareInvoiceLogo(file)); }
            catch (cause) { toast.error(cause instanceof Error ? cause.message : "Cette image ne peut pas être utilisée."); }
            finally { setUploading(false); }
          }} ref={fileInputRef} tabIndex={-1} type="file" />
          {settings.logoDataUrl && <Button className="rounded-full" disabled={uploading} onClick={() => change("logoDataUrl", "")} size="sm" variant="ghost">Retirer</Button>}
        </SettingsRow>
        <SettingsFooter>
          <p className="text-xs text-muted-foreground" role="status">{dirty ? "Modifications non enregistrées" : "Les factures déjà émises conservent leur identité d’origine."}</p>
          <Button className="rounded-full" disabled={!dirty || saving || uploading || !settings.name.trim()} onClick={() => void save("Identité du cabinet enregistrée.")}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </SettingsFooter>
      </SettingsSection>
      <ClinicServicesSection />
    </SettingsStack>
  );
}

/** What the practice offers: a simple practice only sees what it uses. Saved at once, like every switch. */
function ClinicServicesSection() {
  const hospitalization = useHospitalizationEnabled();
  const [saving, setSaving] = useState(false);
  return (
    <SettingsSection icon={BedDouble} subtitle="L’application n’affiche que ce que votre cabinet utilise." title="Services du cabinet">
      <SettingsRow
        detail="Décoché, l’hospitalisation disparaît de la navigation et de la page Soins. Les séjours déjà enregistrés sont conservés."
        detailId="clinic-hospitalization-detail"
        htmlFor="clinic-hospitalization"
        title="Mon cabinet propose l’hospitalisation"
      >
        <Switch
          aria-describedby="clinic-hospitalization-detail"
          checked={hospitalization}
          disabled={saving}
          id="clinic-hospitalization"
          onCheckedChange={(next) => {
            setSaving(true);
            void saveHospitalizationEnabled(next)
              .catch(() => toast.error("Le réglage n’a pas pu être enregistré. Réessayez."))
              .then(() => setSaving(false));
          }}
        />
      </SettingsRow>
    </SettingsSection>
  );
}

/** « Facturation »: how the invoice looks. The identity it prints is edited in « Mon cabinet ». */
export function InvoiceSettingsPanel({ onOpenClinic }: { onOpenClinic?: () => void }) {
  const { settings, change, save, saving, dirty, loading, error, reload } = useInvoiceSettings(INVOICE_KEYS);
  const [preview, setPreview] = useState(false);
  if (loading) return <div className="flex justify-center p-12"><Spinner /></div>;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;
  return (
    <SettingsStack>
      <SettingsSection icon={FileText} subtitle="Un document lisible, à l’image de votre cabinet." title="Présentation de la facture">
        <SettingsRow
          detail={settings.name ? `${settings.name} : nom, adresse, coordonnées et logo viennent de Mon cabinet.` : "Nom, adresse, coordonnées et logo viennent de Mon cabinet."}
          title="Identité imprimée"
        >
          {onOpenClinic && <Button className="rounded-full" onClick={onOpenClinic} size="sm" variant="outline">Modifier dans Mon cabinet</Button>}
        </SettingsRow>
        <SettingsRow detail="En-tête et montants principaux." title="Couleur du document">
          <Segmented
            label="Couleur des factures"
            onValueChange={(accent) => change("accent", accent)}
            options={Object.entries(INVOICE_ACCENTS).map(([value, accent]) => ({
              value: value as InvoiceSettings["accent"],
              label: <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="inline-block size-2 rounded-full" style={{ background: accent.color }} />{accent.label}</span>,
            }))}
            value={settings.accent}
          />
        </SettingsRow>
        <SettingsBody>
          <Field><FieldLabel htmlFor="invoice-footer">Message de pied de page</FieldLabel><Textarea id="invoice-footer" maxLength={400} onChange={(e) => change("footer", e.target.value)} rows={3} value={settings.footer} /><p className="text-xs text-muted-foreground">Remerciement ou mentions du cabinet. Facultatif.</p></Field>
        </SettingsBody>
        <SettingsFooter>
          <p className="text-xs text-muted-foreground" role="status">{dirty ? "Modifications non enregistrées" : "Les factures déjà émises conservent leur présentation d’origine."}</p>
          <div className="flex gap-3">
            <Button className="rounded-full" disabled={!settings.name.trim()} onClick={() => setPreview(true)} variant="outline">Aperçu PDF</Button>
            <Button className="rounded-full" disabled={!dirty || saving} onClick={() => void save("Présentation de la facture enregistrée.")}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </div>
        </SettingsFooter>
      </SettingsSection>
      {preview && <InvoicePdfPreview data={SAMPLE} settings={settings} onClose={() => setPreview(false)} sample />}
    </SettingsStack>
  );
}
