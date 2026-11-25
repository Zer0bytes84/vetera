// Les sites d'une famille Ultracite, avec la ligne et le texte visé. Usage : node c-sites.mjs <diags.json> <règle> [racine]
import { readFileSync } from "node:fs";
const [J, RULE, ROOT = "."] = process.argv.slice(2);
const d = JSON.parse(readFileSync(J, "utf8")).diagnostics.filter((x) => x.category.endsWith(`/${RULE}`));
const cache = {};
const lines = (p) => (cache[p] ??= readFileSync(`${ROOT}/${p}`, "utf8").split("\n"));
const out = d.map((x) => {
  const { path, start, end } = x.location;
  const L = lines(path);
  const text = start.line === end.line ? L[start.line - 1].slice(start.column - 1, end.column - 1) : `${L[start.line - 1].slice(start.column - 1)} …`;
  return { path, line: start.line, text: text.trim().slice(0, 200), src: L[start.line - 1].trim().slice(0, 200) };
});
console.log(JSON.stringify(out));
