// Preuve du tri des classes Tailwind : chaque chaine modifiee contient les memes classes (permutation), et la fusion
// tailwind-merge du projet (la meme configuration que cn) garde exactement les memes classes avant et apres.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import ts from "/home/parallels/work/baitari/node_modules/typescript/lib/typescript.js";
import { extendTailwindMerge } from "/home/parallels/work/baitari/node_modules/tailwind-merge/dist/bundle-mjs.mjs";
const twMerge = extendTailwindMerge({ extend: { classGroups: { "font-size": [{ t: ["12", "13", "14", "16", "18", "24"] }] } } });
const files = execFileSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" }).split("\n").filter((f) => /\.tsx?$/.test(f));
const strings = (code, file) => {
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = [];
  const visit = (n) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(n.text);
    else if (ts.isTemplateExpression(n)) { out.push(n.head.text); for (const s of n.templateSpans) out.push(s.literal.text); }
    ts.forEachChild(n, visit);
  };
  visit(sf); return out;
};
const toks = (s) => s.split(/\s+/).filter(Boolean);
let changed = 0, merged = 0; const bad = [];
for (const file of files) {
  const a = strings(execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8", maxBuffer: 1 << 26 }), file);
  const b = strings(readFileSync(file, "utf8"), file);
  if (a.length !== b.length) { bad.push(`${file} : nombre de chaines different`); continue; }
  a.forEach((x, i) => {
    if (x === b[i]) return;
    changed++;
    if ([...toks(x)].sort().join(" ") !== [...toks(b[i])].sort().join(" ")) { bad.push(`${file} : « ${x} » -> « ${b[i]} » (classes differentes)`); return; }
    const mx = toks(twMerge(x)).sort().join(" "), my = toks(twMerge(b[i])).sort().join(" ");
    if (mx !== my) bad.push(`${file} : fusion differente\n      avant ${twMerge(x)}\n      apres ${twMerge(b[i])}`);
    else if (toks(twMerge(x)).length !== toks(x).length) merged++;
  });
}
console.log(`${files.length} fichiers, ${changed} chaines reordonnees : ${changed - bad.length} sures, ${bad.length} a examiner (dont ${merged} avec un conflit resolu de la meme facon)`);
for (const x of bad) console.log("  ", x);
