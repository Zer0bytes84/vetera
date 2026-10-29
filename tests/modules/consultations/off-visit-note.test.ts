import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildOffVisitNote, readOffVisitNote } from "@/modules/consultations/off-visit-note";
import { documentSearchChunks } from "@/modules/consultations/local-ai/embedding-index";

const input = {
  patientId: "patient-1",
  userId: "vet-1",
  kind: "call" as const,
  note: { subjective: "Appel : vomit depuis hier soir.", objective: "", assessment: "Gastrite probable.", plan: "Diète 24 h, rappeler si persiste." },
  transcript: "vomit depuis hier soir",
  origin: "dictee" as const,
  validated: true,
};

describe("note hors visite", () => {
  it("refuses anything the vet has not validated, and empty notes", () => {
    expect(() => buildOffVisitNote({ ...input, validated: false })).toThrow("validez");
    expect(() => buildOffVisitNote({ ...input, note: { subjective: " ", objective: "", assessment: "", plan: "" } })).toThrow("vide");
    expect(() => buildOffVisitNote({ ...input, kind: "visit" as never })).toThrow("nature");
    expect(() => buildOffVisitNote({ ...input, patientId: "" })).toThrow("patient");
  });

  it("is a dated note of the patient, typed and reviewed, without any visit", () => {
    const note = buildOffVisitNote(input, "2026-10-29T15:00:00.000Z");
    expect(note).toMatchObject({ patientId: "patient-1", userId: "vet-1", title: "Note hors visite · Appel du propriétaire", createdAt: "2026-10-29T15:00:00.000Z" });
    expect(note.content).toContain("Gastrite probable.");
    const meta = readOffVisitNote(note)!;
    expect(meta).toMatchObject({ kind: "call", origin: "dictee", reviewedAt: "2026-10-29T15:00:00.000Z", reviewedBy: "vet-1", transcript: "vomit depuis hier soir" });
    expect(JSON.parse(note.tags!)).not.toHaveProperty("offVisitNote.appointmentId");
    expect(JSON.parse(note.tags!)).not.toHaveProperty("clinicalDocument");
  });

  it("tells it apart from the record's other notes", () => {
    expect(readOffVisitNote({ tags: JSON.stringify({ clinicalDocument: { reviewedAt: "2026-10-01" } }) })).toBeNull();
    expect(readOffVisitNote({ tags: undefined })).toBeNull();
    expect(readOffVisitNote({ tags: "pas du json" })).toBeNull();
  });

  it("is indexed for semantic search once validated, never before", () => {
    const note = buildOffVisitNote(input);
    const [chunk] = documentSearchChunks(note, "Gastrite probable. Diète 24 h");
    expect(chunk).toMatchObject({ patientId: "patient-1", sourceId: note.id, sourceType: "document" });
    expect(() => documentSearchChunks({ ...note, tags: JSON.stringify({ offVisitNote: { kind: "call" } }) }, "texte")).toThrow("validé");
  });

  it("never creates an appointment, so Flux never shows it", () => {
    const source = readFileSync("src/modules/consultations/off-visit-note.ts", "utf8");
    expect(source).not.toMatch(/appointments|saveAppointment|consultation_soaps/);
    expect(source).toContain("INSERT INTO notes");
  });

  it("keeps recent notes within reach of the instant search", () => {
    const store = readFileSync("src/modules/consultations/local-ai/embedding-store.ts", "utf8");
    expect(store).toMatch(/FROM notes n\s+LEFT JOIN patients p ON p\.id = n\.patient_id\s+ORDER BY n\.updated_at DESC/);
  });
});
