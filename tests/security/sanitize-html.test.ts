// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  NOTE_ALLOWED_TAGS,
  NOTE_ATTRIBUTE_RULES,
  sanitizeNoteHtml,
  withSanitizedContent,
} from "@/lib/sanitize-html";
import { NOTE_PAYLOADS } from "./note-payloads";

const ACTIVE =
  /<\s*(?:script|iframe|object|embed|svg|math|style|link|meta|base|form|button|textarea|select|template|video|audio|source|img|body|html|head)\b|\son[a-z]+\s*=|javascript:|vbscript:|data:text|expression\s*\(|url\s*\(/i;

const parse = (html: string) =>
  new DOMParser().parseFromString(html, "text/html").body;

/** Un résultat est sûr quand, relu par un vrai analyseur HTML, il ne contient que la liste blanche et des valeurs du bon format. */
function assertOnlyWhitelisted(html: string) {
  for (const element of parse(html).querySelectorAll("*")) {
    const tag = element.tagName.toLowerCase();
    expect(NOTE_ALLOWED_TAGS as readonly string[], tag).toContain(tag);
    for (const name of element.getAttributeNames()) {
      const rule = NOTE_ATTRIBUTE_RULES[`${tag}[${name}]`];
      expect(rule, `${tag}[${name}]`).toBeDefined();
      expect(
        rule.test(element.getAttribute(name)?.trim() ?? ""),
        `${tag}[${name}]`
      ).toBe(true);
    }
    if (tag === "input") {
      expect(element.getAttribute("type")).toBe("checkbox");
    }
  }
}

/** Deux fragments HTML ont la même structure : relus par le même analyseur, ils se sérialisent pareil. */
const normalised = (html: string) => parse(html).innerHTML;

describe("sanitizeNoteHtml : les charges utiles sont neutralisées", () => {
  it.each(NOTE_PAYLOADS)("$name", ({ html }) => {
    const clean = sanitizeNoteHtml(html);
    expect(clean).not.toMatch(ACTIVE);
    assertOnlyWhitelisted(clean);
  });

  it("la batterie couvre au moins quarante cas", () => {
    expect(NOTE_PAYLOADS.length).toBeGreaterThanOrEqual(40);
  });

  it("garde le texte d'une balise retirée, pas son action", () => {
    expect(
      sanitizeNoteHtml("<p>avant</p><script>alert(1)</script><p>après</p>")
    ).toBe("<p>avant</p><p>après</p>");
    expect(
      sanitizeNoteHtml(
        '<form><button formaction="javascript:alert(1)">go</button></form>'
      )
    ).toBe("go");
  });
});

describe("sanitizeNoteHtml : ce que l'éditeur écrit n'est pas touché", () => {
  const editorOutput = readFileSync(
    "tests/fixtures/note-editor-output.txt",
    "utf8"
  ).trim();

  it("la sortie réelle de l'éditeur (titres, styles, liens, listes, tâches, code, tableau fusionné) passe à l'identique", () => {
    const clean = sanitizeNoteHtml(editorOutput);
    expect(normalised(clean)).toBe(normalised(editorOutput));
    assertOnlyWhitelisted(clean);
  });

  it("garde la largeur des colonnes d'un tableau redimensionné, en pixels seulement", () => {
    const table =
      '<table style="min-width: 145px;"><colgroup><col style="width: 120px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1" colwidth="120"><p>A</p></th></tr></tbody></table>';
    expect(normalised(sanitizeNoteHtml(table))).toBe(normalised(table));
  });

  it("garde la numérotation d'une liste, une case cochée et le langage d'un bloc de code", () => {
    const html =
      '<ol start="3"><li><p>x</p></li></ol><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked="checked"><span></span></label><div><p>fait</p></div></li></ul><pre><code class="language-js">a</code></pre>';
    expect(normalised(sanitizeNoteHtml(html))).toBe(normalised(html));
  });

  it("le texte sans balise, les entités et le vide passent tels quels", () => {
    expect(sanitizeNoteHtml("")).toBe("");
    expect(sanitizeNoteHtml(null)).toBe("");
    expect(sanitizeNoteHtml(undefined)).toBe("");
    expect(sanitizeNoteHtml("Bilan &amp; suivi 12 &lt; 15")).toBe(
      "Bilan &amp; suivi 12 &lt; 15"
    );
  });

  it("est idempotent : filtrer deux fois donne le même résultat", () => {
    for (const { html } of NOTE_PAYLOADS) {
      const once = sanitizeNoteHtml(html);
      expect(sanitizeNoteHtml(once)).toBe(once);
    }
    const clean = sanitizeNoteHtml(editorOutput);
    expect(sanitizeNoteHtml(clean)).toBe(clean);
  });
});

describe("sanitizeNoteHtml : les liens", () => {
  it("garde http, https, mailto et tel ; l'adresse reste telle quelle", () => {
    for (const href of [
      "https://exemple.dz/a?b=1&c=2",
      "http://exemple.dz",
      "mailto:a@b.dz",
      "tel:+213550000000",
    ]) {
      const clean = sanitizeNoteHtml(
        `<a href="${href.replaceAll("&", "&amp;")}">x</a>`
      );
      expect(parse(clean).querySelector("a")?.getAttribute("href")).toBe(href);
    }
  });

  it("retire l'adresse de tout autre lien et garde son texte", () => {
    for (const href of [
      "javascript:alert(1)",
      "data:text/html,x",
      "vbscript:x",
      "//evil.example",
      "/relatif",
      "#ancre",
      "file:///etc/passwd",
    ]) {
      const link = parse(
        sanitizeNoteHtml(`<a href="${href}">texte</a>`)
      ).querySelector("a");
      expect(link?.getAttribute("href"), href).toBeNull();
      expect(link?.textContent).toBe("texte");
    }
  });

  it("un lien qui s'ouvre ailleurs garde noopener et noreferrer, sans perdre les autres valeurs de rel", () => {
    const rel = (html: string) =>
      parse(sanitizeNoteHtml(html)).querySelector("a")?.getAttribute("rel");
    expect(rel('<a href="https://exemple.dz" target="_blank">x</a>')).toBe(
      "noopener noreferrer"
    );
    expect(
      rel('<a href="https://exemple.dz" target="_blank" rel="nofollow">x</a>')
    ).toBe("nofollow noopener noreferrer");
    expect(
      rel(
        '<a href="https://exemple.dz" target="_blank" rel="noopener noreferrer nofollow">x</a>'
      )
    ).toBe("noopener noreferrer nofollow");
  });
});

describe("sanitizeNoteHtml : styles et champs", () => {
  it("ne garde un style que sur un tableau ou une colonne, et seulement une largeur en pixels", () => {
    const style = (html: string, selector: string) =>
      parse(sanitizeNoteHtml(html))
        .querySelector(selector)
        ?.getAttribute("style");
    expect(
      style(
        '<table style="width: 300px;"><tbody><tr><td>x</td></tr></tbody></table>',
        "table"
      )
    ).toBe("width: 300px;");
    expect(
      style(
        '<table style="position:fixed"><tbody><tr><td>x</td></tr></tbody></table>',
        "table"
      )
    ).toBeNull();
    expect(
      style(
        '<table style="width:100%"><tbody><tr><td>x</td></tr></tbody></table>',
        "table"
      )
    ).toBeNull();
    expect(style('<p style="width: 10px">x</p>', "p")).toBeNull();
  });

  it("ne garde que la case à cocher comme champ", () => {
    const fields = (html: string) =>
      parse(sanitizeNoteHtml(html)).querySelectorAll("input").length;
    expect(fields('<input type="checkbox" checked>')).toBe(1);
    expect(fields('<input type="text">')).toBe(0);
    expect(fields("<input>")).toBe(0);
    expect(fields('<input type="file">')).toBe(0);
  });
});

describe("withSanitizedContent : la note rendue par le dépôt", () => {
  it("rend le même objet quand le contenu est déjà propre", () => {
    const note = { id: "n1", content: "<p>propre</p>" };
    expect(withSanitizedContent(note)).toBe(note);
    const plain = { id: "n2", content: "texte seul" };
    expect(withSanitizedContent(plain)).toBe(plain);
  });

  it("filtre le contenu piégé sans toucher aux autres champs", () => {
    const note = {
      id: "n1",
      title: "t",
      content: '<p>a</p><img src=x onerror="alert(1)">',
    };
    const clean = withSanitizedContent(note);
    expect(clean).toEqual({ id: "n1", title: "t", content: "<p>a</p>" });
    expect(note.content).toContain("onerror");
  });

  it("laisse une mise à jour sans contenu telle quelle", () => {
    const patch = { title: "nouveau" };
    expect(withSanitizedContent(patch)).toBe(patch);
    const empty = { content: null as string | null };
    expect(withSanitizedContent(empty)).toBe(empty);
  });
});
