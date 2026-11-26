import postcss from "postcss";

/**
 * The text of a JavaScript or TypeScript source without its line layout. A formatter may split a call, an argument list,
 * a JSX element or a member chain over several lines, or add a trailing comma. `codeText` undoes only that, on the
 * source and on the expected snippet alike: every run of white space becomes one space; the space just inside ( [ { and
 * just before ) ] } , ; goes; a line break before a member access (".x") goes; a trailing comma goes. Spaces anywhere
 * else stay, so a space that carries meaning (in a string, around an operator, between two selectors) is kept.
 * For JS only: CSS is read with postcss and `selectorText`.
 */
export function codeText(source: string): string {
  return source
    .replace(/\n\s*(?=\.[\w$])/g, "")
    .replace(/\s+/g, " ")
    .replace(/([([{]) /g, "$1")
    .replace(/ ([)\]},;])/g, "$1")
    .replace(/,([)\]}])/g, "$1");
}

/**
 * A CSS selector list without its layout, written the way the stylesheets write it on one line: single spaces, ", "
 * between selectors, " > " around the child combinator, nothing inside parentheses and brackets.
 */
export function selectorText(selector: string): string {
  return selector
    .replace(/\s+/g, " ")
    .replace(/ ?, ?/g, ", ")
    .replace(/ ?> ?/g, " > ")
    .replace(/([([]) | ([)\]])/g, "$1$2")
    .trim();
}

/** Every `className="…"` of a source, each as its set of classes: the order of the classes is not the test's business. */
export function classNames(source: string): Set<string>[] {
  return [...source.matchAll(/className="([^"]*)"/g)].map(
    (match) => new Set(match[1].split(/\s+/).filter(Boolean))
  );
}

/** True when one `className="…"` of the source holds exactly these classes, in any order. */
export function hasClassName(source: string, classes: string): boolean {
  const wanted = classes.split(/\s+/).filter(Boolean);
  return classNames(source).some(
    (found) =>
      found.size === wanted.length && wanted.every((name) => found.has(name))
  );
}

/** The opening tags of rendered HTML that carry an attribute, whatever the order of their attributes. */
export function tagsWith(html: string, attribute: string): string[] {
  return [...html.matchAll(/<[a-z][^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => tag.includes(attribute));
}

/**
 * A stylesheet without its layout, for the tests that read rules as text: each selector goes through `selectorText` and
 * each value loses the line breaks a formatter puts in a long `color-mix(...)` or shadow list (runs of white space
 * become one space, none just inside parentheses, no trailing comma). Properties, values and their order are untouched.
 */
export function cssText(source: string): string {
  const root = postcss.parse(source);
  root.walkRules((rule) => {
    rule.selector = selectorText(rule.selector);
  });
  root.walkDecls((decl) => {
    decl.value = decl.value
      .replace(/\s+/g, " ")
      .replace(/\( /g, "(")
      .replace(/ \)/g, ")")
      .replace(/,\)/g, ")")
      .trim();
  });
  return root.toString();
}
