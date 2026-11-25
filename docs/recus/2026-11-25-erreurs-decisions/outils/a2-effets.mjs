// Les modules déplacés ont-ils un effet au chargement ? Pour un module de src/ : ses instructions de premier niveau qui
// s'exécutent au chargement (appel, affectation, import de CSS ou import sans liaison). Pour un module de node_modules :
// le champ sideEffects de son paquet. Usage : node effets.mjs <racine> < liste de chemins (un par ligne)
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "/home/user/vetera/node_modules/typescript/lib/typescript.js";
const ROOT = process.argv[2];
const lines = readFileSync(0, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
// Appels sans effet hors de leur valeur : contextes React, formatteurs Intl, constructions de données.
const PURE_CALLS = /^(React\.)?(createContext|cva|memo|forwardRef|lazy|Object\.(freeze|fromEntries|entries|keys|values)|new (Set|Map|WeakMap|Intl\.\w+|RegExp)|Symbol|z\.|tv|cn|String|Number|Array\.from|Math\.|createElement|[\w.]+\.(map|flatMap|filter|reduce|concat|slice|join)\()/;
const res = {};
for (const m of [...new Set(lines)]) {
  if (m.includes("node_modules")) {
    let dir = path.dirname(m), pkg = null;
    while (dir.includes("node_modules")) { const p = path.join(dir, "package.json"); if (existsSync(p)) { const j = JSON.parse(readFileSync(p, "utf8")); if (j.name) { pkg = j; break; } } dir = path.dirname(dir); }
    const se = pkg?.sideEffects;
    res[m] = { genre: "bibliothèque", paquet: pkg?.name, effets: se === false ? "aucun (sideEffects: false)" : Array.isArray(se) ? `liste ${JSON.stringify(se).slice(0, 60)}` : "non déclaré" };
    continue;
  }
  const file = path.join(ROOT, m.split("?")[0]);
  if (!existsSync(file) || !/\.(ts|tsx|js|mjs)$/.test(file)) { res[m] = { genre: "autre", effets: m.endsWith(".css") ? "feuille CSS" : "?" }; continue; }
  const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const eff = [];
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && !st.importClause) eff.push(`import ${st.moduleSpecifier.getText(sf)}`);
    else if (ts.isExpressionStatement(st) && ts.isStringLiteral(st.expression)) continue; // directive "use client"
    else if (ts.isExpressionStatement(st)) eff.push(st.getText(sf).slice(0, 70));
    else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) {
      const init = d.initializer; if (!init) continue;
      if (ts.isCallExpression(init) || ts.isNewExpression(init) || ts.isAwaitExpression(init)) { const t = init.getText(sf); if (!PURE_CALLS.test(t)) eff.push(`${d.name.getText(sf)} = ${t.slice(0, 60)}`); }
    }
  }
  res[m] = { genre: "src", effets: eff.length ? eff : "aucun" };
}
console.log(JSON.stringify(res, null, 1));
