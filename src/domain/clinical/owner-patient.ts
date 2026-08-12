import type { Owner, Patient } from "@/types/db";

export type OwnerDraft = Omit<Owner, "id" | "createdAt" | "updatedAt">;
export type PatientDraft = Omit<
  Patient,
  "id" | "ownerId" | "createdAt" | "updatedAt"
>;

export type ClinicalValidationCode =
  | "OWNER_NAME_REQUIRED"
  | "OWNER_CONTACT_REQUIRED"
  | "OWNER_EMAIL_INVALID"
  | "OWNER_PHONE_INVALID"
  | "PATIENT_NAME_REQUIRED"
  | "PATIENT_SPECIES_REQUIRED"
  | "PATIENT_BIRTH_DATE_INVALID"
  | "PATIENT_BIRTH_DATE_IN_FUTURE";

export class ClinicalValidationError extends Error {
  readonly code: ClinicalValidationCode;

  constructor(code: ClinicalValidationCode, message: string) {
    super(message);
    this.name = "ClinicalValidationError";
    this.code = code;
  }
}

const trimOptional = (value?: string) => value?.trim() || undefined;

function normalizePhone(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const normalized = trimmed.replace(/[^\d+]/g, "");
  const digitCount = normalized.replace(/\D/g, "").length;
  if (digitCount < 8 || digitCount > 15) {
    throw new ClinicalValidationError(
      "OWNER_PHONE_INVALID",
      "Le numéro de téléphone doit contenir entre 8 et 15 chiffres."
    );
  }
  return normalized;
}

function normalizeEmail(value?: string): string | undefined {
  const normalized = value?.trim().toLocaleLowerCase("fr-FR");
  if (!normalized) {
    return undefined;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ClinicalValidationError(
      "OWNER_EMAIL_INVALID",
      "L'adresse email du propriétaire n'est pas valide."
    );
  }
  return normalized;
}

export function normalizeOwnerDraft(owner: OwnerDraft): OwnerDraft {
  const firstName = owner.firstName?.trim() || "";
  const lastName = owner.lastName?.trim() || "";
  const phone = normalizePhone(owner.phone);
  const email = normalizeEmail(owner.email);
  const secondaryContactPhone = normalizePhone(owner.secondaryContactPhone);

  if (!firstName && !lastName) {
    throw new ClinicalValidationError(
      "OWNER_NAME_REQUIRED",
      "Le nom ou le prénom du propriétaire est obligatoire."
    );
  }
  if (!phone && !email) {
    throw new ClinicalValidationError(
      "OWNER_CONTACT_REQUIRED",
      "Ajoutez un téléphone ou un email pour pouvoir contacter le propriétaire."
    );
  }

  return {
    ...owner,
    firstName,
    lastName,
    phone: phone ?? "",
    email,
    address: trimOptional(owner.address),
    city: trimOptional(owner.city),
    preferredContact: owner.preferredContact,
    secondaryContactName: trimOptional(owner.secondaryContactName),
    secondaryContactPhone,
    communicationNotes: trimOptional(owner.communicationNotes),
  };
}

export function normalizePatientDraft(
  patient: PatientDraft,
  today = new Date()
): PatientDraft {
  const name = patient.name?.trim();
  const species = patient.species?.trim();

  if (!name) {
    throw new ClinicalValidationError(
      "PATIENT_NAME_REQUIRED",
      "Le nom du patient est obligatoire."
    );
  }
  if (!species) {
    throw new ClinicalValidationError(
      "PATIENT_SPECIES_REQUIRED",
      "L'espèce du patient est obligatoire."
    );
  }

  const dateOfBirth = trimOptional(patient.dateOfBirth);
  if (dateOfBirth) {
    const parsed = new Date(`${dateOfBirth}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new ClinicalValidationError(
        "PATIENT_BIRTH_DATE_INVALID",
        "La date de naissance du patient n'est pas valide."
      );
    }

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    if (parsed > endOfToday) {
      throw new ClinicalValidationError(
        "PATIENT_BIRTH_DATE_IN_FUTURE",
        "La date de naissance du patient ne peut pas être dans le futur."
      );
    }
  }

  return {
    ...patient,
    name,
    species,
    breed: trimOptional(patient.breed),
    dateOfBirth,
    allergies: trimOptional(patient.allergies),
    chronicConditions: trimOptional(patient.chronicConditions),
    generalNotes: trimOptional(patient.generalNotes),
  };
}
