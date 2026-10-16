import { useMemo } from "react";
import { useSQLite } from "@/hooks/useSQLite";
import {
  DEFAULT_DOCUMENT_TEMPLATES,
  type ClinicalDocumentTemplate,
} from "../lib/document-templates";
export function useDocumentTemplates() {
  const store = useSQLite<ClinicalDocumentTemplate>("document_templates");
  const templates = useMemo(() => {
    const map = new Map(
      DEFAULT_DOCUMENT_TEMPLATES.map((template) => [template.id, template])
    );
    store.data.forEach((template) => map.set(template.id, template));
    return [...map.values()];
  }, [store.data]);
  return { ...store, templates };
}
