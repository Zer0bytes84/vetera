// node computed.mjs : compares, element by element, every computed style of master (5198) and the branch (5199).
import { launch, newCtx, FIXED } from "./lib/setup.mjs";
import fs from "fs";
const SPEC = [["dashboard", "#/dashboard"], ["finances", "#/finances"], ["finances-analyse", "#/finances_analytics"], ["patients", "#/patients"], ["dossier-patient", "#/patient/demo_patient_05"], ["parametres", "#/parametres"], ["agenda", "#/agenda"], ["clinique", "#/clinique"]];
const b = await launch();
const dump = async (URL, STATE, mode, hash) => {
  const ctx = await newCtx(b, STATE); const page = await ctx.newPage();
  await page.clock.setFixedTime(FIXED);
  await page.addInitScript(([m]) => { localStorage.setItem("theme-config", JSON.stringify({ skin: "clean" })); localStorage.setItem("theme", m); localStorage.setItem("baitari:last-seen-version", "5.0.9"); let seed = 1234567; Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }, [mode]);
  await page.goto(URL + hash, { waitUntil: "domcontentloaded" }); await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForTimeout(6500);
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" }); await page.waitForTimeout(600);
  if (hash === "#/parametres") { await page.getByText("Apparence", { exact: true }).first().click(); await page.waitForTimeout(1500); }
  const data = await page.evaluate(() => {
    const out = {}; const seen = new Map();
    const walk = (el, path) => {
      const idx = seen.get(path) ?? 0; seen.set(path, idx + 1);
      const key = `${path}>${el.tagName}[${idx}]`;
      const cs = getComputedStyle(el); const props = {};
      for (let i = 0; i < cs.length; i++) { const n = cs[i]; props[n] = cs.getPropertyValue(n); }
      for (const pseudo of ["::before", "::after"]) { const ps = getComputedStyle(el, pseudo); if (ps.content && ps.content !== "none" && ps.content !== "normal") { const pp = {}; for (let i = 0; i < ps.length; i++) pp[ps[i]] = ps.getPropertyValue(ps[i]); out[key + pseudo] = { tag: pseudo, cls: "", props: pp }; } }
      out[key] = { tag: el.tagName, cls: el.getAttribute("class") ?? "", attrs: el.getAttributeNames().filter((a) => a !== "class" && a !== "style" && !a.startsWith("aria-") && a !== "id" && a !== "for" && a !== "href" && a !== "d" && !/^data-(base-ui|radix|state)/.test(a)).sort().join(","), props };
      let k = 0; for (const c of el.children) { if (c.tagName === "STYLE" || c.tagName === "SCRIPT") continue; walk(c, key); k++; }
    };
    walk(document.documentElement, "");
    return out;
  });
  await ctx.close(); return data;
};
const report = []; let totalDiff = 0;
for (const mode of ["light", "dark"]) for (const [name, hash] of SPEC) {
  const A = await dump("http://127.0.0.1:5198/", process.argv[2], mode, hash);
  const B = await dump("http://127.0.0.1:5199/", process.argv[3], mode, hash);
  const ka = Object.keys(A), kb = new Set(Object.keys(B));
  const onlyA = ka.filter((k) => !kb.has(k)), onlyB = [...kb].filter((k) => !(k in A));
  let propDiffs = 0, elDiffs = 0, attrDiffs = 0, clsDiffs = 0; const samples = [];
  for (const k of ka) { if (!kb.has(k)) continue; const a = A[k], c = B[k]; let d = 0;
    for (const p of new Set([...Object.keys(a.props), ...Object.keys(c.props)])) if (a.props[p] !== c.props[p]) { d++; if (samples.length < 6) samples.push(`${k.split(">").slice(-3).join(">")} ${p}: ${a.props[p]} -> ${c.props[p]}`); }
    if (d) { propDiffs += d; elDiffs++; }
    if (a.attrs !== c.attrs) { attrDiffs++; if (samples.length < 6) samples.push(`${k.split(">").slice(-2).join(">")} attrs: [${a.attrs}] -> [${c.attrs}]`); }
    if (a.cls !== c.cls) clsDiffs++;
  }
  const line = { mode, page: name, elements: ka.length, onlyMaster: onlyA.length, onlyBranch: onlyB.length, elementsWithStyleDiff: elDiffs, styleDiffs: propDiffs, attrDiffs, classDiffs: clsDiffs, samples, onlyMasterSamples: onlyA.slice(0, 4).map((k) => k.split(">").slice(-3).join(">") + " " + A[k].cls.slice(0, 50)) };
  report.push(line); totalDiff += propDiffs + onlyA.length + onlyB.length + attrDiffs + clsDiffs;
  console.log(JSON.stringify(line));
  fs.writeFileSync(process.argv[4], JSON.stringify(report, null, 1));
}
console.log("TOTAL différences:", totalDiff); await b.close();
