/**
 * Pour une valeur garantie par construction (même liste, constante, fichier
 * livré) : si la garantie casse, l’erreur nomme ce qui manque au lieu d’une
 * TypeError plus loin.
 */
export function mustExist<T>(value: T | null | undefined, missing: string): T {
  if (value === null || value === undefined) {
    throw new Error(`Valeur garantie absente : ${missing}`);
  }
  return value;
}
