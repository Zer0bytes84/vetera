/**
 * Une pièce jointe est gardée dans la base sous forme d'adresse `data:`. L'ouvrir dans une fenêtre, c'est exécuter ce
 * que le navigateur en fait : un `data:text/html` ou `data:image/svg+xml` y fait tourner du script avec les droits de
 * l'application. Seuls s'ouvrent les types que le dépôt de fichiers de l'application accepte : un PDF ou une photo.
 *
 * Le type jugé est celui de l'adresse elle-même, pas le champ `mimeType` de la ligne : les deux peuvent différer dans une
 * base restaurée ou venue d'un poste pair.
 */
export const OPENABLE_ATTACHMENT_TYPES: readonly string[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
];

const PREFIX_LIMIT = 256;
const DATA_URL_PREFIX =
  /^data:([a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*)(?:;[a-z0-9-]+=[^;,]*)*;base64,/i;

/** Le type d'une adresse `data:` en base 64 qui s'ouvre sans risque, ou null. */
export function openableAttachmentType(
  dataUrl: string | null | undefined
): string | null {
  if (typeof dataUrl !== "string") {
    return null;
  }
  const match = DATA_URL_PREFIX.exec(dataUrl.slice(0, PREFIX_LIMIT));
  const type = match?.[1].toLowerCase();
  return type && OPENABLE_ATTACHMENT_TYPES.includes(type) ? type : null;
}

/** Ouvre la pièce jointe dans une fenêtre si son type le permet. Rend false, sans rien ouvrir, sinon. */
export function openAttachment(
  dataUrl: string | null | undefined,
  open: (url: string, target: string) => unknown = (url, target) =>
    window.open(url, target)
): boolean {
  if (!openableAttachmentType(dataUrl)) {
    return false;
  }
  open(dataUrl as string, "_blank");
  return true;
}

export const ATTACHMENT_REFUSED_MESSAGE =
  "Ce fichier ne peut pas être ouvert ici : seuls les PDF et les photos s'ouvrent.";
