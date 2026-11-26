import DOMPurify from "dompurify";

/**
 * Le HTML d'une note n'entre dans la page qu'après ce filtre. Une note peut avoir été écrite sans passer par l'éditeur
 * (restauration d'une sauvegarde, import, poste pair du réseau local, base modifiée à la main) : l'éditeur filtre à la
 * saisie, pas à la lecture.
 *
 * La liste blanche est celle de ce que l'éditeur produit réellement (StarterKit, listes de tâches, tableaux
 * redimensionnables), relevée dans un navigateur, et rien de plus : ni image, ni svg, ni math, ni cadre, ni formulaire,
 * ni script, ni balise de style, ni attribut `on…`. Un attribut n'est gardé que pour sa balise et avec une valeur du
 * format que l'éditeur écrit (un `style` seulement pour les largeurs en pixels des tableaux, une `class` seulement pour
 * le langage d'un bloc de code, un lien seulement en http, https, mailto ou tel).
 */
export const NOTE_ALLOWED_TAGS = [
  "a",
  "blockquote",
  "br",
  "code",
  "col",
  "colgroup",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "input",
  "label",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "tr",
  "u",
  "ul",
] as const;

const URI = /^(?:https?:\/\/|mailto:|tel:)\S*$/i;
const WIDTHS = /^(?:\s*(?:min-)?width\s*:\s*\d{1,5}(?:\.\d{1,3})?px\s*;?)+\s*$/;
const SPAN = /^\d{1,3}$/;

/** Pour chaque couple balise[attribut] gardé, le format de valeur accepté. Tout le reste est retiré. */
export const NOTE_ATTRIBUTE_RULES: Readonly<Record<string, RegExp>> = {
  "a[href]": URI,
  "a[target]": /^_blank$/,
  "a[rel]": /^[a-z]+(?: [a-z]+)*$/,
  "code[class]": /^language-[\w+#.-]{1,40}$/,
  "col[style]": WIDTHS,
  "input[checked]": /^(?:checked|true)?$/,
  "input[type]": /^checkbox$/,
  "li[data-checked]": /^(?:true|false)$/,
  "li[data-type]": /^taskItem$/,
  "ol[start]": /^\d{1,6}$/,
  "table[style]": WIDTHS,
  "td[colspan]": SPAN,
  "td[colwidth]": /^\d{1,5}(?:,\d{1,5})*$/,
  "td[rowspan]": SPAN,
  "th[colspan]": SPAN,
  "th[colwidth]": /^\d{1,5}(?:,\d{1,5})*$/,
  "th[rowspan]": SPAN,
  "ul[data-type]": /^taskList$/,
};

const ALLOWED_ATTR = [
  ...new Set(
    Object.keys(NOTE_ATTRIBUTE_RULES).map((key) =>
      key.slice(key.indexOf("[") + 1, -1)
    )
  ),
];

const HTML_SPECIALS = /[&<>"']/g;
const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const escapeText = (text: string) =>
  text.replace(HTML_SPECIALS, (char) => ESCAPES[char]);

const CACHE_LIMIT = 256;
const cache = new Map<string, string>();

/**
 * DOMPurify a besoin d'un DOM. Sans lui (rendu côté serveur, test sous Node), il rend le HTML tel quel, en silence :
 * ici l'absence de DOM refuse tout, le texte est rendu échappé, jamais interprété.
 */
const purifier = typeof window === "undefined" ? null : DOMPurify(window);

purifier?.addHook("uponSanitizeAttribute", (node, data) => {
  const rule =
    NOTE_ATTRIBUTE_RULES[`${node.nodeName.toLowerCase()}[${data.attrName}]`];
  if (!rule?.test(data.attrValue.trim())) {
    data.keepAttr = false;
  }
});

/** Le HTML d'une note, réduit à ce que l'éditeur sait écrire. Sûr à injecter dans la page. */
export function sanitizeNoteHtml(html: string | null | undefined): string {
  if (!html) {
    return "";
  }
  // Sans « < », aucune balise ne peut se former : le texte (et ses entités) passe tel quel.
  if (!html.includes("<")) {
    return html;
  }
  if (!purifier) {
    return escapeText(html);
  }
  const known = cache.get(html);
  if (known !== undefined) {
    return known;
  }
  const fragment = purifier.sanitize(html, {
    ALLOWED_TAGS: [...NOTE_ALLOWED_TAGS],
    ALLOWED_ATTR,
    // Les valeurs des autres attributs (start, colspan…) ne sont pas des adresses : elles échappent au contrôle d'adresse,
    // chacune est jugée par sa règle (NOTE_ATTRIBUTE_RULES). Seul href est une adresse, et sa règle est la plus étroite.
    ADD_URI_SAFE_ATTR: ALLOWED_ATTR.filter((name) => name !== "href"),
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: true,
    SANITIZE_NAMED_PROPS: true,
  });
  const box = window.document.createElement("div");
  box.appendChild(fragment);
  // Une case à cocher est la seule saisie de l'éditeur : un autre champ n'a rien à faire dans une note.
  for (const input of box.querySelectorAll("input")) {
    if (input.getAttribute("type") !== "checkbox") {
      input.remove();
    }
  }
  // Un lien qui s'ouvre ailleurs ne garde pas de lien vers cette fenêtre.
  for (const link of box.querySelectorAll("a[target]")) {
    const tokens = new Set(
      (link.getAttribute("rel") ?? "").split(" ").filter(Boolean)
    );
    tokens.add("noopener");
    tokens.add("noreferrer");
    link.setAttribute("rel", [...tokens].join(" "));
  }
  const clean = box.innerHTML;
  if (cache.size >= CACHE_LIMIT) {
    cache.delete(cache.keys().next().value as string);
  }
  cache.set(html, clean);
  return clean;
}

/** Une note dont le contenu a été filtré ; la même note (même objet) quand le filtre n'y change rien. */
export function withSanitizedContent<T extends { content?: string | null }>(
  note: T
): T {
  if (typeof note.content !== "string") {
    return note;
  }
  const clean = sanitizeNoteHtml(note.content);
  return clean === note.content ? note : { ...note, content: clean };
}
