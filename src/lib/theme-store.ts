export type AccentColor =
  | "blue"
  | "emerald"
  | "violet"
  | "rose"
  | "amber"
  | "cyan"
  | "orange"
  | "teal"
  | "noir"

export type RadiusSize = "sm" | "md" | "lg" | "xl" | "full"

export type FontFamily = "geist" | "inter" | "system"

export interface ThemeConfig {
  accent: AccentColor
  radius: RadiusSize
  density: "compact" | "comfortable" | "spacious"
  font: FontFamily
  sidebarStyle: "inset" | "floating" | "classic"
}

export const ACCENT_THEMES: Record<
  AccentColor,
  {
    label: string
    description: string
    light: {
      primary: string
      primaryForeground: string
      ring: string
      muted: string
      mutedForeground: string
    }
    dark: {
      primary: string
      primaryForeground: string
      ring: string
      muted: string
      mutedForeground: string
    }
    previewGradient: string
  }
> = {
  blue: {
    label: "Bleu",
    description: "Classique et professionnel",
    light: {
      primary: "oklch(0.488 0.243 264.376)",
      primaryForeground: "oklch(1 0 0)",
      ring: "oklch(0.488 0.243 264.376)",
      muted: "oklch(0.967 0.003 247.858)",
      mutedForeground: "oklch(0.551 0.023 264.364)",
    },
    dark: {
      primary: "oklch(0.546 0.245 262.881)",
      primaryForeground: "oklch(0.985 0.002 247.839)",
      ring: "oklch(0.546 0.245 262.881)",
      muted: "oklch(0.268 0.007 228.827)",
      mutedForeground: "oklch(0.708 0.013 264.364)",
    },
    previewGradient: "from-blue-500 to-indigo-600",
  },
  emerald: {
    label: "Émeraude",
    description: "Nature et sérénité",
    light: {
      primary: "oklch(0.596 0.145 163.225)",
      primaryForeground: "oklch(0.985 0.002 247.839)",
      ring: "oklch(0.596 0.145 163.225)",
      muted: "oklch(0.967 0.004 156.743)",
      mutedForeground: "oklch(0.551 0.023 163.225)",
    },
    dark: {
      primary: "oklch(0.696 0.17 162.48)",
      primaryForeground: "oklch(0.985 0.002 247.839)",
      ring: "oklch(0.696 0.17 162.48)",
      muted: "oklch(0.268 0.007 162.48)",
      mutedForeground: "oklch(0.708 0.013 163.225)",
    },
    previewGradient: "from-emerald-500 to-teal-600",
  },
  violet: {
    label: "Violet",
    description: "Créatif et élégant",
    light: {
      primary: "oklch(0.546 0.245 307.225)",
      primaryForeground: "oklch(1 0 0)",
      ring: "oklch(0.546 0.245 307.225)",
      muted: "oklch(0.967 0.003 307.225)",
      mutedForeground: "oklch(0.551 0.023 307.225)",
    },
    dark: {
      primary: "oklch(0.646 0.245 307.225)",
      primaryForeground: "oklch(0.985 0.002 247.839)",
      ring: "oklch(0.646 0.245 307.225)",
      muted: "oklch(0.268 0.007 307.225)",
      mutedForeground: "oklch(0.708 0.013 307.225)",
    },
    previewGradient: "from-violet-500 to-purple-600",
  },
  rose: {
    label: "Rose",
    description: "Doux et chaleureux",
    light: {
      primary: "oklch(0.596 0.205 25.331)",
      primaryForeground: "oklch(1 0 0)",
      ring: "oklch(0.596 0.205 25.331)",
      muted: "oklch(0.967 0.003 25.331)",
      mutedForeground: "oklch(0.551 0.023 25.331)",
    },
    dark: {
      primary: "oklch(0.646 0.205 25.331)",
      primaryForeground: "oklch(0.985 0.002 247.839)",
      ring: "oklch(0.646 0.205 25.331)",
      muted: "oklch(0.268 0.007 25.331)",
      mutedForeground: "oklch(0.708 0.013 25.331)",
    },
    previewGradient: "from-rose-500 to-pink-600",
  },
  amber: {
    label: "Ambre",
    description: "Énergique et lumineux",
    light: {
      primary: "oklch(0.696 0.17 75.834)",
      primaryForeground: "oklch(0.268 0.007 75.834)",
      ring: "oklch(0.696 0.17 75.834)",
      muted: "oklch(0.967 0.003 75.834)",
      mutedForeground: "oklch(0.551 0.023 75.834)",
    },
    dark: {
      primary: "oklch(0.796 0.17 75.834)",
      primaryForeground: "oklch(0.268 0.007 75.834)",
      ring: "oklch(0.796 0.17 75.834)",
      muted: "oklch(0.268 0.007 75.834)",
      mutedForeground: "oklch(0.708 0.013 75.834)",
    },
    previewGradient: "from-amber-500 to-orange-600",
  },
  cyan: {
    label: "Cyan",
    description: "Frais et moderne",
    light: {
      primary: "oklch(0.696 0.145 205.834)",
      primaryForeground: "oklch(0.985 0.002 247.839)",
      ring: "oklch(0.696 0.145 205.834)",
      muted: "oklch(0.967 0.003 205.834)",
      mutedForeground: "oklch(0.551 0.023 205.834)",
    },
    dark: {
      primary: "oklch(0.746 0.145 205.834)",
      primaryForeground: "oklch(0.985 0.002 247.839)",
      ring: "oklch(0.746 0.145 205.834)",
      muted: "oklch(0.268 0.007 205.834)",
      mutedForeground: "oklch(0.708 0.013 205.834)",
    },
    previewGradient: "from-cyan-500 to-blue-600",
  },
  orange: {
    label: "Orange",
    description: "Vif et dynamique",
    light: {
      primary: "oklch(0.646 0.222 41.116)",
      primaryForeground: "oklch(0.985 0.002 247.839)",
      ring: "oklch(0.646 0.222 41.116)",
      muted: "oklch(0.967 0.003 41.116)",
      mutedForeground: "oklch(0.551 0.023 41.116)",
    },
    dark: {
      primary: "oklch(0.746 0.222 41.116)",
      primaryForeground: "oklch(0.985 0.002 247.839)",
      ring: "oklch(0.746 0.222 41.116)",
      muted: "oklch(0.268 0.007 41.116)",
      mutedForeground: "oklch(0.708 0.013 41.116)",
    },
    previewGradient: "from-orange-500 to-red-600",
  },
  teal: {
    label: "Teal",
    description: "Équilibré et apaisant",
    light: {
      primary: "oklch(0.596 0.125 180.834)",
      primaryForeground: "oklch(0.985 0.002 247.839)",
      ring: "oklch(0.596 0.125 180.834)",
      muted: "oklch(0.967 0.003 180.834)",
      mutedForeground: "oklch(0.551 0.023 180.834)",
    },
    dark: {
      primary: "oklch(0.696 0.125 180.834)",
      primaryForeground: "oklch(0.985 0.002 247.839)",
      ring: "oklch(0.696 0.125 180.834)",
      muted: "oklch(0.268 0.007 180.834)",
      mutedForeground: "oklch(0.708 0.013 180.834)",
    },
    previewGradient: "from-teal-500 to-emerald-600",
  },
  noir: {
    label: "Noir",
    description: "Noir en clair → Blanc en sombre",
    light: {
      primary: "oklch(0.145 0 0)",
      primaryForeground: "oklch(1 0 0)",
      ring: "oklch(0.145 0 0)",
      muted: "oklch(0.967 0 0)",
      mutedForeground: "oklch(0.552 0 0)",
    },
    dark: {
      primary: "oklch(0.985 0 0)",
      primaryForeground: "oklch(0.145 0 0)",
      ring: "oklch(0.985 0 0)",
      muted: "oklch(0.269 0 0)",
      mutedForeground: "oklch(0.708 0 0)",
    },
    previewGradient: "from-zinc-900 to-zinc-950",
  },
}

export const FONT_MAP: Record<
  FontFamily,
  { label: string; css: string; description: string }
> = {
  geist: {
    label: "Geist",
    css: "'Geist Variable', sans-serif",
    description: "Moderne et géométrique",
  },
  inter: {
    label: "Inter",
    css: "'Inter Variable', sans-serif",
    description: "Lisible et polyvalent",
  },
  system: {
    label: "Système",
    css: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    description: "Natif et rapide",
  },
}

export const RADIUS_MAP: Record<RadiusSize, string> = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  full: "9999px",
}

export const DENSITY_MAP: Record<
  "compact" | "comfortable" | "spacious",
  { padding: string; gap: string; spacing: string }
> = {
  compact: { padding: "0.5rem", gap: "0.5rem", spacing: "tight" },
  comfortable: { padding: "0.75rem", gap: "0.75rem", spacing: "normal" },
  spacious: { padding: "1rem", gap: "1rem", spacing: "loose" },
}

export const DEFAULT_THEME: ThemeConfig = {
  accent: "blue",
  radius: "lg",
  density: "comfortable",
  font: "geist",
  sidebarStyle: "inset",
}

export function applyTheme(config: ThemeConfig, isDark: boolean) {
  const root = document.documentElement
  const accent = ACCENT_THEMES[config.accent]
  const mode = isDark ? accent.dark : accent.light

  root.style.setProperty("--primary", mode.primary)
  root.style.setProperty("--primary-foreground", mode.primaryForeground)
  root.style.setProperty("--ring", mode.ring)
  root.style.setProperty("--muted", mode.muted)
  root.style.setProperty("--muted-foreground", mode.mutedForeground)
  root.style.setProperty("--accent", mode.primary)
  root.style.setProperty("--radius", RADIUS_MAP[config.radius])

  root.style.setProperty("--chart-1", mode.primary)
  root.style.setProperty(
    "--chart-2",
    isDark
      ? `color-mix(in oklch, ${mode.primary} 72%, white 28%)`
      : `color-mix(in oklch, ${mode.primary} 78%, black 22%)`
  )
  root.style.setProperty(
    "--chart-3",
    `color-mix(in oklch, ${mode.primary} 58%, ${mode.mutedForeground})`
  )
  root.style.setProperty(
    "--chart-4",
    isDark
      ? `color-mix(in oklch, ${mode.primary} 42%, white 58%)`
      : `color-mix(in oklch, ${mode.primary} 46%, black 54%)`
  )
  root.style.setProperty(
    "--chart-5",
    `color-mix(in oklch, ${mode.primary} 28%, ${mode.mutedForeground})`
  )

  const font = config.font || "geist"
  root.style.setProperty("--font-sans", FONT_MAP[font].css)
  root.style.setProperty("--font-heading", FONT_MAP[font].css)

  const density = DENSITY_MAP[config.density]
  root.style.setProperty("--density-padding", density.padding)
  root.style.setProperty("--density-gap", density.gap)
}

export function getThemeConfig(): ThemeConfig {
  try {
    const stored = localStorage.getItem("theme-config")
    if (stored) {
      const parsed = JSON.parse(stored) as ThemeConfig
      return { ...DEFAULT_THEME, ...parsed }
    }
  } catch {}
  return { ...DEFAULT_THEME }
}

export function saveThemeConfig(config: ThemeConfig) {
  localStorage.setItem("theme-config", JSON.stringify(config))
}
