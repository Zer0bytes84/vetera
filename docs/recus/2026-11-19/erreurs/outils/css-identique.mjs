// Preuve pour le CSS et le JSON : chaque fichier modifie, minifie par lightningcss (CSS) ou relu par JSON.parse, est
// identique avant et apres. Usage : node css-identique.mjs [ref=HEAD]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { transform } from "/home/parallels/work/baitari/node_modules/lightningcss/node/index.mjs";
import ts from "/home/parallels/work/baitari/node_modules/typescript/lib/typescript.js";
const ref = process.argv[2] ?? "HEAD";
const files = execFileSync("git", ["diff", "--name-only", ref], { encoding: "utf8" }).split("\n").filter((f) => /\.(css|json|jsonc)$/.test(f));
const css = (code, file) => transform({ filename: file, code: Buffer.from(code), minify: true, errorRecovery: true }).code.toString();
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1");
const norm = (code, file) => (file.endsWith(".css") ? css(code, file) : JSON.stringify(ts.parseConfigFileTextToJson(file, code).config));
let same = 0;
for (const file of files) {
  const before = execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (norm(before, file) === norm(readFileSync(file, "utf8"), file)) same++; else console.log("DIFFERENT :", file);
}
console.log(`${files.length} fichiers CSS/JSON modifies : ${same} identiques`);
