import { useCallback, useEffect, useRef, useState } from "react";
import { documentsService, MANAGED_DOCUMENTS_CHANGED } from "../document-service";
import type { ManagedDocumentTemplate, PatientDocument } from "../document-domain";

function useDocumentRows<T>(load: () => Promise<T[]>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef({ value: 0 });
  const refresh = useCallback(async () => {
    const request = ++generation.current.value;
    setLoading(true);
    try {
      const next = await load();
      if (request === generation.current.value) { setRows(next); setError(null); }
    } catch (failure) {
      if (request === generation.current.value) { setRows([]); setError(failure instanceof Error ? failure.message : "Les documents n’ont pas pu être chargés."); }
    } finally { if (request === generation.current.value) setLoading(false); }
  }, [load]);
  useEffect(() => {
    const tracker = generation.current;
    void refresh();
    const listener = () => { void refresh(); };
    window.addEventListener(MANAGED_DOCUMENTS_CHANGED, listener);
    return () => { tracker.value++; window.removeEventListener(MANAGED_DOCUMENTS_CHANGED, listener); };
  }, [refresh]);
  return { rows, loading, error, refresh };
}

export function useManagedTemplates() {
  const load = useCallback(() => documentsService.listTemplates(), []);
  const { rows, ...state } = useDocumentRows<ManagedDocumentTemplate>(load);
  return { templates: rows, ...state };
}

export function usePatientDocuments(patientId?: string) {
  const load = useCallback(() => documentsService.list(patientId), [patientId]);
  const { rows, ...state } = useDocumentRows<PatientDocument>(load);
  return { documents: rows, ...state };
}
