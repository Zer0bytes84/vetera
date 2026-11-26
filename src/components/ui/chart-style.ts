/**
 * La feuille de style des couleurs d'un graphique, écrite dans une balise <style>. Elle part de la configuration du
 * graphique : aujourd'hui une constante, demain peut-être une donnée. Rien n'y entre qu'un identifiant, une clé et une
 * couleur du format attendu ; le reste est laissé de côté, jamais écrit : une valeur ne peut pas fermer la règle, la
 * balise ou ouvrir une adresse.
 */
export interface ChartColorEntry {
  color?: string;
  theme?: Record<string, string>;
}

const IDENTIFIER = /^[\w-]+$/;
// Lettres, chiffres, espaces et les signes d'une couleur CSS (#, ., ,, %, /, +, *, -, parenthèses) : pas de ; { } < > \ " ' : @ !.
const COLOR = /^[\w\s#.,%/+*()-]+$/;
const ACTIVE_COLOR = /url\s*\(|expression\s*\(|image(?:-set)?\s*\(|\/\*|\*\//i;

function balanced(value: string): boolean {
  let depth = 0;
  for (const char of value) {
    if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth--;
    }
    if (depth < 0) {
      return false;
    }
  }
  return depth === 0;
}

export function isSafeChartIdentifier(value: string): boolean {
  return IDENTIFIER.test(value);
}

export function safeChartColor(color: string | undefined): string | null {
  if (
    color &&
    COLOR.test(color) &&
    !ACTIVE_COLOR.test(color) &&
    balanced(color)
  ) {
    return color;
  }
  return null;
}

/** Le CSS des couleurs d'un graphique, ou null s'il n'y en a pas (ou si l'identifiant n'est pas sûr). */
export function chartColorCss(
  id: string,
  entries: [string, ChartColorEntry][],
  themes: Readonly<Record<string, string>>
): string | null {
  if (!isSafeChartIdentifier(id)) {
    return null;
  }
  return Object.entries(themes)
    .map(
      ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${entries
  .map(([key, entry]) => {
    const color = safeChartColor(entry.theme?.[theme] ?? entry.color);
    return color && isSafeChartIdentifier(key)
      ? `  --color-${key}: ${color};`
      : null;
  })
  .join("\n")}
}
`
    )
    .join("\n");
}
