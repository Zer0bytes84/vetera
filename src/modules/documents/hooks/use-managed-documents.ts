import { useCallback, useEffect, useRef, useState } from "react";
import {
  documentsService,
  MANAGED_DOCUMENTS_CHANGED,
} from "../document-service";
import type {
  ManagedDocumentTemplate,
  PatientDocument,
} from "../document-domain";
import { guard } from "@/lib/guard";

function useDocumentRows<T>(load: () => Promise<T[]>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef({ value: 0 });
  // Lire : `loading` est déjà vrai au montage et quand `load` change (voir plus bas) ; les rafraîchissements le repassent à vrai.
  const fetchRows = useCallback(async () => {
    const request = ++generation.current.value;
    await guard(
      async () => {
        const next = await load();
        if (request === generation.current.value) {
          setRows(next);
          setError(null);
        }
      },
      {
        recover: (failure) => {
          if (request === generation.current.value) {
            setRows([]);
            setError(
              failure instanceof Error
                ? failure.message
                : "Les documents n’ont pas pu être chargés."
            );
          }
        },
        cleanup: () => {
          if (request === generation.current.value) {
            setLoading(false);
          }
        },
      }
    );
  }, [load]);
  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchRows();
  }, [fetchRows]);
  // Une autre source de lignes (autre patient, autre consultation) : retour à l'état « en chargement » dès ce rendu.
  const [loadedFor, setLoadedFor] = useState(() => load);
  if (loadedFor !== load) {
    setLoadedFor(() => load);
    setLoading(true);
  }
  useEffect(() => {
    const tracker = generation.current;
    void fetchRows();
    const listener = () => {
      void refresh();
    };
    window.addEventListener(MANAGED_DOCUMENTS_CHANGED, listener);
    return () => {
      tracker.value++;
      window.removeEventListener(MANAGED_DOCUMENTS_CHANGED, listener);
    };
  }, [fetchRows, refresh]);
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
