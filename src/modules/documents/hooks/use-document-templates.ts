import { useMemo } from "react";
import {
  type ClinicalDocumentTemplate,
  validateTemplate,
} from "../lib/document-templates";
import { useManagedTemplates } from "./use-managed-documents";
export function useDocumentTemplates() {
  const store = useManagedTemplates();
  const templates = useMemo(() => {
    return store.templates.filter((template) => {
      if (template.kind === "referral" || !template.active) {
        return false;
      }
      try {
        validateTemplate(template);
        return true;
      } catch {
        return false;
      } // Extended variables use the managed generation flow.
    }) as ClinicalDocumentTemplate[];
  }, [store.templates]);
  return { ...store, templates };
}
