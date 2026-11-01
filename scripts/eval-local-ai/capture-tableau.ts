// Captures of the dashboard widgets, before and after a pass: one run per
// appearance (query = "clean-light,clean-dark,premium-light"), each widget row
// scrolled into view and photographed by the shell (signal "ready:<name>" →
// "done:<name>"). The small format is the same window with the debug tools
// docked beside the page; the shell decides which. In every state the page measures what a
// reader would see as broken: an element wider than its box, two labels that
// overlap. Results go to "<signal>.results.json".
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { ensureSession, sleep, waitFor } from "./capture-dictee";

const ROWS: [name: string, selector: string][] = [
  ["kpi", ".premium-overview-shell > .kpis"],
  ["recettes", ".premium-overview-shell > .recettesCard"],
  ["activite", ".premium-overview-shell > .pairRow"],
  ["surveiller", ".premium-overview-shell > .watchGrid"],
];

/** Switches pressed one after another in a row, each photographed: [shot, button label]. */
const SWITCHES: Record<string, [shot: string, label: string][]> = {
  activite: [["semaine", "Semaine"], ["trimestre", "Trimestre"], ["annee", "Année"], ["mois", "Mois"]],
  recettes: [["consultations", "Consultations"], ["12-mois", "12 mois"], ["7-jours", "7 jours"], ["recettes", "Recettes"], ["30-jours", "30 jours"]],
};

/**
 * Text that leaves its card (or is cut by a box that hides it), then pairs of
 * text lines that overlap. Lines are compared one by one (getClientRects), so a
 * label wrapping onto two lines is not mistaken for an overlap.
 */
function measure(root: Element) {
  const clipped: string[] = [];
  const lines: { el: Element; rects: DOMRect[] }[] = [];
  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const ownText = [...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
    if (!ownText) continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
    if (!rects.length) continue;
    lines.push({ el, rects });
    const card = el.closest(".card, .kpi, .watchCard") ?? root;
    const box = card.getBoundingClientRect();
    const out = rects.some((rect) => rect.left < box.left - 1 || rect.right > box.right + 1);
    // An ellipsis is a choice, not a break: only text cut without one counts.
    const cut = /hidden|clip/.test(style.overflowX) && style.textOverflow !== "ellipsis" && el.scrollWidth > el.clientWidth + 1;
    if (out || cut) clipped.push(`« ${el.textContent?.trim().slice(0, 40)} »${out ? " hors de sa carte" : " coupé"}`);
  }
  const overlaps: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i];
      const b = lines[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      // The chart's tooltip floats over the plot by design.
      if (Boolean(a.el.closest(".chartTip, .focusTip, .heatTip")) !== Boolean(b.el.closest(".chartTip, .focusTip, .heatTip"))) continue;
      const hit = a.rects.some((ra) =>
        b.rects.some(
          (rb) =>
            Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left) > 1 &&
            Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) > 1,
        ),
      );
      if (hit) overlaps.push(`« ${a.el.textContent?.trim().slice(0, 30)} » × « ${b.el.textContent?.trim().slice(0, 30)} »`);
    }
  }
  return { clipped, overlaps };
}

export async function captureDashboard(signal: string, appearances: string[]) {
  const results: Record<string, unknown>[] = JSON.parse(sessionStorage.getItem("tableau-results") ?? "[]");
  const save = () => {
    sessionStorage.setItem("tableau-results", JSON.stringify(results));
    return writeTextFile(`${signal}.results.json`, JSON.stringify(results, null, 2));
  };
  const handshake = async (message: string, answer: string) => {
    await writeTextFile(signal, message);
    for (let i = 0; i < 1200 && (await readTextFile(signal).catch(() => "")).trim() !== answer; i++) await sleep(250);
  };
  await ensureSession();
  localStorage.setItem("dashboard.version", "analytics");
  // The local AI tools toast would cover the lower widgets: dismissed, then a fresh load.
  const toastShown = localStorage.getItem("baitari:ai-models-onboarding-dismissed") !== "true";
  localStorage.setItem("baitari:ai-models-onboarding-dismissed", "true");
  const index = Number(sessionStorage.getItem("tableau-index") ?? "0");
  const appearance = appearances[index];
  if (!appearance) {
    await writeTextFile(signal, "restored");
    return;
  }
  const [skin, mode] = appearance.split("-");
  const config = JSON.parse(localStorage.getItem("theme-config") ?? "{}") as Record<string, unknown>;
  if (toastShown || config.skin !== skin || localStorage.getItem("theme") !== mode) {
    localStorage.setItem("theme-config", JSON.stringify({ ...config, visualStyle: "premium", skin }));
    localStorage.setItem("theme", mode);
    location.reload();
    return;
  }
  location.hash = "#/dashboard";
  await waitFor(() => document.querySelector(".premium-overview-shell > .kpis"), 60_000);
  await sleep(2500);
  for (const [name, selector] of ROWS) {
    const row = document.querySelector(selector);
    if (!row) {
      results.push({ appearance, row: name, error: "rangée absente" });
      continue;
    }
    // The row's top just under the sticky header.
    row.scrollIntoView({ block: "start" });
    let scroller: HTMLElement | null = row.parentElement;
    while (scroller && !(/(auto|scroll)/.test(getComputedStyle(scroller).overflowY) && scroller.scrollHeight > scroller.clientHeight)) scroller = scroller.parentElement;
    (scroller ?? document.scrollingElement)?.scrollBy(0, -96);
    await sleep(900);
    results.push({ appearance, row: name, width: Math.round(row.getBoundingClientRect().width), ...measure(row) });
    await save();
    await handshake(`ready:${appearance}-${name}`, `done:${appearance}-${name}`);
    // The hover states: the chart's tooltip near its end, the first species lit.
    const chart = row.querySelector<SVGSVGElement>(".chartPlot svg, .focusPlot svg");
    const species = row.querySelector<HTMLElement>(".speciesCard .widgetRows li");
    // The busiest day of the heatmap, its tooltip open.
    const cells = [...row.querySelectorAll<HTMLElement>(".heatMain .heatCell[data-level]")];
    const busiest = cells.sort((a, b) => Number(b.dataset.level) - Number(a.dataset.level))[0];
    if (busiest) {
      busiest.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
      await sleep(500);
      results.push({ appearance, row: `${name}-survol`, ...measure(row) });
      await save();
      await handshake(`ready:${appearance}-${name}-survol`, `done:${appearance}-${name}-survol`);
      busiest.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
    }
    for (const [shot, label] of SWITCHES[name] ?? []) {
      const button = [...row.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === label);
      if (!button) {
        results.push({ appearance, row: `${name}-${shot}`, error: `bouton « ${label} » absent` });
        continue;
      }
      button.click();
      await sleep(700);
      results.push({ appearance, row: `${name}-${shot}`, width: Math.round(row.getBoundingClientRect().width), ...measure(row) });
      await save();
      await handshake(`ready:${appearance}-${name}-${shot}`, `done:${appearance}-${name}-${shot}`);
    }
    if (chart || species) {
      if (chart) {
        const box = chart.getBoundingClientRect();
        chart.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: box.left + box.width * 0.55, clientY: box.top + box.height / 2 }));
      }
      species?.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
      await sleep(600);
      results.push({ appearance, row: `${name}-survol`, ...measure(row) });
      await save();
      await handshake(`ready:${appearance}-${name}-survol`, `done:${appearance}-${name}-survol`);
      chart?.dispatchEvent(new PointerEvent("pointerleave", { bubbles: false }));
      species?.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
    }
  }
  sessionStorage.setItem("tableau-index", String(index + 1));
  location.reload();
}
