import { Check, FloppyDisk, Pencil, Trash, Warning, X } from "@/lib/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import {
  loadPrescriptionTemplates,
  savePrescriptionTemplates,
} from "../lib/prescription-template-store";
import {
  cleanTemplateName,
  findTemplateByName,
  type PrescriptionTemplate,
  removeTemplate,
  renameTemplate,
  type SaveTemplateInput,
  sortTemplates,
  TEMPLATE_NAME_MAX,
  upsertTemplate,
} from "../lib/prescription-templates";
import "./prescription-templates.css";

function makeTemplateId(): string {
  return `rxtpl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Modèles d'ordonnances stockés en local (app_settings). Si le stockage est
 * illisible, aucune écriture n'est tentée : on ne remplace jamais des modèles
 * qu'on n'a pas pu lire.
 */
export function usePrescriptionTemplates() {
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const latest = useRef<PrescriptionTemplate[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadPrescriptionTemplates()
      .then((loaded) => {
        if (cancelled) {
          return;
        }
        latest.current = loaded;
        setTemplates(loaded);
        setReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        console.error(error);
        setLoadError(
          errorMessage(error, "Les modèles d'ordonnance sont illisibles.")
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback(
    async (next: PrescriptionTemplate[]) => {
      if (!ready) {
        throw new Error(
          loadError ?? "Les modèles d'ordonnance ne sont pas encore chargés."
        );
      }
      await savePrescriptionTemplates(next);
      latest.current = next;
      setTemplates(next);
    },
    [loadError, ready]
  );

  const save = useCallback(
    async (input: SaveTemplateInput) => {
      const result = upsertTemplate(latest.current, input, {
        id: makeTemplateId,
        now: new Date().toISOString(),
      });
      await commit(result.templates);
      return result;
    },
    [commit]
  );

  const rename = useCallback(
    (id: string, name: string) =>
      commit(renameTemplate(latest.current, id, name, new Date().toISOString())),
    [commit]
  );

  const remove = useCallback(
    (id: string) => commit(removeTemplate(latest.current, id)),
    [commit]
  );

  return {
    loadError,
    ready,
    remove,
    rename,
    save,
    templates: sortTemplates(templates),
  };
}

export type PrescriptionTemplatesState = ReturnType<
  typeof usePrescriptionTemplates
>;

function itemCountLabel(count: number): string {
  return count > 1 ? `${count} médicaments` : "1 médicament";
}

function alertLabel(count: number): string {
  return count > 1 ? `${count} alertes` : "1 alerte";
}

/** Badge d'alerte de sécurité d'un modèle pour le patient courant. */
function TemplateAlertBadge({ count }: { count: number }) {
  if (count === 0) {
    return null;
  }
  return (
    <span
      className="rx-template-alert"
      data-testid="prescription-template-alert"
      title="Contrôle de sécurité : interaction ou contre-indication pour ce patient"
    >
      <Warning className="size-3" weight="duotone" />
      {alertLabel(count)}
    </span>
  );
}

/**
 * Liste proposée au démarrage d'une nouvelle ordonnance : un clic applique le
 * modèle.
 */
export function PrescriptionTemplateQuickList({
  alertCountFor,
  onApply,
  onManage,
  state,
}: {
  alertCountFor: (template: PrescriptionTemplate) => number;
  onApply: (template: PrescriptionTemplate) => void;
  onManage: () => void;
  state: PrescriptionTemplatesState;
}) {
  if (!state.ready || state.templates.length === 0) {
    return null;
  }
  return (
    <div
      className="rx-template-quick"
      data-testid="prescription-template-quick-list"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium t-12 text-muted-foreground uppercase tracking-wider">
          Partir d'un modèle
        </p>
        <button
          className="t-12 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={onManage}
          type="button"
        >
          Gérer les modèles
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {state.templates.map((template) => (
          <button
            className="rx-template-chip"
            key={template.id}
            onClick={() => onApply(template)}
            title={template.items.map((it) => it.medicationName).join(" · ")}
            type="button"
          >
            <span className="font-medium text-sm">{template.name}</span>
            <span className="t-12 text-muted-foreground">
              {itemCountLabel(template.items.length)}
            </span>
            <TemplateAlertBadge count={alertCountFor(template)} />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Fenêtre « Modèles d'ordonnance » : enregistrer l'ordonnance en cours comme
 * modèle, appliquer, renommer ou supprimer un modèle.
 */
export function PrescriptionTemplatesDialog({
  alertCountFor,
  canSaveCurrent,
  currentItemCount,
  getCurrent,
  initialMode,
  onApply,
  onOpenChange,
  open,
  state,
}: {
  alertCountFor: (template: PrescriptionTemplate) => number;
  canSaveCurrent: boolean;
  currentItemCount: number;
  getCurrent: () => Omit<SaveTemplateInput, "name">;
  initialMode: "manage" | "save";
  onApply: (template: PrescriptionTemplate) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  state: PrescriptionTemplatesState;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setEditingId(null);
      setConfirmDeleteId(null);
    }
  }, [open]);

  const duplicate = name.trim()
    ? findTemplateByName(state.templates, name)
    : undefined;

  const handleSave = async () => {
    setBusy(true);
    try {
      const result = await state.save({ ...getCurrent(), name });
      toast.success(
        result.replaced
          ? `Modèle « ${result.saved.name} » mis à jour.`
          : `Modèle « ${result.saved.name} » enregistré.`
      );
      setName("");
    } catch (error) {
      toast.error(errorMessage(error, "Impossible d'enregistrer le modèle."));
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (id: string) => {
    setBusy(true);
    try {
      await state.rename(id, editingName);
      setEditingId(null);
      toast.success("Modèle renommé.");
    } catch (error) {
      toast.error(errorMessage(error, "Impossible de renommer le modèle."));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (template: PrescriptionTemplate) => {
    setBusy(true);
    try {
      await state.remove(template.id);
      setConfirmDeleteId(null);
      toast.success(`Modèle « ${template.name} » supprimé.`);
    } catch (error) {
      toast.error(errorMessage(error, "Impossible de supprimer le modèle."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="rx-template-dialog sm:max-w-lg"
        data-testid="prescription-templates-dialog"
        forceBackdrop
        initialFocus={initialMode === "save" ? nameInputRef : undefined}
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Modèles d'ordonnance</DialogTitle>
          <DialogDescription>
            Les doses sont recalculées avec le poids du patient au moment de
            l'application, et le contrôle de sécurité s'applique.
          </DialogDescription>
        </DialogHeader>

        {state.loadError ? (
          <p className="rx-template-error" role="alert">
            {state.loadError} Les modèles existants ne sont pas modifiés.
          </p>
        ) : null}

        <section className="space-y-2">
          <Label
            className="font-medium t-12 text-muted-foreground uppercase tracking-wider"
            htmlFor="rx-template-name"
          >
            Enregistrer l'ordonnance actuelle
          </Label>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSaveCurrent && name.trim() && !busy) {
                void handleSave();
              }
            }}
          >
            <Input
              className="h-9 text-sm"
              disabled={!canSaveCurrent || !state.ready}
              id="rx-template-name"
              maxLength={TEMPLATE_NAME_MAX}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Otite standard"
              ref={nameInputRef}
              value={name}
            />
            <Button
              className="h-9 shrink-0 gap-1.5"
              disabled={!canSaveCurrent || !state.ready || !name.trim() || busy}
              type="submit"
            >
              <FloppyDisk className="size-4" weight="duotone" />
              {duplicate ? "Remplacer" : "Enregistrer"}
            </Button>
          </form>
          <p className="t-12 text-muted-foreground">
            {canSaveCurrent
              ? duplicate
                ? `Le modèle « ${duplicate.name} » sera remplacé par les ${itemCountLabel(currentItemCount)} de l'ordonnance.`
                : `${itemCountLabel(currentItemCount)}, posologies, durées et instructions. Les doses calculées ne sont pas figées.`
              : "Ajoutez au moins un médicament pour enregistrer un modèle."}
          </p>
        </section>

        <section className="space-y-2">
          <p className="font-medium t-12 text-muted-foreground uppercase tracking-wider">
            Modèles enregistrés
          </p>
          {state.templates.length === 0 ? (
            <p className="rx-template-empty">
              {state.ready
                ? "Aucun modèle pour l'instant."
                : "Chargement des modèles…"}
            </p>
          ) : (
            <ul className="rx-template-list">
              {state.templates.map((template) => {
                const editing = editingId === template.id;
                const confirming = confirmDeleteId === template.id;
                return (
                  <li className="rx-template-row" key={template.id}>
                    {editing ? (
                      <form
                        className="flex min-w-0 flex-1 gap-1.5"
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (cleanTemplateName(editingName) && !busy) {
                            void handleRename(template.id);
                          }
                        }}
                      >
                        <Input
                          aria-label={`Nouveau nom pour ${template.name}`}
                          autoFocus
                          className="h-8 text-sm"
                          maxLength={TEMPLATE_NAME_MAX}
                          onChange={(event) =>
                            setEditingName(event.target.value)
                          }
                          onFocus={(event) => event.currentTarget.select()}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.stopPropagation();
                              setEditingId(null);
                            }
                          }}
                          value={editingName}
                        />
                        <Button
                          aria-label="Valider le nouveau nom"
                          className="size-8"
                          disabled={!cleanTemplateName(editingName) || busy}
                          size="icon"
                          type="submit"
                          variant="ghost"
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          aria-label="Annuler"
                          className="size-8"
                          onClick={() => setEditingId(null)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <X className="size-4" />
                        </Button>
                      </form>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-sm">
                            {template.name}
                          </p>
                          <p className="truncate t-12 text-muted-foreground">
                            {template.items
                              .map((it) => it.medicationName)
                              .join(" · ")}
                          </p>
                          <TemplateAlertBadge
                            count={alertCountFor(template)}
                          />
                        </div>
                        {confirming ? (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="t-12 text-muted-foreground">
                              Supprimer ?
                            </span>
                            <Button
                              className="h-8"
                              disabled={busy}
                              onClick={() => void handleRemove(template)}
                              size="sm"
                              type="button"
                              variant="destructive"
                            >
                              Supprimer
                            </Button>
                            <Button
                              className="h-8"
                              onClick={() => setConfirmDeleteId(null)}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              Annuler
                            </Button>
                          </div>
                        ) : (
                          <div className="flex shrink-0 items-center gap-0.5">
                            <Button
                              className="h-8"
                              onClick={() => {
                                onApply(template);
                                onOpenChange(false);
                              }}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              Appliquer
                            </Button>
                            <Button
                              aria-label={`Renommer ${template.name}`}
                              className="size-8"
                              disabled={!state.ready}
                              onClick={() => {
                                setConfirmDeleteId(null);
                                setEditingId(template.id);
                                setEditingName(template.name);
                              }}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <Pencil className="size-3.5" weight="duotone" />
                            </Button>
                            <Button
                              aria-label={`Supprimer ${template.name}`}
                              className={cn(
                                "size-8 text-muted-foreground hover:text-destructive"
                              )}
                              disabled={!state.ready}
                              onClick={() => {
                                setEditingId(null);
                                setConfirmDeleteId(template.id);
                              }}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <Trash className="size-3.5" weight="duotone" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
