// Captures of the four ports validated in the copy (27 October): sidebar
// search, Paramètres label, Consultations curve in Clean, SOAP blocks. One pass
// per appearance (query = "clean-light,clean-dark,premium-light"); each state is
// photographed by the shell ("ready:<name>" → "done:<name>") and measured in
// the page: computed sizes and frames, so the screenshots are not the only proof.
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { ensureSession, sleep, waitFor } from "./capture-dictee";

const box = (el: Element | null) => {
  if (!el) return null;
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return {
    height: Math.round(rect.height),
    width: Math.round(rect.width),
    borderRadius: style.borderRadius,
    boxShadow: style.boxShadow,
    border: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
    background: style.backgroundColor,
  };
};
/** The style rules that set a frame on this element, in sheet order: what actually decides it. */
const framingRules = (el: Element | null) => {
  if (!el) return [];
  const found: string[] = [];
  const walk = (rules: CSSRuleList) => {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) {
        if (!/border|box-shadow/.test(rule.style.cssText)) continue;
        try {
          if (el.matches(rule.selectorText)) found.push(`${rule.selectorText} { ${rule.style.cssText.slice(0, 160)} }`);
        } catch {
          // Selectors this engine cannot match (vendor pseudo-classes).
        }
      } else if ("cssRules" in rule) walk((rule as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      walk(sheet.cssRules);
    } catch {
      // Cross-origin sheet.
    }
  }
  return found;
};
const byLabel = (label: string) => document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
const buttonText = (text: string) =>
  [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim().includes(text));

export async function capturePorts(signal: string, appearances: string[], patientId: string) {
  const results: Record<string, unknown>[] = JSON.parse(sessionStorage.getItem("ports-results") ?? "[]");
  const save = () => {
    sessionStorage.setItem("ports-results", JSON.stringify(results));
    return writeTextFile(`${signal}.results.json`, JSON.stringify(results, null, 2));
  };
  const shot = async (name: string, measures: Record<string, unknown> = {}) => {
    await sleep(700);
    results.push({ appearance, name, ...measures });
    await save();
    await writeTextFile(signal, `ready:${appearance}-${name}`);
    for (let i = 0; i < 1200 && (await readTextFile(signal).catch(() => "")).trim() !== `done:${appearance}-${name}`; i++) await sleep(250);
  };
  await ensureSession();
  localStorage.setItem("dashboard.version", "analytics");
  const index = Number(sessionStorage.getItem("ports-index") ?? "0");
  const appearance = appearances[index];
  if (!appearance) {
    await writeTextFile(signal, "restored");
    return;
  }
  const [skin, mode] = appearance.split("-");
  const config = JSON.parse(localStorage.getItem("theme-config") ?? "{}") as Record<string, unknown>;
  const toastShown = localStorage.getItem("baitari:ai-models-onboarding-dismissed") !== "true";
  localStorage.setItem("baitari:ai-models-onboarding-dismissed", "true");
  if (toastShown || config.skin !== skin || localStorage.getItem("theme") !== mode) {
    localStorage.setItem("theme-config", JSON.stringify({ ...config, visualStyle: "premium", skin }));
    localStorage.setItem("theme", mode);
    location.reload();
    return;
  }

  // 1-2. Sidebar, deployed then as icons.
  location.hash = "#/dashboard";
  await waitFor(() => document.querySelector(".premium-overview-shell > .kpis"), 60_000);
  await sleep(1500);
  const navItem = document.querySelector(".app-sidebar [data-slot='sidebar-menu-button'], .app-sidebar .sidebar-nav-link");
  const search = () => byLabel("Ouvrir la palette de commandes (⌘K)") ?? byLabel("Rechercher (⌘K)");
  await shot("sidebar", {
    navItem: box(navItem),
    search: box(search()),
    searchKey: box(search()?.querySelector("kbd") ?? null),
    settings: box(document.querySelector(".sidebar-settings-button")),
    settingsText: document.querySelector(".sidebar-settings-button")?.textContent?.trim(),
    headerSearch: Boolean(document.querySelector(".shell-header-search-field, .shell-header-search")),
  });
  byLabel("Réduire la barre latérale")?.click();
  await sleep(900);
  // At rest first: the loupe as a plain icon, then focused to show its tooltip
  // (the ring around it is the keyboard focus, not a frame).
  await shot("sidebar-icone", { search: box(search()), settings: box(document.querySelector(".sidebar-settings-button")) });
  search()?.focus();
  await shot("sidebar-icone-infobulle");
  search()?.blur();
  document.querySelector<HTMLElement>(".sidebar-settings-button")?.focus();
  await shot("sidebar-icone-parametres");
  document.querySelector<HTMLElement>(".sidebar-settings-button")?.blur();
  byLabel("Déployer la barre latérale")?.click();
  await sleep(900);

  // 3. The Consultations card of the first row.
  const kpis = document.querySelector(".premium-overview-shell > .kpis")!;
  kpis.scrollIntoView({ block: "center" });
  const visits = byLabel("Voir les consultations");
  const visible = (selector: string) =>
    [...(visits?.querySelectorAll(selector) ?? [])].filter((el) => getComputedStyle(el).display !== "none").length;
  await shot("consultations", { bars: visible(".kpiBars"), area: visible(".kpiArea") });

  // 4. A complete SOAP note: four boxes at rest, then one focused by a click.
  location.hash = `#/patient/${encodeURIComponent(patientId)}`;
  (await waitFor(() => buttonText("Note clinique"), 60_000)).click();
  const note = await waitFor(() => document.querySelector("#patient-consultation-note .soap-section-editor"), 30_000);
  await sleep(1200);
  note.closest("#patient-consultation-note")?.scrollIntoView({ block: "start" });
  await sleep(400);
  const editor = () => document.querySelector("#patient-consultation-note .soap-section-editor")!;
  const soapMeasures = () => ({
    card: box(editor()),
    header: box(editor().querySelector(":scope > div:first-child")),
    textarea: box(editor().querySelector("textarea")),
    boxes: document.querySelectorAll("#patient-consultation-note .soap-section-editor").length,
    focusInside: editor().contains(document.activeElement),
    focusWithin: editor().matches(":focus-within"),
    windowFocused: document.hasFocus(),
  });
  await shot("soap", {
    ...soapMeasures(),
    cardRules: framingRules(editor()),
    headerRules: framingRules(editor().querySelector(":scope > div:first-child")),
    textareaRules: framingRules(editor().querySelector("textarea")),
  });
  // A window in the background never matches :focus-within: bring it forward first.
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setFocus();
  await sleep(500);
  const textarea = editor().querySelector<HTMLTextAreaElement>("textarea")!;
  textarea.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  textarea.focus();
  // Measured once the border's 200 ms transition has ended.
  await sleep(600);
  await shot("soap-focus", soapMeasures());
  textarea.blur();

  sessionStorage.setItem("ports-index", String(index + 1));
  location.hash = "#/dashboard";
  location.reload();
}
