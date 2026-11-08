/**
 * A free-text field of the record, or "" when it only holds a placeholder: « Na », « N/A », « n.a. », « nd », « - », « néant »,
 * « null »… A veterinarian is never shown « Na »; an empty field reads « Non renseigné », or is not shown.
 */
const PLACEHOLDERS = new Set(["na", "n a", "n/a", "nd", "n d", "n/d", "nc", "nr", "neant", "aucun", "aucune", "null", "undefined", "none", "rien", "-", "--", "—", "–", ".", "..", "...", "…", "?", "x", "xx", "0"]);

export function meaningful(value?: string | null): string {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) return "";
  const key = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[.:;,]+$/g, "")
    .trim();
  return PLACEHOLDERS.has(key) || PLACEHOLDERS.has(key.replace(/\./g, "")) ? "" : text;
}
