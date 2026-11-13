// Execute dans la page : releve typographique de tout texte visible.
() => {
  const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; const m = b.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(/[, /]+/).map(Number); if (p.length < 4 || p[3] >= 0.99) return b; } } return "rgb(255, 255, 255)"; };
  while (w.nextNode()) {
    const t = w.currentNode.textContent.trim(); const el = w.currentNode.parentElement;
    if (!t || !el || seen.has(el)) continue; seen.add(el);
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.opacity === "0") continue;
    out.push({ t: t.slice(0, 40), tag: el.tagName.toLowerCase(), cls: (el.className?.baseVal ?? el.className ?? "").toString().slice(0, 80), zone: el.closest("[data-slot='sidebar'],.app-sidebar") ? "sidebar" : el.closest("header") ? "entete" : el.closest("table") ? "table" : el.closest("button,[role=button],[role=tab]") ? "controle" : "contenu",
      fam: cs.fontFamily.split(",")[0].replace(/"/g, ""), size: cs.fontSize, weight: cs.fontWeight, lh: cs.lineHeight, ls: cs.letterSpacing, color: cs.color, bg: bgOf(el), num: cs.fontVariantNumeric, feat: cs.fontFeatureSettings, opsz: cs.fontOpticalSizing, vari: cs.fontVariationSettings, tr: cs.textRendering, wrap: cs.textWrap ?? "", x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), digits: /\d/.test(t) });
  }
  return out;
}
