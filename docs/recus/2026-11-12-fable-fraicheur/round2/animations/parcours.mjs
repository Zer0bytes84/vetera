// Les ecrans du brief, atteints comme un utilisateur (clics), a partir de la base de test.
const nav = (label) => async (p) => { await p.locator(".app-sidebar, [data-slot='sidebar']").first().getByText(label, { exact: true }).first().click(); await p.settle(2500); };
const closeTour = async (p) => { const x = p.locator("[class*='tour'] button[aria-label]").last(); if (await x.count()) { await x.click().catch(() => {}); await p.waitForTimeout(400); } };
export const ECRANS = [
  ["tableau-de-bord", async (p) => { await nav("Tableau de bord")(p); await closeTour(p); }],
  ["tableau-de-bord-tour", nav("Tableau de bord")],
  ["patients", nav("Patients")],
  ["dossier-patient", async (p) => { await nav("Patients")(p); await p.locator("tbody tr").first().click(); await p.settle(2500); }],
  ["agenda", nav("Agenda")],
  ["factures", nav("Finances")],
  ["journal", async (p) => { await nav("Finances")(p); await p.getByRole("tab", { name: /Journal/ }).or(p.getByRole("button", { name: /^Journal/ })).first().click(); await p.settle(1500); }],
  ["documents", nav("Documents")],
  ["assistant", async (p) => { await nav("Patients")(p); await p.locator("header button").filter({ has: p.locator("svg") }).nth(-2).click(); await p.settle(1500); }, async (p) => { await p.getByRole("button", { name: /Fermer l.assistant/ }).first().click(); await p.waitForTimeout(700); }],
  ["parametres", async (p) => { await p.evaluate(() => { location.hash = "#/parametres"; }); await p.settle(2500); }],
];
