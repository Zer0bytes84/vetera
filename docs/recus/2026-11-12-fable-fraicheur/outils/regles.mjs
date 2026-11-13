// usage: node regles.mjs <ecran> <selecteur> <prop[,prop]> [url]  -> regles CSS qui posent ces proprietes sur le 1er element
import { launch, open, AVANT } from "./lib/setup.mjs"; import { ECRANS } from "./lib/parcours.mjs";
const S = new URL(".", import.meta.url).pathname; const [ecran, sel, props, url = AVANT] = process.argv.slice(2);
const b = await launch(); const p = await open(b, { base: S + "base.json" }); await p.go(url, "#/dashboard"); await ECRANS.find(([n]) => n === ecran)[1](p);
const c = await p.context().newCDPSession(p); await c.send("DOM.enable"); await c.send("CSS.enable");
const { root } = await c.send("DOM.getDocument"); 
for (const one of sel.split(";;")) { const { nodeId } = await c.send("DOM.querySelector", { nodeId: root.nodeId, selector: one }); if (!nodeId) { console.log("introuvable", one); continue; }
  const m = await c.send("CSS.getMatchedStylesForNode", { nodeId }); console.log("##", one);
  const show = (rules, tag) => { for (const r of rules) for (const d of r.rule.style.cssProperties) if (props.split(",").includes(d.name) && d.text) console.log(`  ${tag} ${d.name}: ${d.value}${d.important ? " !important" : ""}   <- ${r.rule.selectorList.text.slice(0, 150)}`); };
  show(m.matchedCSSRules, "direct"); (m.inherited || []).forEach((i, n) => show(i.matchedCSSRules, `herite+${n + 1}`)); }
await b.close();
