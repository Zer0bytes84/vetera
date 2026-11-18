// Compare les styles calcules de la ligne de telephone et du bouton WhatsApp dans le bloc Proprietaire de la fiche.
import { launch, open } from "./banc.mjs";
const PROPS = ["display", "height", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderRadius", "backgroundColor", "boxShadow", "color", "fontFamily", "fontSize", "fontWeight", "lineHeight", "gap", "width"];
for (const mode of ["light", "dark"]) {
  const b = await launch();
  const p = await open(b, { mode });
  await p.go("#/patients");
  await p.getByText("Zoé l’Écureuil", { exact: true }).first().click();
  await p.waitForTimeout(2500);
  const out = await p.evaluate((props) => {
    const block = document.querySelector("section.medical-owner");
    const pick = (el) => { const cs = getComputedStyle(el); return Object.fromEntries(props.map((k) => [k, cs[k]])); };
    const a = pick(block.querySelector("a[href^='tel:']")), w = pick(block.querySelector(".medical-whatsapp-link"));
    const ia = getComputedStyle(block.querySelector("a[href^='tel:'] svg")).color, iw = getComputedStyle(block.querySelector(".medical-whatsapp-link svg")).color;
    return { differences: Object.fromEntries(props.filter((k) => a[k] !== w[k]).map((k) => [k, { telephone: a[k], whatsapp: w[k] }])), icone: { telephone: ia, whatsapp: iw } };
  }, PROPS);
  console.log(mode, JSON.stringify(out));
  await b.close();
}
