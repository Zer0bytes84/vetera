// Measurement bench: opens the web app (Vite dev, demo data, fictional local
// account), walks every view in Clean light and dark, takes a screenshot and
// dumps the computed styles of every visible element.
// usage: node bench.mjs <outdir> [views=all] [modes=light,dark] [extraLocalStorageJSON]
import { chromium } from "/Users/zohir/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OUT = process.argv[2];
const VIEWS_ARG = process.argv[3] || "all";
const MODES = (process.argv[4] || "light,dark").split(",");
const EXTRA = process.argv[5] ? JSON.parse(process.argv[5]) : {};
const NO_CRAWL = process.env.NO_CRAWL === "1";
const BASE = process.env.BASE || "http://localhost:5173/";
const PROFILE = process.env.PROFILE_DIR || path.join(path.dirname(new URL(import.meta.url).pathname), "profile");
fs.mkdirSync(OUT, { recursive: true });

const ALL = ["dashboard", "agenda", "clinique", "flux", "patients", "patient_detail", "notes", "stock", "finances", "finances_analytics", "parametres", "equipe", "taches", "soins", "aide"];
const VIEWS = VIEWS_ARG === "all" ? ALL : VIEWS_ARG.split(",");

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: true,
  executablePath: process.env.CHROME || "/Users/zohir/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell",
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  locale: "fr-FR",
  timezoneId: "Africa/Algiers",
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
page.on("pageerror", (e) => console.error("[pageerror]", e.message));

if (process.env.FIXED_TIME) await page.clock.setFixedTime(new Date(process.env.FIXED_TIME));
await page.goto(BASE);
// Fresh profile: mark the local setup as done so the login screen shows
// (the licence step needs the activation server, out of scope here).
const fresh = await page.evaluate(() => {
  const k = "vetera.browser-db.v1";
  const db = JSON.parse(localStorage.getItem(k) || '{"tables":{}}');
  db.tables ??= {};
  db.tables.app_settings ??= [];
  if (db.tables.app_settings.some((s) => s.key === "setup_complete")) return false;
  db.tables.app_settings.push({ id: "setup_complete", key: "setup_complete", value: "true" });
  localStorage.setItem(k, JSON.stringify(db));
  return true;
});
if (fresh) await page.reload();
// Session: a local test account, generated password, never shown.
await page.waitForSelector("#email, [data-sidebar]", { timeout: 60000 });
if (await page.$("#email")) {
  const btn = page.getByRole("button", { name: /Créer un compte/ });
  if (await btn.count()) await btn.first().click();
  await page.waitForSelector("#name", { timeout: 20000 }).catch(() => {});
  if (await page.$("#name")) await page.fill("#name", "Dr Capture Test");
  await page.fill("#email", "capture@exemple.test");
  await page.fill("#password", crypto.randomBytes(12).toString("hex"));
  const confirm = await page.$("#confirmPassword, #confirm-password");
  if (confirm) await confirm.fill(await page.inputValue("#password"));
  await page.click('button[type="submit"]');
  await page.waitForSelector("[data-sidebar]", { timeout: 60000 });
  await page.waitForTimeout(2500);
}

async function setMode(mode) {
  await page.evaluate(([mode, extra]) => {
    const cfg = JSON.parse(localStorage.getItem("theme-config") || "{}");
    cfg.skin = "clean";
    Object.assign(cfg, extra.config || {});
    localStorage.setItem("theme-config", JSON.stringify(cfg));
    localStorage.setItem("theme", mode);
    for (const [k, v] of Object.entries(extra.ls || {})) localStorage.setItem(k, v);
  }, [mode, EXTRA]);
}

const patientId = await page.evaluate(() => {
  const db = JSON.parse(localStorage.getItem("vetera.browser-db.v1") || "{}");
  return db.tables?.patients?.[0]?.id ?? null;
});

const crawl = () => {
  const out = [];
  const px = (v) => (v === "normal" || v === "auto" ? v : Math.round(parseFloat(v) * 100) / 100);
  const pathOf = (el) => {
    const parts = [];
    let n = el;
    for (let i = 0; n && n.nodeType === 1 && i < 4; i++, n = n.parentElement) {
      let s = n.tagName.toLowerCase();
      const slot = n.getAttribute("data-slot");
      if (slot) s += `[data-slot=${slot}]`;
      const cls = (typeof n.className === "string" ? n.className : "").split(/\s+/).filter((c) => c && !c.includes(":")).slice(0, 3);
      if (cls.length) s += "." + cls.join(".");
      parts.unshift(s);
    }
    return parts.join(" > ");
  };
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > 4000) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) continue;
    const hasText = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
    const tag = el.tagName.toLowerCase();
    const interactive = /^(button|input|select|textarea|a)$/.test(tag) || ["button", "tab", "menuitem", "combobox", "switch", "checkbox", "option"].includes(el.getAttribute("role"));
    out.push({
      tag, path: pathOf(el), hasText, interactive,
      zone: el.closest('[data-slot=sidebar],[data-sidebar=sidebar]') ? 'sidebar' : el.closest('[role=dialog],[data-radix-popper-content-wrapper],[data-slot=popover-content]') ? 'overlay' : el.closest('header') ? 'header' : 'main',
      text: hasText ? el.textContent.trim().slice(0, 40) : undefined,
      w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, x: Math.round(r.x), y: Math.round(r.y),
      pt: px(cs.paddingTop), pr: px(cs.paddingRight), pb: px(cs.paddingBottom), pl: px(cs.paddingLeft),
      mt: px(cs.marginTop), mr: px(cs.marginRight), mb: px(cs.marginBottom), ml: px(cs.marginLeft),
      display: cs.display, rowGap: px(cs.rowGap), colGap: px(cs.columnGap),
      radius: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px),
      fs: px(cs.fontSize), fw: cs.fontWeight, lh: px(cs.lineHeight), ls: cs.letterSpacing, ff: cs.fontFamily.split(",")[0],
      color: cs.color, bg: cs.backgroundColor, bgImg: cs.backgroundImage !== "none" ? cs.backgroundImage.slice(0, 80) : undefined,
      border: ["Top", "Right", "Bottom", "Left"].map((s) => parseFloat(cs[`border${s}Width`]) > 0 ? `${cs[`border${s}Width`]} ${cs[`border${s}Color`]}` : null),
      shadow: cs.boxShadow !== "none" ? cs.boxShadow : undefined,
      smoothing: cs.webkitFontSmoothing, fvn: cs.fontVariantNumeric,
    });
  }
  return out;
};

for (const mode of MODES) {
  await setMode(mode);
  for (const view of VIEWS) {
    const hash = view === "patient_detail" ? `#/patient/${patientId}` : `#/${view}`;
    await page.goto(BASE + hash);
    await page.reload();
    await page.waitForSelector("[data-sidebar]", { timeout: 30000 });
    await page.waitForTimeout(2200);
    await page.mouse.move(1430, 890);
    const name = `${view}-${mode}`;
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    if (!NO_CRAWL) fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(await page.evaluate(crawl)));
    console.log("ok", name);
  }
}
await ctx.close();
