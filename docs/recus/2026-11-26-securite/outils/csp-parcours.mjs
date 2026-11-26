// Parcours de l'application construite, servie avec la politique de sécurité de tauri.conf.json en en-tête : chaque
// page est ouverte, et toute violation de la politique (événement securitypolicyviolation) ou erreur de console est
// relevée. Des sondes vérifient que la politique est bien appliquée (eval, script inline refusés) et que ce dont
// l'application a besoin passe (WebAssembly, worker blob).
// Usage : node csp-parcours.mjs <url> <sortie.json>
import { writeFileSync } from "node:fs";
import { chromium } from "/media/psf/Home/.dev-browser/node_modules/playwright-core/index.mjs";

const [base, out] = process.argv.slice(2);
const ROUTES = [
  "dashboard",
  "patients",
  "agenda",
  "flux",
  "soins",
  "taches",
  "notes",
  "stock",
  "finances",
  "finances_analytics",
  "equipe",
  "parametres",
  "clinique",
];
const store = JSON.stringify({
  tables: {
    users: [
      {
        id: "banc-u1",
        email: "veto@banc.local",
        displayName: "Véto Banc",
        role: "vet_principal",
        status: "active",
      },
    ],
    sessions: [
      {
        id: "banc-s1",
        userId: "banc-u1",
        token: "banc",
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
    ],
    notes: [
      {
        id: "n1",
        userId: "banc-u1",
        title: "Note",
        content:
          '<p>Texte <strong>gras</strong></p><img src=x onerror="window.__pwned=1">',
        isFavorite: false,
        isPinned: false,
        patientId: null,
        tags: "[]",
        createdAt: "2026-11-26T10:00:00.000Z",
        updatedAt: "2026-11-26T10:00:00.000Z",
      },
    ],
  },
});
const browser = await chromium.launch({
  executablePath:
    "/home/parallels/.cache/ms-playwright/chromium-1255/chrome-linux-arm64/chrome",
  args: ["--no-sandbox"],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "fr-FR",
});
await ctx.addInitScript(
  ([s]) => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      window.__csp.push({
        directive: e.violatedDirective,
        blocked: String(e.blockedURI).slice(0, 120),
        source: String(e.sourceFile).split("/").slice(-2).join("/"),
        line: e.lineNumber,
        sample: e.sample,
      })
    );
    localStorage.setItem("vetera.browser-db.v1", s);
    localStorage.setItem("auth_token", "banc");
    localStorage.setItem("baitari:last-seen-version", "5.3.0");
    localStorage.setItem(
      "baitari-guided-tour-v1",
      JSON.stringify({ dismissed: true })
    );
  },
  [store]
);
const page = await ctx.newPage();
const errors = [],
  consoleCsp = [];
page.on("pageerror", (e) => errors.push("PAGEERR " + e.message.slice(0, 200)));
page.on("console", (m) => {
  const t = m.text();
  if (m.type() === "error" || /Content Security Policy|Refused to/i.test(t))
    consoleCsp.push(t.slice(0, 260));
});
page.on("worker", (w) => w.on("close", () => undefined));
await page.goto(base + "/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
const rows = [];
for (const route of ROUTES) {
  await page.evaluate((r) => {
    location.hash = "#/" + r;
  }, route);
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => ({
    text: document.body.innerText.slice(0, 80).replace(/\s+/g, " "),
    violations: window.__csp.length,
  }));
  rows.push({ route, violations: info.violations, text: info.text });
}
const probes = await page.evaluate(async () => {
  const result = {};
  // Un script chargé par la page, sous la politique : l'évaluation par le protocole de débogage la contournerait.
  await new Promise((resolve) => {
    const p = document.createElement("script");
    p.src = "/__probe.js";
    p.onload = resolve;
    p.onerror = resolve;
    document.head.appendChild(p);
  });
  result.evalBlocked = window.__probe?.eval ?? null;
  result.newFunctionBlocked = window.__probe?.fn ?? null;
  const s = document.createElement("script");
  s.textContent = "window.__inline = 1";
  document.head.appendChild(s);
  result.inlineScriptBlocked = window.__inline !== 1;
  const img = document.createElement("div");
  img.innerHTML = '<img src=x onerror="window.__handler=1">';
  document.body.appendChild(img);
  await new Promise((r) => setTimeout(r, 400));
  result.inlineHandlerBlocked = window.__handler !== 1;
  try {
    await WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
    result.wasmCompiles = true;
  } catch (e) {
    result.wasmCompiles = false;
  }
  try {
    const url = URL.createObjectURL(
      new Blob(["postMessage(1)"], { type: "text/javascript" })
    );
    const w = new Worker(url);
    result.blobWorker = await new Promise((res) => {
      w.onmessage = () => res(true);
      w.onerror = () => res(false);
      setTimeout(() => res("délai"), 1500);
    });
  } catch (e) {
    result.blobWorker = "exception " + e.message.slice(0, 60);
  }
  try {
    await fetch("http://127.0.0.1:1/x");
    result.httpFetchBlocked = false;
  } catch (e) {
    result.httpFetchBlocked = true;
  }
  try {
    const r = await fetch("data:text/plain,ok");
    result.dataFetch = (await r.text()) === "ok";
  } catch (e) {
    result.dataFetch = "bloqué (connect-src n'a pas data:)";
  }
  result.pwned = window.__pwned ?? null;
  return result;
});
const violations = await page.evaluate(() => window.__csp);
await browser.close();
const summary = {
  base,
  date: new Date().toISOString(),
  routes: rows,
  probes,
  violations,
  consoleCsp: consoleCsp.slice(0, 20),
  errors: errors.slice(0, 10),
};
writeFileSync(out, JSON.stringify(summary, null, 1));
console.log(
  JSON.stringify(
    {
      routes: rows.map((r) => r.route + ":" + r.violations),
      probes,
      nViolations: violations.length,
      nConsoleCsp: consoleCsp.length,
      errors: errors.slice(0, 5),
    },
    null,
    1
  )
);
