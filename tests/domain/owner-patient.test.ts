import { describe, expect, it } from "vitest";
import {
  ClinicalValidationError,
  normalizeOwnerDraft,
  normalizePatientDraft,
} from "../../src/domain/clinical/owner-patient";

describe("owner and patient clinical validation", () => {
  it("normalizes a contact before persistence", () => {
    expect(
      normalizeOwnerDraft({
        firstName: "  Amel ",
        lastName: " Benali ",
        phone: "+213 555 12 34 56",
        email: " AMEL@EXAMPLE.COM ",
        city: " Alger ",
        preferredContact: "sms",
        secondaryContactName: "  Karim Benali ",
        secondaryContactPhone: "0555 00 11 22",
        communicationNotes: "  Appeler après 17 h. ",
      })
    ).toEqual({
      firstName: "Amel",
      lastName: "Benali",
      phone: "+213555123456",
      email: "amel@example.com",
      city: "Alger",
      address: undefined,
      preferredContact: "sms",
      secondaryContactName: "Karim Benali",
      secondaryContactPhone: "0555001122",
      communicationNotes: "Appeler après 17 h.",
    });
  });

  it("requires a reachable owner", () => {
    expect(() =>
      normalizeOwnerDraft({
        firstName: "Amel",
        lastName: "Benali",
        phone: "",
      })
    ).toThrowError(
      expect.objectContaining<Partial<ClinicalValidationError>>({
        code: "OWNER_CONTACT_REQUIRED",
      })
    );
  });

  it("rejects a patient birth date in the future", () => {
    expect(() =>
      normalizePatientDraft(
        {
          name: "Nala",
          species: "Chat",
          sex: "F",
          status: "sante",
          dateOfBirth: "2026-08-02",
        },
        new Date("2026-08-01T12:00:00Z")
      )
    ).toThrowError(
      expect.objectContaining<Partial<ClinicalValidationError>>({
        code: "PATIENT_BIRTH_DATE_IN_FUTURE",
      })
    );
  });
});
