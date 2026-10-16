import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTemplates } from "../hooks/use-document-templates";
import {
  DEFAULT_DOCUMENT_TEMPLATES,
  DOCUMENT_KINDS,
  TEMPLATE_FIELDS,
  validateTemplate,
  type ClinicalDocumentKind,
  type ClinicalDocumentTemplate,
} from "../lib/document-templates";

export default function DocumentTemplateManager() {
  const { currentUser } = useAuth();
  const store = useDocumentTemplates();
  const [selected, setSelected] = useState<ClinicalDocumentTemplate | null>(
    null
  );
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ClinicalDocumentKind>("report");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const id = useId();
  const canEdit = currentUser?.role === "admin";
  const choose = (template: ClinicalDocumentTemplate | null) => {
    setSelected(template);
    setName(template?.name ?? "");
    setKind(template?.kind ?? "report");
    setBody(template?.body ?? "");
    setError("");
  };
  const save = async () => {
    if (!canEdit || busy) return;
    try {
      const valid = validateTemplate({ name, kind, body });
      setBusy(true);
      const now = new Date().toISOString();
      if (selected)
        await store.set(selected.id, {
          ...valid,
          createdAt: selected.createdAt,
          updatedAt: now,
        });
      else {
        const created = await store.add(valid);
        if (!created) throw new Error("Le modèle n’a pas été enregistré.");
        setSelected(created);
      }
      setError("");
      toast.success("Modèle enregistré sur cet ordinateur.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Impossible d’enregistrer le modèle."
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!selected || !canEdit || busy) return;
    setBusy(true);
    try {
      if (
        store.data.some((template) => template.id === selected.id) &&
        !(await store.remove(selected.id))
      )
        throw new Error("Le modèle n’a pas pu être supprimé.");
      choose(null);
      toast.success(
        "Modèle retiré. Les documents déjà validés sont conservés."
      );
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      aria-label="Modèles de documents"
      className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lg">Modèles de documents</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Les champs sont remplis à partir de la note validée. Les doses
            restent à la main du vétérinaire.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => choose(null)}>
            Nouveau modèle
          </Button>
        )}
      </div>
      {!canEdit && (
        <p role="status" className="text-sm text-muted-foreground">
          La modification des modèles est réservée à l’administrateur du
          cabinet.
        </p>
      )}
      {store.error && (
        <p role="alert" className="text-sm text-destructive">
          Les modèles n’ont pas pu être chargés.
        </p>
      )}
      <div className="flex flex-wrap gap-2" aria-label="Choisir un modèle">
        {store.templates.map((template) => (
          <Button
            key={template.id}
            size="sm"
            variant={selected?.id === template.id ? "secondary" : "outline"}
            onClick={() => choose(template)}
            aria-pressed={selected?.id === template.id}
          >
            {template.name}
          </Button>
        ))}
      </div>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor={id + "-name"}>Nom du modèle</FieldLabel>
          <Input
            id={id + "-name"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit || busy}
            maxLength={100}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={id + "-kind"}>Type de document</FieldLabel>
          <NativeSelect
            id={id + "-kind"}
            value={kind}
            onChange={(e) => setKind(e.target.value as ClinicalDocumentKind)}
            disabled={!canEdit || busy}
          >
            {Object.entries(DOCUMENT_KINDS).map(([key, label]) => (
              <NativeSelectOption key={key} value={key}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={id + "-body"}>Texte du modèle</FieldLabel>
          <Textarea
            id={id + "-body"}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={!canEdit || busy}
            className="min-h-72 font-mono text-xs"
            maxLength={12000}
          />
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap gap-1.5" aria-label="Champs disponibles">
        {TEMPLATE_FIELDS.map((field) => (
          <Button
            key={field}
            size="sm"
            variant="ghost"
            className="h-7 font-mono text-xs"
            disabled={!canEdit || busy}
            onClick={() => setBody((value) => value + "{{" + field + "}}")}
          >
            {"{{" + field + "}}"}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy || store.loading || !!store.error}
            onClick={() => void save()}
          >
            {busy ? "Enregistrement…" : "Enregistrer le modèle"}
          </Button>
          {selected && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              {DEFAULT_DOCUMENT_TEMPLATES.some((t) => t.id === selected.id)
                ? "Restaurer le modèle d’origine"
                : "Supprimer le modèle"}
            </Button>
          )}
        </div>
      )}

      <AlertDialog
        onOpenChange={setDeleteConfirmOpen}
        open={deleteConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selected &&
              DEFAULT_DOCUMENT_TEMPLATES.some((t) => t.id === selected.id)
                ? "Restaurer le modèle d’origine ?"
                : "Supprimer le modèle ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selected
                ? `« ${selected.name} » sera définitivement supprimé. Les documents déjà validés sont conservés.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy}
              onClick={() => {
                setDeleteConfirmOpen(false);
                void remove();
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
