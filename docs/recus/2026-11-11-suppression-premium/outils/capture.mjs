// usage: node capture.mjs <url> <state.json> <outdir>
import { launch, newCtx, FIXED } from "./lib/setup.mjs";
import fs from "fs";
const [URL, STATE, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
const errors = [];
for (const mode of (process.env.MODES?.split(",") ?? ["light", "dark"])) {
  const ctx = await newCtx(b, STATE);
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(`${mode} PAGEERR ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`${mode} console.error ${m.text().slice(0,200)}`); });
  await page.clock.setFixedTime(FIXED);
  await page.addInitScript(([m]) => { localStorage.setItem("theme-config", JSON.stringify({ skin: "clean" })); localStorage.setItem("theme", m); localStorage.setItem("baitari:last-seen-version", "5.0.9"); let seed = 1234567; Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }, [mode]);
  const settle = async (ms = Number(process.env.SETTLE ?? 3500)) => { await page.waitForTimeout(ms); for (let i=0;i<20 && await page.getByText("Chargement du module").count();i++) await page.waitForTimeout(500); await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" }); await page.waitForTimeout(400); };
  const ONLY = process.env.ONLY?.split(","); const MODES = process.env.MODES?.split(",");
  const shot = async (name) => { if (ONLY && !ONLY.includes(name)) return; await page.screenshot({ path: `${OUT}/${mode}-${name}.png` }); };
  for (const [name, hash] of [["dashboard","#/dashboard"],["finances","#/finances"],["finances-analyse","#/finances_analytics"],["patients","#/patients"],["agenda","#/agenda"],["clinique","#/clinique"],["flux","#/flux"],["notes","#/notes"],["stock","#/stock"],["equipe","#/equipe"],["soins","#/soins"],["taches","#/taches"]]) {
    if (ONLY && !ONLY.includes(name)) continue;
    await page.goto(URL + hash, { waitUntil: "domcontentloaded" }); await page.reload({ waitUntil: "domcontentloaded" }); await settle(); await shot(name);
  }
  // dossier patient: premier patient de la liste
  await page.goto(URL + "#/patients", { waitUntil: "domcontentloaded" }); await page.reload({ waitUntil: "domcontentloaded" }); await settle();
  const row = page.locator("tbody tr").first();
  if (await row.count()) { await row.click(); await settle(); } 
  console.log(mode, "hash after click:", await page.evaluate(() => location.hash));
  await shot("dossier-patient");
  await page.goto(URL + "#/parametres", { waitUntil: "domcontentloaded" }); await page.reload({ waitUntil: "domcontentloaded" }); await settle();
  await page.getByText("Apparence", { exact: true }).first().click(); await settle(1500); await shot("parametres-apparence");
  await ctx.close();
}
fs.writeFileSync(`${OUT}/console.log`, errors.join("\n"));
console.log("errors:", errors.length); await b.close();
