// Preuve de useSimplifiedLogicExpression : avant et apres, chaque fichier est ramene par l'arbre syntaxique TypeScript a
// une forme ou toute negation d'un groupe && / || est developpee (De Morgan), puis imprime. Les deux formes doivent
// etre identiques. Usage : node de-morgan.mjs [ref=HEAD]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import ts from "/home/parallels/work/baitari/node_modules/typescript/lib/typescript.js";
const ref = process.argv[2] ?? "HEAD";
const files = execFileSync("git", ["diff", "--name-only", ref], { encoding: "utf8" }).split("\n").filter((f) => /\.tsx?$/.test(f));
const K = ts.SyntaxKind;
const unwrap = (n) => (ts.isParenthesizedExpression(n) ? unwrap(n.expression) : n);
function expand(ctx) {
  const visit = (node) => {
    node = ts.visitEachChild(node, visit, ctx);
    if (ts.isPrefixUnaryExpression(node) && node.operator === K.ExclamationToken) {
      const inner = unwrap(node.operand);
      if (ts.isBinaryExpression(inner) && (inner.operatorToken.kind === K.AmpersandAmpersandToken || inner.operatorToken.kind === K.BarBarToken)) {
        const op = inner.operatorToken.kind === K.AmpersandAmpersandToken ? K.BarBarToken : K.AmpersandAmpersandToken;
        const not = (e) => visit(ts.factory.createPrefixUnaryExpression(K.ExclamationToken, ts.factory.createParenthesizedExpression(e)));
        return ts.factory.createBinaryExpression(not(inner.left), op, not(inner.right));
      }
    }
    // Les parentheses ne portent pas de sens ici une fois l'arbre construit : on les retire pour comparer.
    if (ts.isParenthesizedExpression(node)) return node.expression;
    return node;
  };
  return (sf) => ts.visitNode(sf, visit);
}
const printer = ts.createPrinter({ removeComments: true });
const norm = (code, file) => {
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = ts.transform(sf, [expand]).transformed[0];
  return printer.printFile(out).replace(/\s+/g, " ");
};
let same = 0; const diff = [];
for (const f of files) {
  const before = execFileSync("git", ["show", `${ref}:${f}`], { encoding: "utf8", maxBuffer: 1 << 26 });
  (norm(before, f) === norm(readFileSync(f, "utf8"), f) ? same++ : diff.push(f));
}
console.log(`${files.length} fichiers : ${same} identiques apres developpement de De Morgan, ${diff.length} differents`);
for (const f of diff) console.log("DIFFERENT :", f);
