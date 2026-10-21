/**
 * Skins share every component and the Premium layout; a skin only redefines
 * surface tokens and the visual treatment (see design-system/clean.css).
 * Clean exists in light only: in dark mode, Premium dark applies.
 */
export type Skin = "premium" | "clean";

/** The one value that decides which skin a new or untouched install gets. */
export const DEFAULT_SKIN: Skin = "premium";

export function normalizeSkin(value: unknown): Skin {
  return value === "clean" || value === "premium" ? value : DEFAULT_SKIN;
}

/** The three themes offered in Appearance, each a skin and a mode. */
export type AppTheme = "premium-light" | "premium-dark" | "clean";

export const APP_THEMES: { id: AppTheme; label: string; description: string }[] = [
  { id: "premium-light", label: "Premium clair", description: "Surfaces douces et filets gravés." },
  { id: "premium-dark", label: "Premium sombre", description: "Le même espace, de nuit." },
  { id: "clean", label: "Clean", description: "Feuille nette, lignes resserrées, à la Linear." },
];

export function currentAppTheme(skin: Skin, isDark: boolean): AppTheme {
  if (isDark) return "premium-dark";
  return skin === "clean" ? "clean" : "premium-light";
}

/** What choosing a theme sets: the skin and the light or dark mode. */
export function appThemeSettings(theme: AppTheme): { skin: Skin; mode: "light" | "dark" } {
  if (theme === "premium-dark") return { skin: "premium", mode: "dark" };
  return { skin: theme === "clean" ? "clean" : "premium", mode: "light" };
}
