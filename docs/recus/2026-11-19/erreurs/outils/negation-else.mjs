// Preuve de noNegationElse : avant et apres, toute condition niee suivie d'une alternative (if/else, ternaire) est
// remise en forme positive en echangeant les branches (!a, a !== b, a != b). Les deux formes doivent etre identiques.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import ts from "/home/parallels/work/baitari/node_modules/typescript/lib/typescript.js";
const ref = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "HEAD";
const off = process.argv.includes("--temoin");
const files = execFileSync("git", ["diff", "--name-only", ref], { encoding: "utf8" }).split("\n").filter((f) => /\.tsx?$/.test(f));
const K = ts.SyntaxKind, f = ts.factory;
const unwrap = (n) => (ts.isParenthesizedExpression(n) ? unwrap(n.expression) : n);
function positive(cond) {
  const c = unwrap(cond);
  if (ts.isPrefixUnaryExpression(c) && c.operator === K.ExclamationToken) return unwrap(c.operand);
  if (ts.isBinaryExpression(c) && c.operatorToken.kind === K.ExclamationEqualsEqualsToken) return f.createBinaryExpression(c.left, K.EqualsEqualsEqualsToken, c.right);
  if (ts.isBinaryExpression(c) && c.operatorToken.kind === K.ExclamationEqualsToken) return f.createBinaryExpression(c.left, K.EqualsEqualsToken, c.right);
  return null;
}
function transformer(ctx) {
  const visit = (node) => {
    node = ts.visitEachChild(node, visit, ctx);
    // Une branche d'if a une seule instruction s'ecrit avec ou sans accolades : meme sens.
    if (ts.isIfStatement(node)) {
      const flat = (s) => (s && ts.isBlock(s) && s.statements.length === 1 ? s.statements[0] : s);
      node = f.updateIfStatement(node, node.expression, flat(node.thenStatement), flat(node.elseStatement));
    }
    if (!off && ts.isIfStatement(node) && node.elseStatement && !ts.isIfStatement(node.elseStatement)) {
      const p = positive(node.expression);
      if (p) return f.createIfStatement(p, node.elseStatement, node.thenStatement);
    }
    if (!off && ts.isConditionalExpression(node)) {
      const p = positive(node.condition);
      if (p) return f.createConditionalExpression(p, undefined, node.whenFalse, undefined, node.whenTrue);
    }
    if (ts.isParenthesizedExpression(node)) return node.expression;
    return node;
  };
  return (sf) => ts.visitNode(sf, visit);
}
const printer = ts.createPrinter({ removeComments: true });
const norm = (code, file) => {
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  return printer.printFile(ts.transform(sf, [transformer]).transformed[0]).replace(/\s+/g, " ");
};
let same = 0; const diff = [];
for (const file of files) {
  const before = execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8", maxBuffer: 1 << 26 });
  (norm(before, file) === norm(readFileSync(file, "utf8"), file) ? same++ : diff.push(file));
}
console.log(`${files.length} fichiers : ${same} identiques apres remise en forme positive, ${diff.length} differents${off ? " (temoin)" : ""}`);
for (const d of diff) console.log("DIFFERENT :", d);
