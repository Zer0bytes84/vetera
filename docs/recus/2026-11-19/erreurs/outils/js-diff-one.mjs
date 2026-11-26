// Montre la premiere difference de JavaScript compile pour un fichier, avant/apres.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { transformSync } from "/home/parallels/work/baitari/node_modules/esbuild/lib/main.js";
const [file, ref = "HEAD"] = process.argv.slice(2);
const opt = { loader: file.endsWith("x") ? "tsx" : "ts", jsx: "automatic", minifyWhitespace: true, legalComments: "none", format: "esm", target: "es2022" };
const a = transformSync(execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8" }), opt).code;
const b = transformSync(readFileSync(file, "utf8"), opt).code;
let i = 0; while (i < a.length && a[i] === b[i]) i++;
console.log("AVANT :", JSON.stringify(a.slice(Math.max(0, i - 80), i + 120)));
console.log("APRES :", JSON.stringify(b.slice(Math.max(0, i - 80), i + 120)));
