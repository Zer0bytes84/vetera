import {
  ClinicalValidationError,
  normalizeOwnerDraft,
} from "@/domain/clinical/owner-patient";
import type { Owner } from "@/types/db";

/**
 * Editing the owner's details from the patient's page. The fields, their mapping and the rules are those of the
 * patients list dialog (PatientDetailsDialog, handleSaveAll); the record is written by ownersRepo.update, which
 * normalises it (normalizeOwnerDraft). Correcting the owner here corrects it everywhere the owner is read: the patient's
 * page, the Agenda, the Rappels, the patients list.
 */
export interface OwnerContactDraft {
  address: string;
  city: string;
  communicationNotes: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  preferredContact: Owner["preferredContact"];
  secondaryContactName: string;
  secondaryContactPhone: string;
}

export function ownerContactDraft(owner: Owner): OwnerContactDraft {
  return {
    address: owner.address ?? "",
    city: owner.city ?? "",
    communicationNotes: owner.communicationNotes ?? "",
    email: owner.email ?? "",
    firstName: owner.firstName ?? "",
    lastName: owner.lastName ?? "",
    phone: owner.phone ?? "",
    preferredContact: owner.preferredContact ?? undefined,
    secondaryContactName: owner.secondaryContactName ?? "",
    secondaryContactPhone: owner.secondaryContactPhone ?? "",
  };
}

/** The same patch as the patients list dialog: an emptied optional field is sent as undefined, which clears it. */
export function ownerContactPatch(draft: OwnerContactDraft): Partial<Owner> {
  return {
    firstName: draft.firstName || "",
    lastName: draft.lastName || "",
    phone: draft.phone || "",
    email: draft.email || undefined,
    address: draft.address || undefined,
    city: draft.city || undefined,
    preferredContact: draft.preferredContact,
    secondaryContactName: draft.secondaryContactName || undefined,
    secondaryContactPhone: draft.secondaryContactPhone || undefined,
    communicationNotes: draft.communicationNotes || undefined,
  };
}

/**
 * The first rule the draft breaks, in words the person can act on, or null:
 * - a name: first or last (the patients list's rule and wording);
 * - a phone or an email;
 * - phones of 8 to 15 digits;
 * - a valid email.
 */
export function ownerContactError(
  owner: Owner,
  draft: OwnerContactDraft
): string | null {
  if (!(draft.firstName.trim() || draft.lastName.trim())) {
    return "Le nom du propriétaire est obligatoire.";
  }
  const { createdAt: _createdAt, id: _id, ...current } = owner;
  try {
    normalizeOwnerDraft({ ...current, ...ownerContactPatch(draft) });
  } catch (error) {
    if (error instanceof ClinicalValidationError) {
      return error.message;
    }
    throw error;
  }
  return null;
}

export type OwnerContactSave = { ok: true } | { error: string; ok: false };

/** Checks the draft, then writes it through ownersRepo.update. Never throws: the outcome says what to tell the person. */
export async function saveOwnerContact(
  update: (id: string, patch: Partial<Owner>) => Promise<boolean>,
  owner: Owner,
  draft: OwnerContactDraft
): Promise<OwnerContactSave> {
  const invalid = ownerContactError(owner, draft);
  if (invalid) {
    return { error: invalid, ok: false };
  }
  try {
    if (await update(owner.id, ownerContactPatch(draft))) {
      return { ok: true };
    }
  } catch (error) {
    if (error instanceof ClinicalValidationError) {
      return { error: error.message, ok: false };
    }
  }
  return {
    error: "Les coordonnées n'ont pas pu être enregistrées. Réessayez.",
    ok: false,
  };
}
