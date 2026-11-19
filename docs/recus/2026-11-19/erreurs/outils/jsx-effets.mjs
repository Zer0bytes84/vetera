// Cherche, dans les fichiers modifies, des attributs JSX dont l'expression modifie un etat a l'evaluation
// (++, --, affectation) : seul cas ou l'ordre d'evaluation des attributs changerait un resultat.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import ts from "/home/parallels/work/baitari/node_modules/typescript/lib/typescript.js";
const files = execFileSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".tsx"));
const K = ts.SyntaxKind; const hits = [];
const mutates = (n) => {
  let found = false;
  const walk = (x) => {
    if (found) return;
    if (ts.isArrowFunction(x) || ts.isFunctionExpression(x)) return; // une fonction n'est pas executee a l'evaluation
    if ((ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) && (x.operator === K.PlusPlusToken || x.operator === K.MinusMinusToken)) found = true;
    if (ts.isBinaryExpression(x) && x.operatorToken.kind >= K.FirstAssignment && x.operatorToken.kind <= K.LastAssignment) found = true;
    ts.forEachChild(x, walk);
  };
  walk(n); return found;
};
for (const file of files) {
  const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (n) => {
    if (ts.isJsxAttribute(n) && n.initializer && ts.isJsxExpression(n.initializer) && n.initializer.expression && mutates(n.initializer.expression)) {
      hits.push(`${file}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1} ${n.getText().slice(0, 100)}`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
console.log(`${hits.length} attribut(s) avec effet a l'evaluation dans ${files.length} fichiers`);
for (const h of hits) console.log("  ", h);
