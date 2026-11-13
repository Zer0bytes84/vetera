() => {
  const sig = (el) => el.tagName.toLowerCase() + (el.getAttribute("data-slot") ? `[${el.getAttribute("data-slot")}]` : "") + "." + (el.className?.baseVal ?? el.className ?? "").toString().trim().split(/\s+/).slice(0, 4).join(".").slice(0, 70);
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const all = [...document.querySelectorAll("body *")].filter(vis);
  const px = (v) => parseFloat(v) || 0;
  // A. sources de tracking et victimes par heritage (taille differente de la source)
  const track = {};
  for (const el of all) { const cs = getComputedStyle(el), ps = getComputedStyle(el.parentElement); if (cs.letterSpacing !== "normal" && cs.letterSpacing !== ps.letterSpacing) {
    const fs = px(cs.fontSize); let victims = 0; const sizes = new Set();
    for (const d of el.querySelectorAll("*")) { const ds = getComputedStyle(d); if (ds.letterSpacing === cs.letterSpacing && ds.fontSize !== cs.fontSize && [...d.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) { victims++; sizes.add(ds.fontSize); } }
    const k = `${sig(el)} | ${cs.fontSize} ${cs.letterSpacing} (${(px(cs.letterSpacing) / fs).toFixed(3)}em)`; track[k] = track[k] || { n: 0, victims: 0, sizes: new Set() }; track[k].n++; track[k].victims += victims; sizes.forEach((s) => track[k].sizes.add(s)); } }
  for (const k in track) track[k].sizes = [...track[k].sizes].join(",");
  // B. icones
  const icons = {}; const frac = [];
  for (const el of all) if (el.tagName === "svg") { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); const k = `${Math.round(r.width * 100) / 100}x${Math.round(r.height * 100) / 100} sw=${cs.strokeWidth} ${el.getAttribute("data-slot") === "icon" || el.getAttribute("aria-hidden") === "true" && el.getAttribute("viewBox") === "0 0 20 20" || el.getAttribute("viewBox") === "0 0 24 24" && el.getAttribute("fill") === "currentColor" ? "hero?" : ""} vb=${el.getAttribute("viewBox")}`; icons[k] = (icons[k] || 0) + 1;
    if (Math.abs(r.x - Math.round(r.x)) > 0.05 || Math.abs(r.y - Math.round(r.y)) > 0.05) frac.push(`${sig(el.parentElement)} @${r.x.toFixed(2)},${r.y.toFixed(2)} ${r.width}x${r.height}`); }
  // C. rayons emboites
  const radii = [];
  for (const el of all) { const cs = getComputedStyle(el); const r = px(cs.borderTopLeftRadius); if (!r || r > 60) continue; const R = el.getBoundingClientRect();
    for (const c of el.children) { if (!vis(c)) continue; const s = getComputedStyle(c); const r2 = px(s.borderTopLeftRadius); if (!r2 || r2 > 60) continue; const C = c.getBoundingClientRect(); const gap = Math.min(C.left - R.left, C.top - R.top); if (gap <= 0 || gap > 12 || Math.abs(C.left - R.left - (C.top - R.top)) > 1) continue; if (Math.abs(r - (r2 + gap)) > 1) radii.push(`${sig(el)} r=${r} > ${sig(c)} r=${r2} ecart=${gap.toFixed(1)} (attendu ${r2 + gap})`); } }
  // D. transitions des controles
  const trans = {};
  for (const el of all) if (el.matches("button,a,[role=tab],[role=button],[role=menuitem],input,select,textarea,[data-list-row],tr")) { const cs = getComputedStyle(el); const k = `${cs.transitionProperty.slice(0, 60)} | ${cs.transitionDuration.slice(0, 30)} | ${cs.transitionTimingFunction.slice(0, 50)}`; trans[k] = trans[k] || { n: 0, ex: sig(el) }; trans[k].n++; }
  // F. alignement vertical icone / texte voisin
  const align = [];
  for (const el of all) if (el.tagName === "svg" && el.parentElement) { const R = el.getBoundingClientRect(); const sib = [...el.parentElement.childNodes].find((n) => n !== el && (n.nodeType === 3 ? n.textContent.trim() : n.nodeType === 1 && n.tagName !== "svg" && n.textContent.trim() && vis(n) && !n.querySelector("svg"))); if (!sib) continue;
    const range = document.createRange(); range.selectNodeContents(sib); const T = range.getClientRects()[0]; if (!T) continue; if (Math.abs(T.left - R.right) > 24 && Math.abs(R.left - T.right) > 24) continue;
    const d = (R.top + R.height / 2) - (T.top + T.height / 2); if (Math.abs(d) >= 0.75) align.push(`${d.toFixed(2)}px ${sig(el.parentElement)} "${(sib.textContent || "").trim().slice(0, 24)}" icone ${R.width}x${R.height}`); }
  return { track, icons, frac: [...new Set(frac)].slice(0, 40), fracN: frac.length, radii: [...new Set(radii)], trans, align: [...new Set(align)].slice(0, 60) };
}
