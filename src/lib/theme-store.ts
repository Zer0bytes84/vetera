import { normalizeSkin, type Skin } from "./theme-skin";

/*
 * Appearance keeps four real choices: light or dark mode (theme-provider),
 * the theme (Clean or Premium, `skin`), the Clean type set (`cleanFont`) and
 * the sidebar tone (sidebar-tone.ts, restored the same evening).
 * The decorative settings removed on 5 November 2026 (accent colour, Classic
 * style, Liquid Glass switch, sidebar presentation, glass contrast,
 * and the hidden radius, density, font and header pattern values) are now
 * fixed at their default; `cleanUpRemovedDisplaySettings` drops what an older
 * install stored for them. See docs/recus/2026-11-05/nettoyage-parametres/.
 */

/**
 * Type sets of the Clean skin only (interface, titles, data). Kept apart from
 * `font`, which Classic and Premium read, so a choice made in Clean never
 * reaches Premium. Every file is bundled locally (OFL), nothing is fetched.
 */
export type CleanFontSet = "inter" | "geist" | "plex" | "signature";

export const CLEAN_FONT_SETS: Record<
  CleanFontSet,
  { label: string; description: string; sample: string }
> = {
  inter: {
    label: "Inter",
    description: "Inter partout (ancienne valeur par défaut)",
    sample: "'Inter Clean', 'Inter Variable', sans-serif",
  },
  geist: {
    label: "Geist",
    description: "Par défaut : Geist, chiffres en Geist Mono",
    sample: "'Geist Variable', sans-serif",
  },
  plex: {
    label: "Plex",
    description: "IBM Plex Sans, chiffres en Plex Mono",
    sample: "'IBM Plex Sans Variable', sans-serif",
  },
  signature: {
    label: "Signature",
    description: "Inter, titres en Space Grotesk",
    sample: "'Space Grotesk Variable', sans-serif",
  },
};

export const DEFAULT_CLEAN_FONT: CleanFontSet = "geist";

export function normalizeCleanFont(value: unknown): CleanFontSet {
  return typeof value === "string" && value in CLEAN_FONT_SETS
    ? (value as CleanFontSet)
    : DEFAULT_CLEAN_FONT;
}

export interface ThemeConfig {
  /** Unset means the default skin (DEFAULT_SKIN). Installs from before Clean became the default have it set (keepPreviousAppearanceDefaults). */
  skin?: Skin;
  /** Clean skin only; unset means the default Geist set (DEFAULT_CLEAN_FONT). */
  cleanFont?: CleanFontSet;
}

export const DEFAULT_THEME: ThemeConfig = {};

/** The fixed values of the removed settings, as every default install had them. */
const FIXED = {
  visualStyle: "premium",
  chromeStyle: "liquid-glass",
  headerPattern: "opaline",
  radius: "0.5rem",
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  // The former "blue" accent: only its muted ink still reaches the charts.
  mutedForeground: { light: "oklch(0.551 0.023 264.364)", dark: "oklch(0.708 0.013 264.364)" },
} as const;

export function applyTheme(config: ThemeConfig, isDark: boolean) {
  const root = document.documentElement;
  root.dataset.visualStyle = FIXED.visualStyle;
  root.dataset.skin = normalizeSkin(config.skin);
  root.dataset.chromeStyle = FIXED.chromeStyle;
  const primary = isDark ? "#3b1fe5" : "#191919";
  const mutedForeground = isDark ? FIXED.mutedForeground.dark : FIXED.mutedForeground.light;

  root.style.setProperty("--primary", primary, "important");
  root.style.setProperty("--primary-foreground", "#ffffff", "important");
  root.style.setProperty("--on-primary", "#ffffff", "important");
  root.style.setProperty("--btn-primary-bg", primary, "important");
  root.style.setProperty("--btn-primary-hover", isDark ? "#4b33f0" : "#000000", "important");
  root.style.setProperty("--btn-primary-fg", "#ffffff", "important");
  root.style.setProperty("--ring", primary, "important");
  // Navigation stays neutral like the CRM; primary color belongs to actions.
  root.style.setProperty("--sidebar-primary", "var(--frame)", "important");
  root.style.setProperty("--sidebar-primary-foreground", "var(--ink)", "important");
  root.style.setProperty("--sidebar-ring", "var(--ink-muted)", "important");
  root.style.setProperty("--sidebar-accent", isDark ? "#2a2a2a" : "#eeeeef", "important");
  root.style.setProperty("--sidebar-accent-foreground", "var(--ink)", "important");

  // Keep dark surfaces globally coherent with dashboard visuals.
  // Accent is an interactive surface (menus, selections), not primary ink.
  root.style.setProperty("--muted", "var(--frame)", "important");
  root.style.setProperty("--muted-foreground", "var(--ink-muted)", "important");
  root.style.setProperty("--accent", isDark ? "var(--surface-raised)" : "var(--frame)", "important");
  root.style.setProperty("--radius", FIXED.radius, "important");

  root.style.setProperty("--chart-1", primary);
  root.style.setProperty("--chart-2", "#ffffff");
  root.style.setProperty(
    "--chart-3",
    isDark
      ? `color-mix(in oklch, ${primary} 60%, white 40%)`
      : `color-mix(in oklch, ${primary} 40%, black 60%)`
  );
  root.style.setProperty(
    "--chart-4",
    isDark
      ? `color-mix(in oklch, ${primary} 80%, white 20%)`
      : `color-mix(in oklch, ${primary} 20%, black 80%)`
  );
  root.style.setProperty("--chart-5", `color-mix(in oklch, ${primary} 30%, ${mutedForeground})`);

  root.style.setProperty("--app-font-sans", FIXED.font);
  root.style.setProperty("--app-font-heading", FIXED.font);
  root.style.setProperty("--app-font-display", FIXED.font);
  root.style.setProperty("--font-sans", FIXED.font);
  root.style.setProperty("--font-heading", FIXED.font);
  root.dataset.cleanFont = normalizeCleanFont(config.cleanFont);
  root.dataset.headerPattern = FIXED.headerPattern;
}

const PREMIUM_DEFAULT_MIGRATION_KEY = "baitari-premium-default-v1";
const CLEAN_DEFAULT_MIGRATION_KEY = "baitari-clean-default-v1";

/**
 * Clean is the default skin, and light the default mode, for new installs only.
 * An install that already ran keeps what it showed: Premium, and dark when no
 * mode was ever chosen. A choice already stored is never touched. Once only.
 */
export function keepPreviousAppearanceDefaults() {
  if (localStorage.getItem(CLEAN_DEFAULT_MIGRATION_KEY) === "true") return;
  const stored = localStorage.getItem("theme-config");
  // Every launch since the Premium default has written this key, with or without a stored config.
  if (stored !== null || localStorage.getItem(PREMIUM_DEFAULT_MIGRATION_KEY) === "true") {
    let parsed: Partial<ThemeConfig> = {};
    try { parsed = stored ? JSON.parse(stored) : {}; } catch { /* unreadable config: keep it as is */ }
    if (parsed && typeof parsed === "object" && parsed.skin === undefined) {
      localStorage.setItem("theme-config", JSON.stringify({ ...parsed, skin: "premium" }));
    }
    if (localStorage.getItem("theme") === null) localStorage.setItem("theme", "dark");
  }
  localStorage.setItem(CLEAN_DEFAULT_MIGRATION_KEY, "true");
}

/** Storage keys of the removed settings and of their one-shot migrations. */
export const REMOVED_DISPLAY_KEYS = [
  "layout_variant_v8",
  "sidebar_glass_contrast_v1",
  "baitari-crm-geist-trial-v1",
  "baitari-neutral-controls-v1",
  "baitari-blue-system-polish-v1",
  "baitari_original_header_restored_v2",
] as const;

/**
 * An older install may hold values for settings that no longer exist. Keeps
 * the theme and the type set, drops everything else, never throws: an
 * unreadable config falls back to the defaults. Runs on every read, so it
 * also cleans a value written by an older build after an update.
 */
export function cleanUpRemovedDisplaySettings(): ThemeConfig {
  let parsed: unknown = null;
  try {
    const stored = localStorage.getItem("theme-config");
    parsed = stored ? JSON.parse(stored) : null;
  } catch {
    parsed = null;
  }
  const config: ThemeConfig = {};
  if (parsed && typeof parsed === "object") {
    const { skin, cleanFont } = parsed as Record<string, unknown>;
    if (skin === "clean" || skin === "premium") config.skin = skin;
    if (typeof cleanFont === "string" && cleanFont in CLEAN_FONT_SETS) config.cleanFont = cleanFont as CleanFontSet;
  }
  try {
    const next = JSON.stringify(config);
    if (parsed !== null && localStorage.getItem("theme-config") !== next) localStorage.setItem("theme-config", next);
    for (const key of REMOVED_DISPLAY_KEYS) localStorage.removeItem(key);
  } catch {
    // Storage unavailable: the fixed appearance still applies.
  }
  return config;
}

export function getThemeConfig(): ThemeConfig {
  try {
    keepPreviousAppearanceDefaults();
  } catch {
    // Storage unavailable: defaults apply.
  }
  const config = cleanUpRemovedDisplaySettings();
  try {
    localStorage.setItem(PREMIUM_DEFAULT_MIGRATION_KEY, "true");
  } catch {
    // Storage unavailable.
  }
  return config;
}

export function saveThemeConfig(config: ThemeConfig) {
  const next: ThemeConfig = {};
  if (config.skin) next.skin = normalizeSkin(config.skin);
  if (config.cleanFont) next.cleanFont = normalizeCleanFont(config.cleanFont);
  localStorage.setItem(PREMIUM_DEFAULT_MIGRATION_KEY, "true");
  localStorage.setItem("theme-config", JSON.stringify(next));
  window.dispatchEvent(new Event("baitari-theme-config-changed"));
}
