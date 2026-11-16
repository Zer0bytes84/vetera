import { useEffect, useState } from "react";

/**
 * L'heure courante, rafraîchie à intervalle régulier (une minute par défaut).
 *
 * Un rendu ne lit pas l'horloge : il reçoit une valeur d'état que cette minuterie renouvelle. Ce qui dépend de l'heure
 * (un compteur de journées, un « prochain rendez-vous ») se met donc à jour seul, sans attendre une autre action.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
