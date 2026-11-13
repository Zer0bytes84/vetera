// usage: node dialogues-equipe.mjs <url> <dossier> : menu d'actions, dialogue Nouveau membre et réinitialisation, clair et sombre ; tailles des icônes
import { launch, open } from "./lib/setup.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
const sizes = (p, sel) => p.evaluate((s) => [...document.querySelectorAll(`${s} svg`)].map((e) => { const r = e.getBoundingClientRect(); return `${Math.round(r.width)}`; }).join(","), sel);
for (const mode of ["light", "dark"]) { const p = await open(b, { mode, base: S + "base.json" }); await p.go(URL_, "#/equipe"); await p.settle(2000); await p.freeze();
  await p.getByRole("button", { name: /Actions pour Dr Karim/ }).click(); await p.waitForTimeout(500);
  const menu = p.getByRole("menu"); await menu.screenshot({ path: `${OUT}/${mode}-menu-actions.png` }); console.log(mode, "menu, icônes :", await sizes(p, "[role=menu]"));
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await p.getByRole("button", { name: "Nouveau membre" }).click(); await p.waitForTimeout(700);
  await p.getByRole("dialog").screenshot({ path: `${OUT}/${mode}-dialogue-nouveau-membre.png` }); console.log(mode, "dialogue, icônes :", await sizes(p, "[role=dialog] .modal-workflow-banner"));
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  await p.getByRole("button", { name: /Actions pour Dr Karim/ }).click(); await p.waitForTimeout(400); await p.getByRole("menuitem", { name: /Réinitialiser/ }).click(); await p.waitForTimeout(700);
  await p.getByRole("alertdialog").or(p.getByRole("dialog")).first().screenshot({ path: `${OUT}/${mode}-dialogue-mot-de-passe.png` });
  console.log(p.errors.join("\n")); await p.context().close(); }
await b.close();
