import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Type d'entité sur laquelle on peut "zoomer" depuis une notification
 * ou un widget cliquable. La vue cible lit cette valeur pour scroller
 * jusqu'à l'élément et le highlight brièvement.
 */
export type FocusEntityKind =
  | "appointment"
  | "task"
  | "product"
  | "patient";

export interface FocusRequest {
  kind: FocusEntityKind;
  id: string;
  /** Token incrémental pour distinguer deux focus successifs sur la même entité. */
  nonce: number;
}

type FocusContextValue = {
  focus: FocusRequest | null;
  requestFocus: (kind: FocusEntityKind, id: string) => void;
  clearFocus: () => void;
  /**
   * Permet à une vue (Agenda, Taches, Stock, PatientDetail) de s'enregistrer
   * comme handler de focus. Une seule vue à la fois (la plus récemment
   * montée gagne). Retourne un cleanup.
   */
  registerHandler: (handler: ((req: FocusRequest) => void) | null) => void;
};

const FocusContext = createContext<FocusContextValue | null>(null);

export function FocusProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const handlerRef = useRef<((req: FocusRequest) => void) | null>(null);

  const requestFocus = useCallback((kind: FocusEntityKind, id: string) => {
    setFocus((prev) => {
      const nonce = (prev?.nonce ?? 0) + 1;
      const next: FocusRequest = { kind, id, nonce };
      // Dispatch au handler courant (si la vue cible est montée)
      queueMicrotask(() => handlerRef.current?.(next));
      return next;
    });
  }, []);

  const clearFocus = useCallback(() => setFocus(null), []);

  const registerHandler = useCallback(
    (handler: ((req: FocusRequest) => void) | null) => {
      handlerRef.current = handler;
    },
    []
  );

  const value = useMemo<FocusContextValue>(
    () => ({ focus, requestFocus, clearFocus, registerHandler }),
    [focus, requestFocus, clearFocus, registerHandler]
  );

  return <FocusContext value={value}>{children}</FocusContext>;
}

export function useFocus() {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error("useFocus must be used within a FocusProvider");
  }
  return context;
}
