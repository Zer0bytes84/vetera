import type { PatientDocument } from "@/modules/documents/document-domain";
import type { ConsultationSoap, Note } from "@/types/db";
import { isSoapReviewed, soapSourceKey } from "./soap-review";
import { SOAP_SECTIONS } from "./soap-schema";

const EMBEDDING_HEX = /^[a-fA-F0-9]{6144}$/;
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
  sections: SearchSection[];
  sourceTypes: SourceType[];
}
export interface SearchChunk {
  chunkIndex: number;
  documentType: DocumentType;
  patientId: string;
  patientName?: string;
  section: SearchSection;
  sourceId: string;
  sourceKey: string;
  sourceType: SourceType;
  text: string;
}
export function assertSearchScope(scope: SearchScope) {
  if (
    !(
      scope.patientId.trim() &&
      scope.sourceTypes.length &&
      scope.sections.length
    ) ||
    scope.sourceTypes.some(
      (type) =>
        ![
          "soap",
          "document",
          "protocol",
          "patient",
          "consultation",
          "product",
        ].includes(type)
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
        ].includes(section)
    )
  ) {
    throw new Error("Choisissez un patient, une source et une rubrique.");
  }
}
// One semantic unit per SOAP section, without character-based subdivision.
export function soapSearchChunks(note: ConsultationSoap): SearchChunk[] {
  if (!(note.patientId && isSoapReviewed(note))) {
    throw new Error(
      "Seules les notes relues et validées peuvent être recherchées."
    );
  }
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
    })
  );
}
export function documentSearchChunks(
  note: Note,
  plainText: string,
  documentType: Exclude<DocumentType, "consultation"> = "document"
): SearchChunk[] {
  let review: { reviewedAt?: string } | undefined;
  try {
    // A generated document, or a note kept without a visit: both validated.
    const tags = JSON.parse(note.tags ?? "{}");
    review = tags.clinicalDocument ?? tags.offVisitNote;
  } catch {
    /* Unreviewed source. */
  }
  if (
    !note.patientId ||
    typeof review?.reviewedAt !== "string" ||
    !Number.isFinite(Date.parse(review.reviewedAt))
  ) {
    throw new Error(
      "Le document doit être lié au patient et validé avant son indexation."
    );
  }
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

/** Managed documents are read directly, without copying them into legacy notes. */
export function managedDocumentSearchChunks(
  document: Pick<
    PatientDocument,
    | "id"
    | "patientId"
    | "patientName"
    | "kind"
    | "title"
    | "content"
    | "status"
    | "attachment"
    | "updatedAt"
  >
): SearchChunk[] {
  if (!document.patientId || document.status !== "finalise") {
    return [];
  }
  if (document.attachment && document.attachment.textState !== "extractible") {
    return [];
  }
  const pages = document.attachment?.pages;
  const text = pages
    ? pages.map((page) => `Page ${page.page}\n${page.text}`).join("\n\n")
    : document.content;
  if (!text.trim()) {
    return [];
  }
  return [
    {
      patientId: document.patientId,
      patientName: document.patientName,
      sourceId: `patient-document:${document.id}`,
      sourceType: "document",
      documentType: ["prescription", "certificate", "report"].includes(
        document.kind
      )
        ? (document.kind as "prescription" | "certificate" | "report")
        : "document",
      section: "document",
      chunkIndex: 0,
      text,
      sourceKey: JSON.stringify([document.updatedAt, document.status, text]),
    },
  ];
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
  if (!patient.id) {
    return [];
  }
  const parts: string[] = [];
  const speciesBreed = [patient.species, patient.breed]
    .filter(Boolean)
    .join(" · ");
  parts.push(`Patient : ${patient.name} (${speciesBreed})`);
  const chip = patient.chipNumber || patient.chip_number;
  if (chip) {
    parts.push(`Identification / Puce : ${chip}`);
  }
  const allergies = patient.allergies;
  if (allergies?.trim()) {
    parts.push(`Allergies : ${allergies.trim()}`);
  }
  const chronic = patient.chronicConditions || patient.chronic_conditions;
  if (chronic?.trim()) {
    parts.push(`Affections chroniques : ${chronic.trim()}`);
  }
  const notes = patient.generalNotes || patient.general_notes;
  if (notes?.trim()) {
    parts.push(`Notes médicales : ${notes.trim()}`);
  }

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
      sourceKey: JSON.stringify([
        patient.name,
        chip,
        allergies,
        chronic,
        notes,
      ]),
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
  patientName?: string
): SearchChunk[] {
  const patientId = appointment.patientId || appointment.patient_id;
  if (!(appointment.id && patientId)) {
    return [];
  }

  const parts: string[] = [];
  if (appointment.type || appointment.title) {
    parts.push(
      `Consultation ${appointment.type || ""} : ${appointment.title || ""}`.trim()
    );
  }
  if (appointment.reason?.trim()) {
    parts.push(`Motif : ${appointment.reason.trim()}`);
  }
  if (appointment.diagnosis?.trim()) {
    parts.push(`Diagnostic : ${appointment.diagnosis.trim()}`);
  }
  if (appointment.treatment?.trim()) {
    parts.push(`Traitement : ${appointment.treatment.trim()}`);
  }
  if (appointment.notes?.trim()) {
    parts.push(`Notes d'examen : ${appointment.notes.trim()}`);
  }

  const text = parts.join(" — ");
  if (!text.trim()) {
    return [];
  }

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
  if (!(product.id && product.name)) {
    return [];
  }
  const sub = product.subCategory || product.sub_category;
  const cat = [product.category, sub].filter(Boolean).join(" / ");
  const parts: string[] = [`Produit : ${product.name}`];
  if (cat) {
    parts.push(`Catégorie : ${cat}`);
  }
  if (product.unit) {
    parts.push(`Unité : ${product.unit}`);
  }
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
      sourceKey: JSON.stringify([
        product.name,
        cat,
        product.unit,
        product.quantity,
      ]),
    },
  ];
}
export function normalizedEmbedding(vector: number[]) {
  if (
    vector.length !== 768 ||
    vector.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("L’extrait n’a pas pu être préparé pour la recherche.");
  }
  const norm = Math.hypot(...vector);
  if (!norm) {
    throw new Error("L’extrait de recherche est vide.");
  }
  return vector.map((value) => value / norm);
}
export function embeddingToHex(vector: number[]) {
  const buffer = new ArrayBuffer(3072),
    view = new DataView(buffer);
  normalizedEmbedding(vector).forEach((value, index) => {
    view.setFloat32(index * 4, value, true);
  });
  return Array.from(new Uint8Array(buffer), (value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
}
// 255 marks a character that is not a hexadecimal digit.
const HEX_DIGIT = new Uint8Array(256).fill(255);
for (let digit = 0; digit < 16; digit++) {
  HEX_DIGIT["0123456789abcdef".charCodeAt(digit)] = digit;
  HEX_DIGIT["0123456789ABCDEF".charCodeAt(digit)] = digit;
}
const LITTLE_ENDIAN = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
/**
 * Le vecteur d'un extrait tel qu'il est stocké (768 float32 little-endian), décodé en binaire, sans normalisation.
 * Mêmes refus que embeddingFromHex : texte invalide, valeur non finie ou vecteur nul rendent null.
 */
export function embeddingBytesFromHex(hex: string): Float32Array | null {
  if (hex.length !== 6144) {
    return null;
  }
  const bytes = new Uint8Array(3072);
  for (let index = 0; index < 3072; index++) {
    const highCode = hex.charCodeAt(2 * index);
    const lowCode = hex.charCodeAt(2 * index + 1);
    const high = highCode < 256 ? HEX_DIGIT[highCode] : 255;
    const low = lowCode < 256 ? HEX_DIGIT[lowCode] : 255;
    if (high === 255 || low === 255) {
      return null;
    }
    bytes[index] = high * 16 + low;
  }
  const vector = LITTLE_ENDIAN
    ? new Float32Array(bytes.buffer)
    : Float32Array.from({ length: 768 }, (_, index) =>
        new DataView(bytes.buffer).getFloat32(index * 4, true)
      );
  let squares = 0;
  for (const value of vector) {
    if (!Number.isFinite(value)) {
      return null;
    }
    squares += value * value;
  }
  return squares > 0 ? vector : null;
}
/**
 * Le cosinus entre un extrait brut et une question déjà unitaire, en double précision sur des tableaux typés :
 * produit scalaire divisé par la norme de l'extrait. rankPassages normalise l'extrait deux fois avec Math.hypot ; le
 * résultat ne diffère que dans les derniers bits (écart mesuré et publié dans le bilan de la phase 1).
 */
export function passageCosine(raw: Float32Array, unitQuery: Float64Array) {
  let dot = 0;
  let squares = 0;
  for (let index = 0; index < 768; index++) {
    const value = raw[index];
    dot += value * unitQuery[index];
    squares += value * value;
  }
  return dot / Math.sqrt(squares);
}
export function embeddingFromHex(hex: string) {
  if (!EMBEDDING_HEX.test(hex)) {
    throw new Error("Un extrait de recherche est invalide.");
  }
  const bytes = Uint8Array.from({ length: hex.length / 2 }, (_, index) =>
      Number.parseInt(hex.slice(2 * index, 2 * index + 2), 16)
    ),
    view = new DataView(bytes.buffer);
  return normalizedEmbedding(
    Array.from({ length: 768 }, (_, index) => view.getFloat32(index * 4, true))
  );
}

import {
  matchesExactSearchTerms,
  matchesNumericConstraints,
  matchesSearchTerms,
} from "./veterinary-lexicon";

export function rankPatientChunks<T extends SearchChunk & { vector: number[] }>(
  rows: T[],
  query: number[],
  scope: SearchScope,
  limit = 5,
  minimum = MIN_SEARCH_SCORE,
  queryText = ""
) {
  assertSearchScope(scope);
  if (!Number.isFinite(minimum) || minimum < MIN_SEARCH_SCORE || minimum > 1) {
    throw new Error("Le seuil de recherche est invalide.");
  }
  const unit = normalizedEmbedding(query);
  return (
    rows
      .filter(
        (row) =>
          row.patientId === scope.patientId &&
          scope.sourceTypes.includes(row.sourceType) &&
          scope.sections.includes(row.section) &&
          matchesNumericConstraints(queryText, row.text)
      )
      .map((row) => ({
        ...row,
        score: normalizedEmbedding(row.vector).reduce(
          (sum, value, i) => sum + value * unit[i],
          0
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
          (row.match === "text" &&
            (matchesExactSearchTerms(queryText, row.text) ||
              row.score >= MIN_LEXICAL_FLOOR_SCORE))
      )
      .sort(
        (a, b) =>
          Number(matchesExactSearchTerms(queryText, b.text)) -
            Number(matchesExactSearchTerms(queryText, a.text)) ||
          Number(b.match === "text") - Number(a.match === "text") ||
          b.score - a.score ||
          a.sourceId.localeCompare(b.sourceId) ||
          a.chunkIndex - b.chunkIndex
      )
      .slice(0, Math.max(1, Math.min(20, limit)))
  );
}
