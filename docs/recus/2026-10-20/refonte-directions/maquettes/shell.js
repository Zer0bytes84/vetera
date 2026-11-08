// Shared harness: query params, icons (1px stroke), sidebar markup.
(function () {
  const params = new URLSearchParams(location.search);
  const state = params.get("state") || "reel";
  const theme = params.get("theme") || "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.state = state;

  const P = {
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    paw: '<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="6" r="1.8"/><circle cx="15.5" cy="7" r="1.8"/><circle cx="18" cy="11" r="1.8"/><path d="M8.5 17.5c0-2.5 2-5 4.5-5s4 2 4 4.2c0 1.8-1.4 2.8-3 2.3-1-.3-1.6-.3-2.6.1-1.7.6-2.9-.2-2.9-1.6z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    care: '<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/><path d="M12 10.5v5M9.5 13h5"/>',
    flow: '<rect x="3.5" y="4" width="4.5" height="16" rx="1"/><rect x="9.75" y="4" width="4.5" height="10" rx="1"/><rect x="16" y="4" width="4.5" height="13" rx="1"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    doc: '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4M9 12h6M9 15.5h6"/>',
    box: '<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9"/>',
    wallet: '<rect x="3.5" y="6" width="17" height="13.5" rx="2"/><path d="M3.5 10h17M15.5 14.5h2"/>',
    team: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.3 2.9-5 5.5-5s4.9 1.7 5.5 5"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M15.5 14.6c2.4-.3 4.5 1.2 5 4.4"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    chat: '<path d="M4.5 18.5V6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8z"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    steth: '<path d="M6 3.5v5a4 4 0 0 0 8 0v-5"/><path d="M10 12.5v2.5a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11.5" r="1.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    left: '<path d="m14.5 6-6 6 6 6"/>',
    right: '<path d="m9.5 6 6 6-6 6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    circle: '<circle cx="12" cy="12" r="7.5"/>',
    bed: '<path d="M3.5 18.5v-11M3.5 15h17v3.5M20.5 15v-3a3 3 0 0 0-3-3H11v6"/><circle cx="7.3" cy="11.5" r="1.8"/>',
    pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m9.5 8.5 5 7"/>',
    syringe: '<path d="m18 3.5 2.5 2.5M19.2 4.8l-9.6 9.6-3-3 9.6-9.6M8 13l-4.5 4.5M11.5 9.5l1.5 1.5M9 12l1.5 1.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    sidebar: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9 4.5v15"/>',
    chart: '<path d="M4 19.5h16M7 16V11M11 16V7M15 16v-6M19 16V9"/>',
  };
  const icon = (name, size = 16) => `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;

  function sidebar(opts = {}) {
    const item = (ic, label, active) => `<a class="nav-item${active ? " is-active" : ""}" href="#">${icon(ic)}<span>${label}</span></a>`;
    const quick = (ic, label) => `<a class="nav-quick" href="#">${icon(ic, 15)}<span>${label}</span></a>`;
    return `<aside class="sb">
      <div class="sb-brand"><img class="sb-mascot" src="assets/chien-base.webp" alt=""><span class="sb-name">Baitari</span><button class="sb-fold" aria-label="Replier">${icon("sidebar")}</button></div>
      <nav class="sb-nav">
        <p class="sb-group">${opts.groupWork || "Espace de travail"}</p>
        ${item("grid", "Tableau de bord", true)}${item("paw", "Patients")}${item("calendar", "Agenda")}${item("care", "Soins & hospitalisation")}${item("flow", "Flux")}${item("bell", "Rappels")}
        <p class="sb-group">${opts.groupAdmin || "Gestion du cabinet"}</p>
        ${item("doc", "Documents")}${item("box", "Produits")}${item("wallet", "Finances")}${item("team", "Équipe")}
        <p class="sb-group">Accès rapides</p>
        ${quick("calendar", "Rendez-vous")}${quick("steth", "Consultation")}${quick("search", "Patients")}${quick("care", "Soin")}
      </nav>
      <div class="sb-user"><img src="assets/zouhir-kherroubi.jpg" alt=""><span><b>Zouhir Kherroubi</b><small>Administrateur</small></span></div>
    </aside>`;
  }

  function loadBanner() {
    if (state !== "charge") return "";
    return `<div class="load-banner">Jeu de charge : les noms de la copie de test, complétés de cas extrêmes pour éprouver la mise en page. Ce ne sont pas des données de la clinique.</div>`;
  }

  window.Shell = { state, theme, icon, sidebar, loadBanner };
})();
