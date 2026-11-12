import { useEffect, useSyncExternalStore } from "react";
import { applyTheme, getThemeConfig } from "./theme-store";

/**
 * The sidebar's tone, chosen in Appearance. "auto" keeps the theme's own
 * sidebar (dark, in light and in dark mode); "light" and "dark" win over the
 * theme and survive theme changes.
 */
export type SidebarTone = "auto" | "light" | "dark";

export const SIDEBAR_TONES: { value: SidebarTone; label: string }[] = [
  { value: "auto", label: "Automatique" },
  { value: "light", label: "Claire" },
  { value: "dark", label: "Sombre" },
];

export const SIDEBAR_TONE_EVENT = "baitari-sidebar-tone-changed";

// One choice per user, kept on this device: preferences have no server store.
const STORAGE_KEY = "baitari-sidebar-tone";
const STYLE_ID = "baitari-sidebar-tone";
const SIDEBAR = ':is([data-slot="sidebar"], [data-sidebar="sidebar"][data-mobile="true"])';

function readAll(): Record<string, SidebarTone> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getSidebarTone(userId: string | null | undefined): SidebarTone {
  const tone = userId ? readAll()[userId] : undefined;
  return tone === "light" || tone === "dark" ? tone : "auto";
}

export function saveSidebarTone(userId: string, tone: SidebarTone) {
  const all = readAll();
  if (tone === "auto") delete all[userId];
  else all[userId] = tone;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new Event(SIDEBAR_TONE_EVENT));
}

/** The tone the theme gives its sidebar on its own, in both modes. */
const NATIVE_SIDEBAR_TONE = "dark";

/** The tone to force: none when the choice is "auto" or the theme's own. */
export function forcedSidebarTone(tone: SidebarTone): "light" | "dark" | null {
  return tone !== "auto" && tone !== NATIVE_SIDEBAR_TONE ? tone : null;
}

function tokenNames(): string[] {
  const names = new Set<string>();
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        for (const property of Array.from(rule.style)) if (property.startsWith("--")) names.add(property);
      }
      if ("cssRules" in rule) walk((rule as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { walk(sheet.cssRules); } catch { /* cross-origin sheet */ }
  }
  for (const property of Array.from(document.documentElement.style)) if (property.startsWith("--")) names.add(property);
  // Tailwind's per-element variables never inherit: leave them to the utilities.
  return [...names].filter((name) => !name.startsWith("--tw-"));
}

/**
 * The tokens that differ in the other mode, read from the root itself: the
 * root briefly takes that mode (class and accent values), within one task,
 * so nothing paints, then gets every attribute back as it was.
 */
function otherModeTokens(dark: boolean): string {
  const root = document.documentElement;
  const names = tokenNames();
  const current = getComputedStyle(root);
  const before = new Map(names.map((name) => [name, current.getPropertyValue(name).trim()]));
  const attributes = root.getAttributeNames().map((name) => [name, root.getAttribute(name) ?? ""] as const);
  root.classList.remove("light", "dark");
  root.classList.add(dark ? "dark" : "light");
  applyTheme(getThemeConfig(), dark);
  const other = getComputedStyle(root);
  const declarations = names
    .map((name) => [name, other.getPropertyValue(name).trim()] as const)
    .filter(([name, value]) => value && value !== before.get(name))
    .map(([name, value]) => `${name}: ${value};`);
  for (const name of root.getAttributeNames()) root.removeAttribute(name);
  for (const [name, value] of attributes) root.setAttribute(name, value);
  return declarations.join(" ");
}

/**
 * Applies a tone to the sidebar. Only a tone the theme would not give marks
 * the root (data-sidebar-tone); "auto", or the theme's own tone, leaves the
 * page exactly as the theme draws it.
 */
export function applySidebarTone(tone: SidebarTone) {
  const root = document.documentElement;
  const forced = forcedSidebarTone(tone);
  const existing = document.getElementById(STYLE_ID);
  if (!forced) {
    delete root.dataset.sidebarTone;
    existing?.remove();
    return;
  }
  const tokens = otherModeTokens(forced === "dark");
  const style = existing ?? Object.assign(document.createElement("style"), { id: STYLE_ID });
  style.textContent = `:root[data-sidebar-tone="${forced}"] ${SIDEBAR} { color-scheme: ${forced}; ${tokens} }`;
  if (!existing) document.head.append(style);
  root.dataset.sidebarTone = forced;
}

function subscribeRootTone(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-sidebar-tone"] });
  return () => observer.disconnect();
}

/** True while a dark sidebar is forced in a light theme. */
export function useForcedDarkSidebar() {
  return useSyncExternalStore(subscribeRootTone, () => document.documentElement.dataset.sidebarTone === "dark", () => false);
}

/**
 * Keeps the user's tone applied: on sign-in, when it is chosen, and whenever
 * the theme changes (mode class, skin, accent).
 */
export function useSidebarTone(userId: string | null | undefined) {
  useEffect(() => {
    const observer = new MutationObserver(() => apply());
    const apply = () => {
      applySidebarTone(getSidebarTone(userId));
      // The tokens' read briefly switches the root's mode: not a theme change.
      observer.takeRecords();
    };
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-skin"] });
    window.addEventListener(SIDEBAR_TONE_EVENT, apply);
    window.addEventListener("baitari-theme-config-changed", apply);
    apply();
    return () => {
      observer.disconnect();
      window.removeEventListener(SIDEBAR_TONE_EVENT, apply);
      window.removeEventListener("baitari-theme-config-changed", apply);
      applySidebarTone("auto");
    };
  }, [userId]);
}
