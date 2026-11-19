// Preuve par le rendu du tri des proprietes CSS : chaque regle, declarations dans l'ordre d'avant puis d'apres, est
// appliquee a un element dans Chromium ; tous les styles calcules doivent etre identiques. Usage : node css-rendu.mjs
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import postcss from "/home/parallels/work/baitari/node_modules/postcss/lib/postcss.js";
import { chromium } from "/media/psf/Home/.dev-browser/node_modules/playwright-core/index.mjs";
const files = execFileSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".css"));
const blocks = (css, file) => { const out = []; postcss.parse(css, { from: file }).walkRules((r) => out.push(r.nodes.filter((n) => n.type === "decl").map((d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""}`))); return out; };
const pairs = [];
for (const f of files) {
  const a = blocks(execFileSync("git", ["show", `HEAD:${f}`], { encoding: "utf8", maxBuffer: 1 << 26 }), f);
  const b = blocks(readFileSync(f, "utf8"), f);
  if (a.length !== b.length) { console.log("NOMBRE DE REGLES DIFFERENT :", f); continue; }
  a.forEach((x, i) => { if (x.join(";") !== b[i].join(";")) pairs.push({ f, i, before: x.join("; "), after: b[i].join("; ") }); });
}
const browser = await chromium.launch({ executablePath: "/home/parallels/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setContent("<div id=p><div id=a></div><div id=b></div></div>");
const diffs = await page.evaluate((list) => {
  const a = document.getElementById("a"), b = document.getElementById("b"), out = [];
  for (const { f, i, before, after } of list) {
    a.style.cssText = before; b.style.cssText = after;
    const ca = getComputedStyle(a), cb = getComputedStyle(b);
    const changed = [];
    for (let k = 0; k < ca.length; k++) { const p = ca[k]; if (ca.getPropertyValue(p) !== cb.getPropertyValue(p)) changed.push(p); }
    // Les proprietes personnalisees (--x) ne sont pas listees par l'iteration : on les compare explicitement.
    for (const m of before.matchAll(/(--[\w-]+)\s*:/g)) if (ca.getPropertyValue(m[1]) !== cb.getPropertyValue(m[1])) changed.push(m[1]);
    if (changed.length) out.push(`${f} regle ${i} : ${changed.slice(0, 6).join(", ")}`);
  }
  return out;
}, pairs);
console.log(`${files.length} fichiers, ${pairs.length} regles reordonnees : ${pairs.length - diffs.length} au rendu identique, ${diffs.length} differentes`);
for (const d of diffs) console.log("  ", d);
await browser.close();
