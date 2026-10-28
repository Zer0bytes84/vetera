// Le turbo écrit parfois la température en toutes lettres (« 38.5 degrés
// Celsius »). La note attend « °C ». On ne touche qu'à ce motif : les nombres,
// les posologies et le reste du texte sortent inchangés.

const MOTIF = /\bdegr[éeè]s?\s+(?:Celsius|centigrades?|C)\b/iu;
const APRES_NOMBRE = /(\d)\s*degr[éeè]s?\s+(?:Celsius|centigrades?|C)\b/giu;
const SEUL = /\bdegr[éeè]s?\s+(?:Celsius|centigrades?|C)\b/giu;

/**
 * Remplace « degrés Celsius » / « degrés centigrades » / « degrés C » par « °C ».
 * Un espace est conservé avant le symbole quand un nombre précède, pour écrire
 * « 38.5 °C » comme la référence ; sinon le symbole prend la place du mot.
 */
export function normalizeTemperatureSymbols(text: string) {
  if (!text || !MOTIF.test(text)) return text;
  return text.replace(APRES_NOMBRE, "$1 °C").replace(SEUL, "°C");
}
