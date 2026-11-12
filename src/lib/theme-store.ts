/*
 * Clean is the only interface (Premium was removed on 11 November 2026).
 * Appearance keeps three real choices: light or dark mode (theme-provider),
 * the type set (`cleanFont`) and the sidebar tone (sidebar-tone.ts).
 * The decorative settings removed on 5 November 2026 (accent colour, Classic
 * style, Liquid Glass switch, sidebar presentation, glass contrast,
 * and the hidden radius, density, font and header pattern values) are fixed
 * at their default, and so is the theme: `cleanUpRemovedDisplaySettings`
 * drops what an older install stored for them, the old `skin` included.
 * See docs/recus/2026-11-05/nettoyage-parametres/ and
 * docs/recus/2026-11-11-suppression-premium/.
 */

/**
 * Type sets of the interface (titles, data and text). Every file is bundled
 * locally (OFL), nothing is fetched.
 */
export type CleanFontSet = "inter" | "geist" | "plex" | "signature";

export const CLEAN_FONT_SETS: Record<
  CleanFontSet,
  { label: string; description: string; sample: string }
> = {
  inter: {
    label: "Inter",
    description: "Par défaut : Inter partout",
    sample: "'Inter Clean', 'Inter Variable', sans-serif",
  },
  geist: {
    label: "Geist",
    description: "Geist, chiffres en Geist Mono",
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

export const DEFAULT_CLEAN_FONT: CleanFontSet = "inter";

export function normalizeCleanFont(value: unknown): CleanFontSet {
  return typeof value === "string" && Object.hasOwn(CLEAN_FONT_SETS, value)
    ? (value as CleanFontSet)
    : DEFAULT_CLEAN_FONT;
}

export interface ThemeConfig {
  /** Unset means the default Inter set (DEFAULT_CLEAN_FONT). */
  cleanFont?: CleanFontSet;
}

export const DEFAULT_THEME: ThemeConfig = {};

/** The fixed values of the removed settings, as every default install had them. */
const FIXED = {
  skin: "clean",
  chromeStyle: "liquid-glass",
  headerPattern: "opaline",
  radius: "0.5rem",
  // The fallback under clean.css, which sets the type tokens of the chosen set.
  font: "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  // The former "blue" accent: only its muted ink still reaches the charts.
  mutedForeground: { light: "oklch(0.551 0.023 264.364)", dark: "oklch(0.708 0.013 264.364)" },
} as const;

export function applyTheme(config: ThemeConfig, isDark: boolean) {
  const root = document.documentElement;
  root.dataset.skin = FIXED.skin;
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

const CLEAN_ONLY_MIGRATION_KEY = "baitari-clean-only-v1";

/** The markers of the earlier one-shot appearance migrations, replaced by CLEAN_ONLY_MIGRATION_KEY. */
const LEGACY_MIGRATION_KEYS = [
  "baitari-premium-default-v1",
  "baitari-clean-default-v1",
  "baitari-clean-default-v2",
] as const;

/**
 * Clean only (11 November 2026), once. Replaces the three migrations that
 * moved installs between Premium and Clean.
 *
 * - An install that predates the light default (it never ran
 *   baitari-clean-default-v1) and chose no mode keeps the dark mode it showed.
 * - The old theme is not touched here: `cleanUpRemovedDisplaySettings` drops
 *   `skin` from the stored config on every read, so a Premium written by
 *   hand, or by an older build after this one ran, falls back to Clean too.
 * - The retired markers are removed.
 *
 * The mode, the type set and the sidebar tone are left as they are.
 */
export function migrateToCleanOnly() {
  if (localStorage.getItem(CLEAN_ONLY_MIGRATION_KEY) === "true") return;
  if (localStorage.getItem("baitari-clean-default-v1") !== "true") {
    const installed = localStorage.getItem("theme-config") !== null || localStorage.getItem("baitari-premium-default-v1") === "true";
    if (installed && localStorage.getItem("theme") === null) localStorage.setItem("theme", "dark");
  }
  for (const key of LEGACY_MIGRATION_KEYS) localStorage.removeItem(key);
  localStorage.setItem(CLEAN_ONLY_MIGRATION_KEY, "true");
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
 * the type set, drops everything else (the old `skin` included), never
 * throws: an unreadable config falls back to the defaults and is left alone. Runs on every read, so it
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
    const { cleanFont } = parsed as Record<string, unknown>;
    if (typeof cleanFont === "string" && Object.hasOwn(CLEAN_FONT_SETS, cleanFont)) config.cleanFont = cleanFont as CleanFontSet;
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
    migrateToCleanOnly();
  } catch {
    // Storage unavailable: defaults apply.
  }
  return cleanUpRemovedDisplaySettings();
}

export function saveThemeConfig(config: ThemeConfig) {
  const next: ThemeConfig = {};
  if (config.cleanFont) next.cleanFont = normalizeCleanFont(config.cleanFont);
  localStorage.setItem("theme-config", JSON.stringify(next));
  window.dispatchEvent(new Event("baitari-theme-config-changed"));
}
