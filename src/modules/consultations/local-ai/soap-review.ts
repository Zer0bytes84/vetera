import type { ConsultationSoap } from "@/types/db";
import { SOAP_SECTIONS, type LocalSoapNote } from "./soap-schema";

export function soapSourceKey(note: LocalSoapNote): string {
  return JSON.stringify(SOAP_SECTIONS.map(({ key }) => note[key]));
}

export function soapMetadata(content: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(content);
    if (value && typeof value === "object" && !Array.isArray(value))
      return value as Record<string, unknown>;
  } catch {
    /* Older notes may have no metadata. */
  }
  return {};
}

export function reviewedSoapContent(
  note: LocalSoapNote,
  content: string,
  reviewedBy: string | null
) {
  return JSON.stringify({
    ...soapMetadata(content),
    soapReview: {
      sourceKey: soapSourceKey(note),
      reviewedAt: new Date().toISOString(),
      reviewedBy,
    },
  });
}

export function isSoapReviewed(
  note: Pick<ConsultationSoap, keyof LocalSoapNote | "content" | "aiDraft">
): boolean {
  if (note.aiDraft || !SOAP_SECTIONS.some(({ key }) => note[key].trim()))
    return false;
  const review = soapMetadata(note.content).soapReview as
    | Record<string, unknown>
    | undefined;
  return (
    !!review &&
    typeof review.reviewedAt === "string" &&
    !!review.reviewedAt &&
    review.sourceKey === soapSourceKey(note)
  );
}
