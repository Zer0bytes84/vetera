// Annotated crops: for each spec, opens the view, draws the measured box
// (outline, padding tint, label with computed values) and shoots a crop.
// usage: node annot.mjs <specs.json> <outdir> <suffix>
import { chromium } from "/Users/zohir/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";

const specs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const OUT = process.argv[3];
const SUFFIX = process.argv[4] || "";
fs.mkdirSync(OUT, { recursive: true });
const ctx = await chromium.launchPersistentContext(process.env.PROFILE_DIR || new URL("./profile", import.meta.url).pathname, {
  headless: true,
  executablePath: "/Users/zohir/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell",
  viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "fr-FR", timezoneId: "Africa/Algiers",
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
if (process.env.FIXED_TIME) await page.clock.setFixedTime(new Date(process.env.FIXED_TIME));
await page.goto("http://localhost:5173/");
const patientId = await page.evaluate(() => JSON.parse(localStorage.getItem("vetera.browser-db.v1") || "{}").tables?.patients?.[0]?.id);

for (const spec of specs) {
  const mode = spec.mode || "light";
  await page.evaluate(([mode, cfg]) => {
    const c = JSON.parse(localStorage.getItem("theme-config") || "{}");
    c.skin = "clean"; Object.assign(c, cfg || {});
    localStorage.setItem("theme-config", JSON.stringify(c));
    localStorage.setItem("theme", mode);
  }, [mode, spec.config]);
  const hash = spec.view === "patient_detail" ? `#/patient/${patientId}` : `#/${spec.view}`;
  await page.goto("http://localhost:5173/" + hash);
  await page.reload();
  await page.waitForSelector("[data-sidebar]");
  await page.waitForTimeout(2000);
  if (spec.click) { await page.click(spec.click); await page.waitForTimeout(700); }
  if (spec.hover) { await page.hover(spec.hover); await page.waitForTimeout(300); }
  if (spec.scroll) await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "center" }), spec.scroll);
  await page.waitForTimeout(400);
  if (!spec.hover) await page.mouse.move(1430, 890);
  if (spec.fullClip) await page.evaluate(() => 0);
  const clip = await page.evaluate((spec) => {
    const marks = [];
    const layer = document.createElement("div");
    layer.id = "annot-layer";
    layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;font:600 11px/1.2 ui-monospace,Menlo,monospace";
    document.body.appendChild(layer);
    const colors = ["#e11d8f", "#0a84ff", "#ff7a00", "#12a150"];
    spec.marks.forEach((m, i) => {
      const els = [...document.querySelectorAll(m.sel)].filter((e) => e.getBoundingClientRect().width > 0).slice(m.nth ?? 0, (m.nth ?? 0) + (m.count ?? 1));
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const col = colors[i % colors.length];
        const box = document.createElement("div");
        box.style.cssText = `position:fixed;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;outline:1px solid ${col};`;
        if (m.pad !== false) {
          box.style.borderStyle = "solid";
          box.style.borderColor = col + "33";
          box.style.borderWidth = `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`;
          box.style.boxSizing = "border-box";
        }
        if (m.guide) {
          const g = document.createElement("div");
          g.style.cssText = `position:fixed;left:${m.guide === "right" ? r.right : r.x}px;top:0;bottom:0;border-left:1px dashed ${col};`;
          layer.appendChild(g);
        }
        layer.appendChild(box);
        const px = (v) => String(Math.round(parseFloat(v) * 10) / 10);
        const parts = (m.show || ["h", "pad"]).map((k) => {
          if (k === "h") return `h ${px(r.height)}`;
          if (k === "w") return `w ${px(r.width)}`;
          if (k === "x") return `x ${px(r.x)}`;
          if (k === "pad") return `pad ${[cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px).join("/")}`;
          if (k === "gap") return `gap ${px(cs.columnGap)}`;
          if (k === "radius") return `r ${px(cs.borderTopLeftRadius)}`;
          if (k === "ls") return `ls ${cs.letterSpacing}`;
          if (k === "fs") return `${px(cs.fontSize)}/${px(cs.lineHeight)} ${cs.fontWeight}`;
          if (k === "color") return `${cs.color}`;
          if (k === "border") return `bd ${cs.borderTopColor}`;
          if (k === "font") return cs.fontFamily.split(",")[0];
          return k;
        });
        const label = document.createElement("div");
        label.textContent = (m.label ? m.label + " · " : "") + parts.join(" · ");
        const above = r.y > 24;
        label.style.cssText = `position:fixed;left:${Math.max(4, r.x)}px;top:${above ? r.y - 18 : r.bottom + 3}px;background:${col};color:#fff;padding:2px 5px;border-radius:3px;white-space:nowrap;`;
        layer.appendChild(label);
        marks.push(r);
      }
    });
    if (!marks.length) return null;
    const pad = spec.margin ?? 48;
    const x = Math.max(0, Math.min(...marks.map((r) => r.x)) - pad);
    const y = Math.max(0, Math.min(...marks.map((r) => r.y)) - pad);
    const w = Math.min(window.innerWidth - x, Math.max(...marks.map((r) => r.right)) - x + pad);
    const h = Math.min(window.innerHeight - y, Math.max(...marks.map((r) => r.bottom)) - y + pad);
    return { x, y, width: w, height: h };
  }, spec);
  const name = `${spec.id}${SUFFIX}.png`;
  if (!clip) { console.log("MISS", spec.id); continue; }
  await page.screenshot({ path: path.join(OUT, name), clip: spec.fullClip || clip });
  await page.evaluate(() => document.getElementById("annot-layer")?.remove());
  console.log("ok", name);
}
await ctx.close();
