// Relève la finition de la modale ouverte : traits, ombres, rayons, fonds, en-tête, action principale, fermeture, hauteur.
export const finition = (page) => page.evaluate(() => {
  const dlg = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].filter((d) => d.getBoundingClientRect().height > 0).at(-1);
  if (!dlg) return null;
  // Toute couleur CSS (oklch, color-mix…) ramenée en RGBA par le canevas.
  const cv = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = "rgba(0,0,0,0)"; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const dark = (c) => { const [r, g, b, a = 1] = rgb(c); if (a < 0.05) return false; const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; const isDarkTheme = document.documentElement.classList.contains("dark"); return isDarkTheme ? l > 0.35 && a > 0.15 : l < 0.75 && a > 0.15; };
  const name = (el) => `${el.tagName.toLowerCase()}${el.dataset.slot ? `[${el.dataset.slot}]` : ""}${el.classList.length ? "." + [...el.classList].filter((c) => !c.includes(":") && !c.includes("[")).slice(0, 2).join(".") : ""}`;
  const out = { titre: dlg.querySelector("h2, [data-slot$=title]")?.textContent?.trim().slice(0, 60), traits: [], ombres: [], rayons: [], fonds: [] };
  const c0 = getComputedStyle(dlg); const r0 = dlg.getBoundingClientRect();
  out.feuille = { rayon: c0.borderTopLeftRadius, fond: c0.backgroundColor, ombre: c0.boxShadow !== "none", haut: Math.round(r0.top), bas: Math.round(r0.bottom), hauteur: Math.round(r0.height), ecran: innerHeight };
  out.horsEcran = r0.top < 0 || r0.bottom > innerHeight;
  for (const el of [dlg, ...dlg.querySelectorAll("*")]) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    // Le soulignement de l'onglet choisi est un état, pas un trait de bordure ni une ombre.
    if (el.matches('[role="tab"][aria-selected="true"], [role="tab"][data-selected], [role="tab"][data-active]')) continue;
    const c = getComputedStyle(el);
    for (const side of ["Top", "Right", "Bottom", "Left"]) {
      const w = parseFloat(c[`border${side}Width`]);
      const sameAsFill = rgb(c[`border${side}Color`]).join() === rgb(c.backgroundColor).join();
      if (w > 0 && !sameAsFill && c[`border${side}Style`] !== "none" && dark(c[`border${side}Color`]) && !["input", "textarea", "select"].includes(el.tagName.toLowerCase()) && !el.matches("input, textarea, [role=combobox], [role=checkbox], [role=switch], [role=radio], button[data-slot=select-trigger]")) out.traits.push(`${name(el)} ${side.toLowerCase()} ${w}px ${c[`border${side}Color`]}`);
    }
    const visibleShadow = c.boxShadow !== "none" && (c.boxShadow.match(/rgba?\([^)]*\)|oklch\([^)]*\)|#[0-9a-f]+/gi) ?? []).some((col) => rgb(col)[3] > 0.01);
    // Un filet intérieur de 1 px (« inset 0 -1px 0 ») est un trait, pas une ombre : on le juge comme un trait.
    const hairline = /^(rgba?\([^)]*\)|oklch\([^)]*\)) (0px )?-?[01]px -?[01]px 0px( 0px)? inset$/.test(c.boxShadow.trim());
    if (hairline && dark(c.boxShadow.match(/^(rgba?\([^)]*\)|oklch\([^)]*\))/)[1])) out.traits.push(`${name(el)} filet ${c.boxShadow.slice(0, 40)}`);
    if (visibleShadow && !hairline && !el.matches(":focus-visible")) out.ombres.push(`${name(el)} ${c.boxShadow.slice(0, 60)}`);
  }
  out.traits = [...new Set(out.traits)].slice(0, 12); out.ombres = [...new Set(out.ombres)].slice(0, 12);
  // L'action principale : le dernier bouton plein (ni outline, ni ghost) ; sa forme et sa place.
  const buttons = [...dlg.querySelectorAll("button")].filter((b) => b.getBoundingClientRect().width > 0);
  const inBand = [...dlg.querySelectorAll('[data-slot="modal-actions"] button')].filter((b) => b.getBoundingClientRect().width > 0 && !/outline|secondary|ghost/.test(b.dataset.variant ?? "") && b.dataset.slot !== "alert-dialog-cancel");
  const primary = inBand.at(-1) ?? buttons.filter((b) => b.dataset.variant === "default" || (!b.dataset.variant && /bg-primary|bg-foreground/.test(b.className))).at(-1) ?? buttons.filter((b) => b.type === "submit").at(-1);
  if (primary) {
    const b = primary.getBoundingClientRect(); const cs = getComputedStyle(primary);
    // À droite : aucun autre bouton d'action plus à droite sur la même ligne (la croix mise à part), dans la moitié droite.
    const sameRow = buttons.filter((o) => o !== primary && o.dataset.slot !== "modal-close" && !/fermer|close/i.test(o.getAttribute("aria-label") ?? "") && Math.abs(o.getBoundingClientRect().top - b.top) < 8);
    const band = dlg.querySelector('[data-slot="modal-band"]');
    out.action = { texte: primary.textContent.trim().slice(0, 30), pilule: parseFloat(cs.borderTopLeftRadius) >= b.height / 2 - 1, aDroite: b.left > r0.left + r0.width / 2 && !sameRow.some((o) => o.getBoundingClientRect().left > b.left), dansBande: band ? band.contains(primary) : b.top < r0.top + 120, enBas: b.bottom > r0.bottom - 120 };
  }
  const close = buttons.find((b) => /fermer|close/i.test(b.getAttribute("aria-label") ?? "")) ?? buttons.find((b) => /fermer|close|annuler/i.test(`${b.getAttribute("aria-label") ?? ""} ${b.textContent}`));
  out.fermeture = close ? { texte: (close.getAttribute("aria-label") || close.textContent).trim().slice(0, 30), visible: (() => { const b = close.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; })() } : null;
  const scrollers = [...dlg.querySelectorAll("*")].filter((e) => { const cs = getComputedStyle(e); return /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1; });
  out.defilementInterne = scrollers.length > 0;
  out.tuile = Boolean(dlg.querySelector('[data-slot="modal-band"] :is([data-slot="modal-icon"], [data-slot="alert-dialog-media"])'));
  out.focus = document.activeElement && dlg.contains(document.activeElement) ? `${document.activeElement.tagName.toLowerCase()} ${(document.activeElement.getAttribute("aria-label") || document.activeElement.getAttribute("placeholder") || document.activeElement.textContent || "").trim().slice(0, 30)}` : "hors fenêtre";
  return out;
});
