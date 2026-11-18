import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
} from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { User } from "@/lib/icons";
import type { Owner } from "@/types/db";
import {
  type OwnerContactDraft,
  ownerContactDraft,
  saveOwnerContact,
} from "../owner-contact-edit";

/**
 * « Modifier les coordonnées », opened from the patient's page. The same fields, in the same order and with the same
 * labels, as the owner card of the patients list dialog. A rule the draft breaks is said in the dialog, which stays open.
 */
export function OwnerContactDialog({
  onClose,
  onUpdate,
  owner,
}: {
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Owner>) => Promise<boolean>;
  owner: Owner;
}) {
  const [draft, setDraft] = useState<OwnerContactDraft>(() =>
    ownerContactDraft(owner)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // A refusal is said until the person changes the draft again.
  const change = (patch: Partial<OwnerContactDraft>) => {
    setError(null);
    setDraft((current) => ({ ...current, ...patch }));
  };
  const set =
    (key: keyof OwnerContactDraft) => (event: { target: { value: string } }) =>
      change({ [key]: event.target.value });

  const save = async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    setError(null);
    const result = await saveOwnerContact(onUpdate, owner, draft);
    setSaving(false);
    if (result.ok) {
      toast.success("Coordonnées du propriétaire mises à jour.");
      onClose();
    } else {
      setError(result.error);
    }
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!(open || saving)) {
          onClose();
        }
      }}
      open
    >
      <FormDialogContent size="md">
        <FormDialogHeader
          description="Corrigées ici, elles le sont partout : fiche, Agenda, Rappels et liste des patients."
          icon={<User strokeWidth={1.5} />}
          title="Modifier les coordonnées du propriétaire"
        />
        <form
          aria-label="Coordonnées du propriétaire"
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <FormDialogBody>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="owner-edit-last-name">Nom</FieldLabel>
                  <Input
                    autoFocus
                    id="owner-edit-last-name"
                    onChange={set("lastName")}
                    value={draft.lastName}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="owner-edit-first-name">
                    Prénom
                  </FieldLabel>
                  <Input
                    id="owner-edit-first-name"
                    onChange={set("firstName")}
                    value={draft.firstName}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="owner-edit-phone">Téléphone</FieldLabel>
                  <Input
                    id="owner-edit-phone"
                    inputMode="tel"
                    onChange={set("phone")}
                    value={draft.phone}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="owner-edit-email">Email</FieldLabel>
                  <Input
                    id="owner-edit-email"
                    onChange={set("email")}
                    type="email"
                    value={draft.email}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="owner-edit-address">Adresse</FieldLabel>
                <Input
                  id="owner-edit-address"
                  onChange={set("address")}
                  value={draft.address}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="owner-edit-city">Ville</FieldLabel>
                <Input
                  id="owner-edit-city"
                  onChange={set("city")}
                  value={draft.city}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="owner-edit-preferred">
                    Contact privilégié
                  </FieldLabel>
                  <NativeSelect
                    className="w-full"
                    id="owner-edit-preferred"
                    onChange={(event) =>
                      change({
                        preferredContact: event.target
                          .value as Owner["preferredContact"],
                      })
                    }
                    value={draft.preferredContact || "phone"}
                  >
                    <NativeSelectOption value="phone">
                      Appel téléphonique
                    </NativeSelectOption>
                    <NativeSelectOption value="sms">SMS</NativeSelectOption>
                    <NativeSelectOption value="email">Email</NativeSelectOption>
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="owner-edit-secondary-name">
                    Contact secondaire
                  </FieldLabel>
                  <Input
                    id="owner-edit-secondary-name"
                    onChange={set("secondaryContactName")}
                    placeholder="Nom complet"
                    value={draft.secondaryContactName}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="owner-edit-secondary-phone">
                  Téléphone secondaire
                </FieldLabel>
                <Input
                  id="owner-edit-secondary-phone"
                  inputMode="tel"
                  onChange={set("secondaryContactPhone")}
                  placeholder="Numéro en cas d'indisponibilité"
                  value={draft.secondaryContactPhone}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="owner-edit-notes">
                  Consigne de communication
                </FieldLabel>
                <Textarea
                  className="min-h-20"
                  id="owner-edit-notes"
                  onChange={set("communicationNotes")}
                  placeholder="Ex. appeler après 17 h"
                  value={draft.communicationNotes}
                />
              </Field>
            </FieldGroup>
          </FormDialogBody>
          <FormDialogFooter className="flex-col sm:flex-row sm:justify-between">
            <p
              className="min-h-5 text-destructive text-sm"
              data-owner-edit-error=""
              role="alert"
            >
              {error}
            </p>
            <div className="flex gap-3">
              <Button
                disabled={saving}
                onClick={onClose}
                type="button"
                variant="outline"
              >
                Annuler
              </Button>
              <Button disabled={saving} type="submit">
                {saving ? <Spinner className="size-4" /> : null}
                Enregistrer
              </Button>
            </div>
          </FormDialogFooter>
        </form>
      </FormDialogContent>
    </Dialog>
  );
}
