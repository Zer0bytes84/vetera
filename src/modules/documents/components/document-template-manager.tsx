import { useId, useRef, useState } from "react";
import { Copy, FileText, Pencil, Plus, RefreshCw, Search, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogBody, FormDialogContent, FormDialogFooter, FormDialogHeader } from "@/components/ui/form-dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/choice-controls";
import { SettingsSection } from "@/components/settings-section";
import { useAuth } from "@/contexts/AuthContext";
import { DOCUMENT_TYPES, type DocumentKind, type ManagedDocumentTemplate } from "../document-domain";
import { documentsService } from "../document-service";
import { DOCUMENT_VARIABLES } from "../document-variables";
import { MANAGED_DOCUMENT_DEFAULTS } from "../document-migration";
import { useManagedTemplates } from "../hooks/use-managed-documents";
import "../document-module.css";

type TemplateDraft = {
  source: ManagedDocumentTemplate | null;
  name: string;
  kind: DocumentKind;
  body: string;
  active: boolean;
};

function templateDraft(template?: ManagedDocumentTemplate, duplicate = false): TemplateDraft {
  return {
    source: duplicate ? null : template ?? null,
    name: template ? (duplicate ? `Copie de ${template.name}`.slice(0, 100) : template.name) : "",
    kind: template?.kind ?? "report",
    body: template?.body ?? "",
    active: duplicate ? true : template?.active ?? true,
  };
}

function modificationDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date non renseignée" : date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function DocumentTemplateManager({ onConfigureClinic, embedded = false }: { onConfigureClinic?: () => void; embedded?: boolean } = {}) {
  const { currentUser } = useAuth();
  const store = useManagedTemplates();
  const [draft, setDraft] = useState<TemplateDraft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ManagedDocumentTemplate | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const canEdit = currentUser?.role === "admin";
  const providedTemplate = draft?.source ? MANAGED_DOCUMENT_DEFAULTS.find(template => template.id === draft.source?.id) : undefined;
  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  const templates = store.templates.filter((template) => (
    (statusFilter === "all" || template.active === (statusFilter === "active")) &&
    (!normalizedQuery || `${template.name} ${DOCUMENT_TYPES[template.kind]}`.toLocaleLowerCase("fr").includes(normalizedQuery))
  ));
  const variables = draft ? DOCUMENT_VARIABLES.filter((variable) => !variable.kinds || variable.kinds.includes(draft.kind)) : [];
  const variableGroups = [...new Set(variables.map((variable) => variable.group))];
  const initial = draft ? templateDraft(draft.source ?? undefined) : null;
  const dirty = Boolean(draft && initial && (
    draft.name !== initial.name || draft.kind !== initial.kind || draft.body !== initial.body || draft.active !== initial.active
  ));

  const openEditor = (template?: ManagedDocumentTemplate, duplicate = false) => {
    setError("");
    setDraft(templateDraft(template, duplicate));
  };
  const requestClose = () => {
    if (busy) return;
    if (dirty && canEdit) setDiscardOpen(true);
    else setDraft(null);
  };
  const save = async () => {
    if (!draft || !currentUser || !canEdit || busy) return;
    setBusy(true);
    setError("");
    try {
      await documentsService.saveTemplate({
        id: draft.source?.id, name: draft.name, kind: draft.kind, body: draft.body,
        active: draft.active, expectedUpdatedAt: draft.source?.updatedAt,
      }, currentUser.id);
      await store.refresh();
      setDraft(null);
      toast.success("Modèle enregistré sur cet ordinateur.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Le modèle n’a pas pu être enregistré. Réessayez.");
    } finally {
      setBusy(false);
    }
  };
  const setTemplateActive = async (template: ManagedDocumentTemplate) => {
    if (!currentUser || !canEdit || busy) return;
    setBusy(true);
    setError("");
    try {
      await documentsService.saveTemplate({
        id: template.id, name: template.name, kind: template.kind, body: template.body,
        active: !template.active, expectedUpdatedAt: template.updatedAt,
      }, currentUser.id);
      await store.refresh();
      toast.success(template.active ? "Modèle désactivé. Les documents existants sont conservés." : "Modèle activé.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Le statut du modèle n’a pas pu être modifié. Réessayez.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!pendingDelete || !currentUser || !canEdit || busy) return;
    setBusy(true);
    setError("");
    try {
      await documentsService.deleteTemplate(pendingDelete.id, currentUser.id);
      await store.refresh();
      setPendingDelete(null);
      toast.success("Modèle supprimé.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Le modèle n’a pas pu être supprimé. Réessayez.");
      setPendingDelete(null);
    } finally {
      setBusy(false);
    }
  };
  const insertVariable = (key: string) => {
    if (!draft || busy || !canEdit) return;
    const start = textarea.current?.selectionStart ?? draft.body.length;
    const end = textarea.current?.selectionEnd ?? start;
    const token = `{{${key}}}`;
    const next = draft.body.slice(0, start) + token + draft.body.slice(end);
    if (next.length > 12000) {
      setError("Le texte du modèle est limité à 12 000 caractères.");
      return;
    }
    setDraft({ ...draft, body: next });
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const newModel = canEdit ? <Button className="rounded-full" disabled={store.loading || Boolean(store.error)} onClick={() => openEditor()}><Plus aria-hidden="true" />Nouveau modèle</Button> : null;
  const intro = "Vos formulations, réutilisables pour chaque patient. Les documents déjà générés conservent leur contenu.";
  const content = (
    <>
      <div className="document-templates-clinic">
        <Settings2 aria-hidden="true" strokeWidth={1} />
        <p>L’en-tête, le logo et les mentions du cabinet sont communs à tous les documents.</p>
        {onConfigureClinic ? <Button className="rounded-full" onClick={onConfigureClinic} variant="outline">Configurer le cabinet</Button> : <span>Paramètres &gt; Mon cabinet</span>}
      </div>
      {!canEdit && <p className="document-templates-notice" role="status">Vous pouvez consulter les modèles. Leur gestion est réservée à l’administrateur du cabinet.</p>}
      {error && !draft && <p className="document-templates-error" role="alert">{error}</p>}

      {store.error ? (
        <div className="document-templates-empty" role="alert">
          <p>Les modèles n’ont pas pu être chargés.</p>
          <Button onClick={() => void store.refresh()} variant="outline"><RefreshCw aria-hidden="true" />Réessayer</Button>
        </div>
      ) : store.loading ? (
        <div className="document-templates-empty" role="status"><Spinner className="size-4" /><p>Chargement des modèles…</p></div>
      ) : (
        <>
          <div className="document-templates-toolbar">
            <label className="document-templates-search">
              <Search aria-hidden="true" />
              <span className="sr-only">Rechercher un modèle</span>
              <Input className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un modèle…" type="search" value={query} />
            </label>
            <NativeSelect aria-label="Filtrer les modèles par statut" className="document-templates-status-filter" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <NativeSelectOption value="all">Tous les statuts</NativeSelectOption>
              <NativeSelectOption value="active">Actifs</NativeSelectOption>
              <NativeSelectOption value="inactive">Inactifs</NativeSelectOption>
            </NativeSelect>
            <span className="document-templates-count">{templates.length} modèle{templates.length > 1 ? "s" : ""}</span>
          </div>
          <div className="document-templates-table-wrap">
            <table className="document-templates-table">
              <caption className="sr-only">Modèles disponibles pour la génération de documents</caption>
              <thead><tr><th scope="col">Modèle</th><th className="document-templates-type-column" scope="col">Type</th><th scope="col">Statut</th><th className="document-templates-date-column" scope="col">Modifié le</th><th className="document-templates-actions-column" scope="col">Actions</th></tr></thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td>
                      <button className="document-templates-name" onClick={() => openEditor(template)} type="button">{template.name}</button>
                      <span className="document-templates-mobile-type">{DOCUMENT_TYPES[template.kind]}</span>
                      {template.usageCount > 0 && <span className="document-templates-usage">Utilisé pour {template.usageCount} document{template.usageCount > 1 ? "s" : ""}</span>}
                    </td>
                    <td className="document-templates-type-column">{DOCUMENT_TYPES[template.kind]}</td>
                    <td className="document-templates-status-column">{canEdit
                      ? <Switch aria-label={`${template.active ? "Désactiver" : "Activer"} ${template.name}`} checked={template.active} disabled={busy} onCheckedChange={() => void setTemplateActive(template)} />
                      : <span className="document-templates-status" data-active={template.active}>{template.active ? "Actif" : "Inactif"}</span>}</td>
                    <td className="document-templates-date-column"><time dateTime={template.updatedAt}>{modificationDate(template.updatedAt)}</time></td>
                    <td>
                      <div className="document-templates-row-actions">
                        <Button aria-label={`${canEdit ? "Modifier" : "Consulter"} ${template.name}`} disabled={busy} onClick={() => openEditor(template)} size="icon-sm" title={canEdit ? "Modifier le modèle" : "Consulter le modèle"} variant="ghost"><Pencil aria-hidden="true" /></Button>
                        {canEdit && <>
                          <Button aria-label={`Dupliquer ${template.name}`} disabled={busy} onClick={() => openEditor(template, true)} size="icon-sm" title="Dupliquer le modèle" variant="ghost"><Copy aria-hidden="true" /></Button>
                          <Button aria-label={`Supprimer ${template.name}`} disabled={busy || template.usageCount > 0} onClick={() => { setError(""); setPendingDelete(template); }} size="icon-sm" title={template.usageCount > 0 ? "Ce modèle est utilisé. Vous pouvez le désactiver." : "Supprimer le modèle"} variant="ghost"><Trash2 aria-hidden="true" /></Button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
                {templates.length === 0 && <tr><td colSpan={5}><div className="document-templates-empty"><FileText aria-hidden="true" /><p>{store.templates.length ? "Aucun modèle ne correspond à votre recherche." : "Aucun modèle disponible."}</p>{store.templates.length > 0 && <Button onClick={() => { setQuery(""); setStatusFilter("all"); }} variant="outline">Effacer les filtres</Button>}</div></td></tr>}
              </tbody>
            </table>
          </div>
          <p className="document-templates-notice">Un modèle utilisé ne peut pas être supprimé. Désactivez-le pour le retirer des prochains choix. Les documents déjà générés conservent leur contenu.</p>
        </>
      )}

      <Dialog onOpenChange={(open) => { if (!open) requestClose(); }} open={Boolean(draft)}>
        {draft && <FormDialogContent className="document-template-editor" size="xl">
          <FormDialogHeader description="Insérez les champs utiles dans vos formulations. Les informations manquantes seront signalées avant validation." icon={<FileText strokeWidth={1} />} title={draft.source ? (canEdit ? "Modifier le modèle" : "Consulter le modèle") : "Nouveau modèle"} tone={null} />
          <form className="contents" onSubmit={(event) => { event.preventDefault(); void save(); }}>
            <FormDialogBody>
              <div className="document-template-editor-layout">
                <FieldGroup className="document-template-editor-fields">
                  <div className="document-template-editor-meta">
                    <Field><FieldLabel htmlFor={`${id}-name`}>Nom du modèle</FieldLabel><Input autoFocus disabled={!canEdit || busy} id={`${id}-name`} maxLength={100} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ex. Compte-rendu de consultation" required value={draft.name} /></Field>
                    <Field><FieldLabel htmlFor={`${id}-kind`}>Type de document</FieldLabel><NativeSelect className="w-full" disabled={!canEdit || busy} id={`${id}-kind`} onChange={(event) => setDraft({ ...draft, kind: event.target.value as DocumentKind })} value={draft.kind}>{Object.entries(DOCUMENT_TYPES).map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}</NativeSelect></Field>
                  </div>
                  <Field>
                    <div className="document-template-body-label"><FieldLabel htmlFor={`${id}-body`}>Texte du modèle</FieldLabel><span>{draft.body.length.toLocaleString("fr-FR")} / 12 000</span></div>
                    <Textarea className="document-template-body" disabled={!canEdit || busy} id={`${id}-body`} maxLength={12000} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder={"Patient : {{patient.nom}}\n\nMotif : {{soap.motif}}"} ref={textarea} required spellCheck value={draft.body} />
                    <FieldDescription>Les champs entre doubles accolades seront remplacés par les données du dossier. Une valeur absente affichera « [à compléter] ».</FieldDescription>
                  </Field>
                  {canEdit && providedTemplate && <Button type="button" variant="outline" disabled={busy || (draft.body === providedTemplate.body && draft.name === providedTemplate.name && draft.kind === providedTemplate.kind)} onClick={() => setDraft({ ...draft, name: providedTemplate.name, kind: providedTemplate.kind, body: providedTemplate.body })}>Rétablir le modèle fourni</Button>}
                  <div className="document-template-active-field"><Switch checked={draft.active} disabled={!canEdit || busy} id={`${id}-active`} onCheckedChange={(active) => setDraft({ ...draft, active })} /><div><label htmlFor={`${id}-active`}>Modèle actif</label><p>Disponible lors de la génération d’un document.</p></div></div>
                  {error && <p className="document-templates-error" role="alert">{error}</p>}
                </FieldGroup>
                <aside aria-label="Variables disponibles" className="document-template-variables">
                  <h3>Champs disponibles</h3><p>Cliquez pour insérer un champ à l’emplacement du curseur.</p>
                  {variableGroups.map((group) => <div className="document-template-variable-group" key={group}><h4>{group}</h4>{variables.filter((variable) => variable.group === group).map((variable) => <button className="document-template-variable" disabled={!canEdit || busy} key={variable.key} onClick={() => insertVariable(variable.key)} title={`Insérer {{${variable.key}}}`} type="button"><span>{variable.label}</span><code>{`{{${variable.key}}}`}</code></button>)}</div>)}
                </aside>
              </div>
            </FormDialogBody>
            <FormDialogFooter><Button disabled={busy} onClick={requestClose} type="button" variant="outline">{canEdit ? "Annuler" : "Fermer"}</Button>{canEdit && <Button disabled={busy || !draft.name.trim() || !draft.body.trim()} type="submit">{busy && <Spinner className="size-4" />}Enregistrer le modèle</Button>}</FormDialogFooter>
          </form>
        </FormDialogContent>}
      </Dialog>

      <AlertDialog onOpenChange={(open) => { if (!busy && !open) setPendingDelete(null); }} open={Boolean(pendingDelete)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle><AlertDialogDescription>« {pendingDelete?.name} » sera définitivement supprimé. Vous pouvez aussi le désactiver pour le conserver.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel><Button disabled={busy} onClick={() => void remove()} variant="destructive">{busy && <Spinner className="size-4" />}Supprimer le modèle</Button></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog onOpenChange={setDiscardOpen} open={discardOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Fermer sans enregistrer ?</AlertDialogTitle><AlertDialogDescription>Les modifications de ce modèle n’ont pas encore été enregistrées.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Continuer la rédaction</AlertDialogCancel><AlertDialogAction onClick={() => { setDiscardOpen(false); setDraft(null); }}>Fermer sans enregistrer</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
  return embedded ? (
    <SettingsSection aria-label="Modèles de documents" aside={newModel} icon={FileText} panelClassName="document-templates-manager flex flex-col gap-6 divide-y-0 p-6" subtitle="Vos formulations, réutilisables pour chaque patient." title="Modèles de documents">
      {content}
    </SettingsSection>
  ) : (
    <section aria-label="Modèles de documents" className="document-templates-manager">
      <div className="document-templates-heading">
        <div>
          <h2>Modèles de documents</h2>
          <p>{intro}</p>
        </div>
        {newModel}
      </div>
      {content}
    </section>
  );
}
