import type { ConsultationSoap, Note } from "@/types/db";
import { isSoapReviewed, soapSourceKey } from "./soap-review";
import { SOAP_SECTIONS } from "./soap-schema";
export const EMBEDDING_MODEL_KEY =
  "embeddinggemma-300m-onnx-fp32-wasm-768-sections-v2";
export const MIN_SEARCH_SCORE = 0.3;
export const MIN_LEXICAL_FLOOR_SCORE = 0.15;
export type DocumentType =
  | "consultation"
  | "prescription"
  | "certificate"
  | "report"
  | "laboratory"
  | "document"
  | "protocol"
  | "patient"
  | "product";
export type SourceType =
  | "soap"
  | "document"
  | "protocol"
  | "patient"
  | "consultation"
  | "product";
export type SearchSection =
  | "subjective"
  | "objective"
  | "assessment"
  | "plan"
  | "document"
  | "protocol"
  | "patient"
  | "consultation"
  | "product";
export interface SearchScope {
  patientId: string;
  sourceTypes: SourceType[];
  sections: SearchSection[];
}
export interface SearchChunk {
  patientId: string;
  patientName?: string;
  sourceId: string;
  sourceType: SourceType;
  documentType: DocumentType;
  section: SearchSection;
  chunkIndex: number;
  text: string;
  sourceKey: string;
}
export function assertSearchScope(scope: SearchScope) {
  if (
    !scope.patientId.trim() ||
    !scope.sourceTypes.length ||
    !scope.sections.length ||
    scope.sourceTypes.some(
      (type) =>
        ![
          "soap",
          "document",
          "protocol",
          "patient",
          "consultation",
          "product",
        ].includes(type),
    ) ||
    scope.sections.some(
      (section) =>
        ![
          ...SOAP_SECTIONS.map((item) => item.key),
          "document",
          "protocol",
          "patient",
          "consultation",
          "product",
        ].includes(section),
    )
  )
    throw new Error("Choisissez un patient, une source et une rubrique.");
}
// One semantic unit per SOAP section, without character-based subdivision.
export function soapSearchChunks(note: ConsultationSoap): SearchChunk[] {
  if (!note.patientId || !isSoapReviewed(note))
    throw new Error(
      "Seules les notes relues et validées peuvent être recherchées.",
    );
  return SOAP_SECTIONS.filter(({ key }) => note[key].trim()).map(
    ({ key }, chunkIndex) => ({
      patientId: note.patientId,
      sourceId: note.id,
      sourceType: "soap",
      documentType: "consultation",
      section: key,
      chunkIndex,
      text: note[key],
      sourceKey: soapSourceKey(note),
    }),
  );
}
export function documentSearchChunks(
  note: Note,
  plainText: string,
  documentType: Exclude<DocumentType, "consultation"> = "document",
): SearchChunk[] {
  let review: { reviewedAt?: string } | undefined;
  try {
    review = JSON.parse(note.tags ?? "{}").clinicalDocument;
  } catch {
    /* Unreviewed source. */
  }
  if (
    !note.patientId ||
    typeof review?.reviewedAt !== "string" ||
    !Number.isFinite(Date.parse(review.reviewedAt))
  )
    throw new Error(
      "Le document doit être lié au patient et validé avant son indexation.",
    );
  const type = documentType === "protocol" ? "protocol" : "document";
  return plainText.trim()
    ? [
        {
          patientId: note.patientId,
          sourceId: note.id,
          sourceType: type,
          documentType,
          section: type,
          chunkIndex: 0,
          text: plainText,
          sourceKey: JSON.stringify([note.content, note.tags]),
        },
      ]
    : [];
}

export function patientSearchChunks(patient: {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  chipNumber?: string | null;
  chip_number?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  chronic_conditions?: string | null;
  generalNotes?: string | null;
  general_notes?: string | null;
}): SearchChunk[] {
  if (!patient.id) return [];
  const parts: string[] = [];
  const speciesBreed = [patient.species, patient.breed].filter(Boolean).join(" · ");
  parts.push(`Patient : ${patient.name} (${speciesBreed})`);
  const chip = patient.chipNumber || patient.chip_number;
  if (chip) parts.push(`Identification / Puce : ${chip}`);
  const allergies = patient.allergies;
  if (allergies && allergies.trim()) parts.push(`Allergies : ${allergies.trim()}`);
  const chronic = patient.chronicConditions || patient.chronic_conditions;
  if (chronic && chronic.trim()) parts.push(`Affections chroniques : ${chronic.trim()}`);
  const notes = patient.generalNotes || patient.general_notes;
  if (notes && notes.trim()) parts.push(`Notes médicales : ${notes.trim()}`);

  const text = parts.join(" — ");
  return [
    {
      patientId: patient.id,
      patientName: patient.name,
      sourceId: patient.id,
      sourceType: "patient",
      documentType: "patient",
      section: "patient",
      chunkIndex: 0,
      text,
      sourceKey: JSON.stringify([patient.name, chip, allergies, chronic, notes]),
    },
  ];
}

export function consultationSearchChunks(
  appointment: {
    id: string;
    patientId?: string;
    patient_id?: string;
    title?: string;
    type?: string;
    reason?: string | null;
    diagnosis?: string | null;
    treatment?: string | null;
    notes?: string | null;
  },
  patientName?: string,
): SearchChunk[] {
  const patientId = appointment.patientId || appointment.patient_id;
  if (!appointment.id || !patientId) return [];

  const parts: string[] = [];
  if (appointment.type || appointment.title) {
    parts.push(`Consultation ${appointment.type || ""} : ${appointment.title || ""}`.trim());
  }
  if (appointment.reason && appointment.reason.trim()) {
    parts.push(`Motif : ${appointment.reason.trim()}`);
  }
  if (appointment.diagnosis && appointment.diagnosis.trim()) {
    parts.push(`Diagnostic : ${appointment.diagnosis.trim()}`);
  }
  if (appointment.treatment && appointment.treatment.trim()) {
    parts.push(`Traitement : ${appointment.treatment.trim()}`);
  }
  if (appointment.notes && appointment.notes.trim()) {
    parts.push(`Notes d'examen : ${appointment.notes.trim()}`);
  }

  const text = parts.join(" — ");
  if (!text.trim()) return [];

  return [
    {
      patientId,
      patientName,
      sourceId: appointment.id,
      sourceType: "consultation",
      documentType: "consultation",
      section: "consultation",
      chunkIndex: 0,
      text,
      sourceKey: JSON.stringify([
        appointment.title,
        appointment.type,
        appointment.reason,
        appointment.diagnosis,
        appointment.treatment,
        appointment.notes,
      ]),
    },
  ];
}

export function productSearchChunks(product: {
  id: string;
  name: string;
  category?: string | null;
  subCategory?: string | null;
  sub_category?: string | null;
  unit?: string | null;
  quantity?: number | null;
}): SearchChunk[] {
  if (!product.id || !product.name) return [];
  const sub = product.subCategory || product.sub_category;
  const cat = [product.category, sub].filter(Boolean).join(" / ");
  const parts: string[] = [`Produit : ${product.name}`];
  if (cat) parts.push(`Catégorie : ${cat}`);
  if (product.unit) parts.push(`Unité : ${product.unit}`);
  if (product.quantity !== undefined && product.quantity !== null) {
    parts.push(`En stock : ${product.quantity} ${product.unit || "unités"}`);
  }

  return [
    {
      patientId: "",
      patientName: "Pharmacie & Stock",
      sourceId: product.id,
      sourceType: "product",
      documentType: "product",
      section: "product",
      chunkIndex: 0,
      text: parts.join(" — "),
      sourceKey: JSON.stringify([product.name, cat, product.unit, product.quantity]),
    },
  ];
}
export function normalizedEmbedding(vector: number[]) {
  if (vector.length !== 768 || vector.some((value) => !Number.isFinite(value)))
    throw new Error("L’extrait n’a pas pu être préparé pour la recherche.");
  const norm = Math.hypot(...vector);
  if (!norm) throw new Error("L’extrait de recherche est vide.");
  return vector.map((value) => value / norm);
}
export function embeddingToHex(vector: number[]) {
  const buffer = new ArrayBuffer(3072),
    view = new DataView(buffer);
  normalizedEmbedding(vector).forEach((value, index) =>
    view.setFloat32(index * 4, value, true),
  );
  return Array.from(new Uint8Array(buffer), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}
export function embeddingFromHex(hex: string) {
  if (!/^[a-fA-F0-9]{6144}$/.test(hex))
    throw new Error("Un extrait de recherche est invalide.");
  const bytes = Uint8Array.from(hex.match(/../g)!, (value) =>
      Number.parseInt(value, 16),
    ),
    view = new DataView(bytes.buffer);
  return normalizedEmbedding(
    Array.from({ length: 768 }, (_, index) => view.getFloat32(index * 4, true)),
  );
}
export { matchesSearchTerms } from "./veterinary-lexicon";
import { matchesSearchTerms, matchesNumericConstraints, matchesExactSearchTerms } from "./veterinary-lexicon";

export function rankPatientChunks<T extends SearchChunk & { vector: number[] }>(
  rows: T[],
  query: number[],
  scope: SearchScope,
  limit = 5,
  minimum = MIN_SEARCH_SCORE,
  queryText = "",
) {
  assertSearchScope(scope);
  if (!Number.isFinite(minimum) || minimum < MIN_SEARCH_SCORE || minimum > 1)
    throw new Error("Le seuil de recherche est invalide.");
  const unit = normalizedEmbedding(query);
  return (
    rows
      .filter(
        (row) =>
          row.patientId === scope.patientId &&
          scope.sourceTypes.includes(row.sourceType) &&
          scope.sections.includes(row.section) &&
          matchesNumericConstraints(queryText, row.text),
      )
      .map((row) => ({
        ...row,
        score: normalizedEmbedding(row.vector).reduce(
          (sum, value, i) => sum + value * unit[i],
          0,
        ),
        match: matchesSearchTerms(queryText, row.text)
          ? ("text" as const)
          : ("semantic" as const),
      }))
      // Whole-section embeddings have a calibrated semantic threshold (minimum >= 0.30).
      // Exact lexical evidence remains useful even when whole-section cosine is low.
      .filter(
        (row) =>
          row.score >= minimum ||
          (row.match === "text" && (matchesExactSearchTerms(queryText, row.text) || row.score >= MIN_LEXICAL_FLOOR_SCORE)),
      )
      .sort(
        (a, b) =>
          Number(matchesExactSearchTerms(queryText, b.text)) - Number(matchesExactSearchTerms(queryText, a.text)) ||
          Number(b.match === "text") - Number(a.match === "text") ||
          b.score - a.score ||
          a.sourceId.localeCompare(b.sourceId) ||
          a.chunkIndex - b.chunkIndex,
      )
      .slice(0, Math.max(1, Math.min(20, limit)))
  );
}
