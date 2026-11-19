// Preuve d'une famille sans effet a l'execution : chaque fichier modifie, compile par esbuild (comme Vite) avant et
// apres, donne le meme JavaScript (espaces et commentaires retires). Usage : node js-identique.mjs [ref=HEAD]
import { execFileSync } from "node:child_process";
import { transformSync } from "/home/parallels/work/baitari/node_modules/esbuild/lib/main.js";
const ref = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "HEAD";
const files = execFileSync("git", ["diff", "--name-only", ref], { encoding: "utf8" }).split("\n").filter((f) => /\.(m?[jt]sx?)$/.test(f));
// Option --texte-jsx : fusionne les chaines voisines ("a"," " -> "a "), seule difference qu'introduit le formateur quand il
// sort un espace de fin de texte JSX en {" "} ; le texte affiche est le meme.
const mergeText = process.argv.includes("--texte-jsx");
// Option --syntaxe : esbuild simplifie aussi la syntaxe (accolades d'un bloc a une instruction, etc.) des deux cotes ;
// deux sources equivalentes donnent alors le meme code.
const syntax = process.argv.includes("--syntaxe");
const merge = (code) => { let prev; do { prev = code; code = code.replace(/"((?:[^"\\]|\\.)*)","((?:[^"\\]|\\.)*)"/g, '"$1$2"'); } while (code !== prev); return code; };
const js = (source, file) => (mergeText ? merge : (c) => c)(rawJs(source, file));
const rawJs = (source, file) => transformSync(source, { loader: file.endsWith("x") ? "tsx" : file.match(/\.m?js$/) ? "js" : "ts", jsx: "automatic", minifyWhitespace: true, minifySyntax: syntax, legalComments: "none", format: "esm", target: "es2022" }).code;
let same = 0;
const differ = [];
for (const file of files) {
  let before = null;
  try { before = execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8", maxBuffer: 1 << 26 }); } catch {}
  const after = execFileSync("cat", [file], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (before !== null && js(before, file) === js(after, file)) same++; else differ.push(file);
}
console.log(`${files.length} fichiers JS/TS modifies : ${same} identiques a la compilation, ${differ.length} differents`);
for (const f of differ) console.log("DIFFERENT :", f);
