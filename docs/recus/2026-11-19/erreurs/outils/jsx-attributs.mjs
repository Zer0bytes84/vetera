// Preuve du tri des attributs JSX : avant et apres, les attributs de chaque element sont tries a l'interieur de chaque
// segment delimite par un {...spread} (seul endroit ou l'ordre compte). Les deux formes doivent etre identiques.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import ts from "/home/parallels/work/baitari/node_modules/typescript/lib/typescript.js";
const off = process.argv.includes("--temoin");
const files = execFileSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".tsx"));
const f = ts.factory;
function sortAttrs(ctx) {
  const visit = (node) => {
    node = ts.visitEachChild(node, visit, ctx);
    if (!off && ts.isJsxAttributes(node)) {
      const segments = [[]]; const out = [];
      for (const p of node.properties) { if (ts.isJsxSpreadAttribute(p)) { segments.push(p, []); } else segments.at(-1).push(p); }
      for (const s of segments) {
        if (Array.isArray(s)) out.push(...[...s].sort((x, y) => x.name.getText?.() < y.name.getText?.() ? -1 : 1));
        else out.push(s);
      }
      return f.updateJsxAttributes(node, out);
    }
    return node;
  };
  return (sf) => ts.visitNode(sf, visit);
}
const printer = ts.createPrinter({ removeComments: true });
const norm = (code, file) => {
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return printer.printFile(ts.transform(sf, [sortAttrs]).transformed[0]).replace(/\s+/g, " ");
};
let same = 0; const diff = [];
for (const file of files) {
  const before = execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8", maxBuffer: 1 << 26 });
  (norm(before, file) === norm(readFileSync(file, "utf8"), file) ? same++ : diff.push(file));
}
console.log(`${files.length} fichiers TSX : ${same} identiques apres tri des attributs par segment, ${diff.length} differents${off ? " (temoin)" : ""}`);
for (const d of diff.slice(0, 15)) console.log("DIFFERENT :", d);
