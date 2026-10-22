/**
 * Skins share every component and the Premium layout; a skin only redefines
 * surface tokens and the visual treatment (see design-system/clean.css).
 * Each skin has a light and a dark declension.
 */
export type Skin = "premium" | "clean";

/** The one value that decides which skin a new or untouched install gets. */
export const DEFAULT_SKIN: Skin = "premium";

export function normalizeSkin(value: unknown): Skin {
  return value === "clean" || value === "premium" ? value : DEFAULT_SKIN;
}

/** The four themes offered in Appearance, each a skin and a mode. */
export type AppTheme = `${Skin}-${"light" | "dark"}`;

export const APP_THEMES: { id: AppTheme; label: string; description: string }[] = [
  { id: "premium-light", label: "Premium clair", description: "Surfaces douces et filets gravés." },
  { id: "premium-dark", label: "Premium sombre", description: "Le même espace, de nuit." },
  { id: "clean-light", label: "Clean clair", description: "Une feuille nette posée sur un cadre, à la Linear." },
  { id: "clean-dark", label: "Clean sombre", description: "Noirs teintés, profondeur par paliers de gris." },
];

export function currentAppTheme(skin: Skin, isDark: boolean): AppTheme {
  return `${skin}-${isDark ? "dark" : "light"}`;
}

/** What choosing a theme sets: the skin and the light or dark mode. */
export function appThemeSettings(theme: AppTheme): { skin: Skin; mode: "light" | "dark" } {
  const [skin, mode] = theme.split("-") as [Skin, "light" | "dark"];
  return { skin, mode };
}
