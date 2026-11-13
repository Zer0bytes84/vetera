// usage: node zoom.mjs <ecran> <sortie.png> <x,y,w,h> [mode] [url] [css a injecter] [dsf]
import { launch, open, AVANT } from "./lib/setup.mjs"; import { ECRANS } from "./lib/parcours.mjs";
const S = new URL(".", import.meta.url).pathname; const [ecran, out, clip, mode = "light", url = AVANT, css = "", dsf = "3"] = process.argv.slice(2);
const [x, y, width, height] = clip.split(",").map(Number);
const b = await launch(); const p = await open(b, { mode, dsf: Number(dsf), base: S + "base.json" }); await p.go(url, "#/dashboard");
await ECRANS.find(([n]) => n === ecran)[1](p); if (css) await p.addStyleTag({ content: css }); await p.mouse.move(700, 5); await p.freeze(); await p.waitForTimeout(400);
await p.screenshot({ path: out, clip: { x, y, width, height } }); if (p.errors.length) console.log(p.errors); await b.close();
