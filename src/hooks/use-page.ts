import { useCallback, useState } from "react";

export interface PageState {
  key: string;
  page: number;
}

/** La page effective : revenue à 1 si la clé a changé depuis qu'elle a été choisie, jamais au-delà de `pageCount`. */
export function resolvePage(
  state: PageState,
  resetKey: string,
  pageCount: number
): number {
  return Math.min(state.key === resetKey ? state.page : 1, pageCount);
}

/** L'état corrigé : la clé a changé ou la page dépasse le dernier numéro, l'état est réécrit, comme le faisaient les deux effets. Sinon, le même objet. */
export function normalizePage(
  state: PageState,
  resetKey: string,
  pageCount: number
): PageState {
  const page = resolvePage(state, resetKey, pageCount);
  return page === state.page && state.key === resetKey
    ? state
    : { key: resetKey, page };
}

/** L'état suivant : la fonction reçue voit la page effective, comme elle voyait l'état déjà corrigé par l'ancien effet. */
export function advancePage(
  state: PageState,
  resetKey: string,
  pageCount: number,
  next: number | ((page: number) => number)
): PageState {
  const current = resolvePage(state, resetKey, pageCount);
  return {
    key: resetKey,
    page: typeof next === "function" ? next(current) : next,
  };
}

/**
 * Page courante d'une liste paginée, calculée au rendu.
 *
 * - elle revient à 1 quand `resetKey` change (filtres, tri, recherche) ;
 * - elle ne dépasse jamais `pageCount`.
 *
 * Remplace deux effets qui corrigeaient l'état après coup : l'état est réécrit de la même façon, sans rendu intermédiaire périmé.
 */
export function usePage(pageCount: number, resetKey = "") {
  const [state, setState] = useState<PageState>({ key: resetKey, page: 1 });
  // Correction pendant le rendu (conditionnelle, sur son propre état) : l'état est réécrit comme avant, sans rendu intermédiaire périmé.
  const corrected = normalizePage(state, resetKey, pageCount);
  if (corrected !== state) {
    setState(corrected);
  }
  const page = corrected.page;
  const setPage = useCallback(
    (next: number | ((page: number) => number)) => {
      setState((previous) => advancePage(previous, resetKey, pageCount, next));
    },
    [pageCount, resetKey]
  );
  return [page, setPage] as const;
}
