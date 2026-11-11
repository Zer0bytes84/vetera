import { useEffect, useRef } from "react";

/** The creations the quick actions open on a page that has its own "new" button. */
export type CreationKind = "patient" | "document" | "product" | "invoice";

const KEY = "vetera:pending-creation";
const EVENT = "vetera:create";

/**
 * Asks the page that owns a creation to open it, as its own button does. The request waits in the session, so a page that is
 * still loading picks it up when it mounts; a page already open gets the event.
 */
export function requestCreation(kind: CreationKind) {
  sessionStorage.setItem(KEY, kind);
  window.setTimeout(() => window.dispatchEvent(new Event(EVENT)), 150);
}

/** On the page that owns the creation: runs the same handler as its button when a request for `kind` is waiting. */
export function useCreationRequest(kind: CreationKind, open: () => void) {
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open ]);
  useEffect(() => {
    const run = () => {
      if (sessionStorage.getItem(KEY) !== kind) return;
      sessionStorage.removeItem(KEY);
      openRef.current();
    };
    run();
    window.addEventListener(EVENT, run);
    return () => window.removeEventListener(EVENT, run);
  }, [kind]);
}
