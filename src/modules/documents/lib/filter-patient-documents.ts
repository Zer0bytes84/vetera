import { documentLocalDay, DOCUMENT_TYPES, type PatientDocument } from "../document-domain";

export interface DocumentFilters { search: string; kind: string; from: string; to: string }
export function filterPatientDocuments(documents: PatientDocument[], filters: DocumentFilters) {
  const search = filters.search.trim().toLocaleLowerCase("fr");
  return documents.filter(document => {
    const day = documentLocalDay(document.createdAt);
    const type = document.kind === "import" ? "Pièce importée" : DOCUMENT_TYPES[document.kind];
    return (!filters.kind || document.kind === filters.kind) &&
      (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to) &&
      (!search || `${document.title} ${document.authorName} ${type}`.toLocaleLowerCase("fr").includes(search));
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
