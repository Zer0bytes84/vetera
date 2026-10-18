import { useMemo } from "react";
import { useManagedTemplates } from "./use-managed-documents";
import {
  validateTemplate,
  type ClinicalDocumentTemplate,
} from "../lib/document-templates";
export function useDocumentTemplates() {
  const store = useManagedTemplates();
  const templates = useMemo(() => {
    return store.templates.filter((template) => {
      if (template.kind === "referral" || !template.active) return false;
      try { validateTemplate(template); return true; }
      catch { return false; } // Extended variables use the managed generation flow.
    }) as ClinicalDocumentTemplate[];
  }, [store.templates]);
  return { ...store, templates };
}
