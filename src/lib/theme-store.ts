export type AccentColor =
  | "mist"
  | "blue"
  | "emerald"
  | "violet"
  | "rose"
  | "amber"
  | "cyan"
  | "orange"
  | "teal"
  | "noir";

export type RadiusSize = "sm" | "md" | "lg" | "xl" | "full";

export type FontFamily = "geist" | "inter" | "system";

export type HeaderPattern =
  | "opaline"
  | "aurora"
  | "tide"
  | "spectrum"
  | "topography"
  | "quiet";

export const HEADER_PATTERNS: Record<
  HeaderPattern,
  { label: string; description: string }
> = {
  opaline: {
    label: "Original",
    description: "Le dégradé Baitari d'origine",
  },
  aurora: {
    label: "Aurora",
    description: "Mesh boréal aux lignes fluides",
  },
  tide: {
    label: "Marée",
    description: "Ondes turquoise et sauge",
  },
  spectrum: {
    label: "Spectre",
    description: "Mesh pêche, lilas et azur",
  },
  topography: {
    label: "Floraison",
    description: "Pastel poudré et motif botanique",
  },
  quiet: {
    label: "Calme",
    description: "Voile minéral presque neutre",
  },
};

export interface ThemeConfig {
  chromeStyle: "classic" | "liquid-glass";
  accent: AccentColor;
  density: "compact" | "comfortable" | "spacious";
  font: FontFamily;
  headerPattern: HeaderPattern;
  radius: RadiusSize;
  sidebarStyle: "inset" | "minimal" | "floating" | "classic";
}

export const ACCENT_THEMES: Record<
  AccentColor,
  {
    label: string;
    description: string;
    light: {
      primary: string;
      primaryForeground: string;
      ring: string;
      muted: string;
      mutedForeground: string;
    };
    dark: {
      primary: string;
      primaryForeground: string;
      ring: string;
      muted: string;
      mutedForeground: string;
    };
    previewGradient: string;
  }
> = {
  mist: {
    label: "Mist",
    description: "Neutre et élégant",
    light: {
      primary: "oklch(0.218 0.008 223.9)",
      primaryForeground: "oklch(0.987 0.002 197.1)",
      ring: "oklch(0.723 0.014 214.4)",
      muted: "oklch(0.963 0.002 197.1)",
      mutedForeground: "oklch(0.56 0.021 213.5)",
    },
    dark: {
      primary: "oklch(0.925 0.005 214.3)",
      primaryForeground: "oklch(0.218 0.008 223.9)",
      ring: "oklch(0.56 0.021 213.5)",
      muted: "oklch(0.275 0.011 216.9)",
      mutedForeground: "oklch(0.723 0.014 214.4)",
    },
    previewGradient: "from-slate-500 to-slate-600",
  },
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
      primary: "#059669",
      primaryForeground: "oklch(0.985 0.002 247.839)",
      ring: "#059669",
      muted: "oklch(0.967 0.004 156.743)",
      mutedForeground: "oklch(0.551 0.023 163.225)",
    },
    dark: {
      primary: "#34d399",
      primaryForeground: "#09090b",
      ring: "#34d399",
      muted: "oklch(0.268 0.007 162.48)",
      mutedForeground: "oklch(0.708 0.013 163.225)",
    },
    previewGradient: "from-emerald-500 to-teal-600",
  },
  violet: {
    label: "Violet",
    description: "Créatif et élégant",
    light: {
      primary: "#4124fb",
      primaryForeground: "oklch(1 0 0)",
      ring: "#8b7aff",
      muted: "oklch(0.967 0.003 307.225)",
      mutedForeground: "oklch(0.551 0.023 307.225)",
    },
    dark: {
      primary: "#4124fb",
      primaryForeground: "oklch(0.985 0.002 247.839)",
      ring: "#8b7aff",
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
};

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
};

export const RADIUS_MAP: Record<RadiusSize, string> = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  full: "9999px",
};

export const DENSITY_MAP: Record<
  "compact" | "comfortable" | "spacious",
  { padding: string; gap: string; spacing: string }
> = {
  compact: { padding: "0.5rem", gap: "0.5rem", spacing: "tight" },
  comfortable: { padding: "0.75rem", gap: "0.75rem", spacing: "normal" },
  spacious: { padding: "1rem", gap: "1rem", spacing: "loose" },
};

export const DEFAULT_THEME: ThemeConfig = {
  chromeStyle: "liquid-glass",
  accent: "noir",
  radius: "md",
  density: "comfortable",
  font: "geist",
  headerPattern: "opaline",
  sidebarStyle: "classic",
};

const ORIGINAL_HEADER_RESTORE_KEY = "baitari_original_header_restored_v2";

export function applyTheme(config: ThemeConfig, isDark: boolean) {
  const root = document.documentElement;
  root.dataset.chromeStyle = config.chromeStyle === "liquid-glass" ? "liquid-glass" : "classic";
  const accent = ACCENT_THEMES[config.accent];
  const mode = isDark ? accent.dark : accent.light;

  const darkDashboardMuted = "var(--frame)";
  const darkDashboardMutedForeground = "var(--ink-muted)";
  const darkDashboardAccent = "var(--surface-raised)";

  const mutedValue = "var(--frame)";
  const mutedForegroundValue = isDark
    ? darkDashboardMutedForeground
    : "var(--ink-muted)";
  // Accent is an interactive surface (menus, selections), not primary ink.
  const accentValue = isDark ? darkDashboardAccent : "var(--frame)";

  root.style.setProperty("--primary", mode.primary, "important");
  root.style.setProperty(
    "--primary-foreground",
    mode.primaryForeground,
    "important"
  );
  root.style.setProperty("--ring", mode.ring, "important");
  // Navigation stays neutral like the CRM; primary color belongs to actions.
  root.style.setProperty("--sidebar-primary", "var(--frame)", "important");
  root.style.setProperty("--sidebar-primary-foreground", "var(--ink)", "important");
  root.style.setProperty("--sidebar-ring", "var(--ink-muted)", "important");
  root.style.setProperty("--sidebar-accent", isDark ? "#2a2a2a" : "#eeeeef", "important");
  root.style.setProperty("--sidebar-accent-foreground", "var(--ink)", "important");

  // Keep dark surfaces globally coherent with dashboard visuals.
  // In dark mode, avoid runtime accent overrides that create mismatched pages.
  if (isDark) {
    root.style.setProperty("--muted", darkDashboardMuted, "important");
    root.style.setProperty(
      "--muted-foreground",
      darkDashboardMutedForeground,
      "important"
    );
    root.style.setProperty("--accent", darkDashboardAccent, "important");
  } else {
    root.style.setProperty("--muted", mutedValue, "important");
    root.style.setProperty(
      "--muted-foreground",
      mutedForegroundValue,
      "important"
    );
    root.style.setProperty("--accent", accentValue, "important");
  }
  root.style.setProperty("--radius", RADIUS_MAP[config.radius], "important");

  if (config.accent === "mist") {
    if (isDark) {
      root.style.setProperty("--chart-1", "oklch(0.72 0.086 248)");
      root.style.setProperty("--chart-2", "oklch(0.8 0.055 196)");
      root.style.setProperty("--chart-3", "oklch(0.68 0.03 230)");
      root.style.setProperty("--chart-4", "oklch(0.56 0.025 228)");
      root.style.setProperty("--chart-5", "oklch(0.84 0.018 228)");
    } else {
      root.style.setProperty("--chart-1", "oklch(0.62 0.086 248)");
      root.style.setProperty("--chart-2", "oklch(0.74 0.05 196)");
      root.style.setProperty("--chart-3", "oklch(0.57 0.03 230)");
      root.style.setProperty("--chart-4", "oklch(0.82 0.022 228)");
      root.style.setProperty("--chart-5", "oklch(0.68 0.018 228)");
    }
  } else {
    root.style.setProperty("--chart-1", mode.primary);
    root.style.setProperty("--chart-2", mode.primaryForeground);
    root.style.setProperty(
      "--chart-3",
      isDark
        ? `color-mix(in oklch, ${mode.primary} 60%, white 40%)`
        : `color-mix(in oklch, ${mode.primary} 40%, black 60%)`
    );
    root.style.setProperty(
      "--chart-4",
      isDark
        ? `color-mix(in oklch, ${mode.primary} 80%, white 20%)`
        : `color-mix(in oklch, ${mode.primary} 20%, black 80%)`
    );
    root.style.setProperty(
      "--chart-5",
      `color-mix(in oklch, ${mode.primary} 30%, ${mode.mutedForeground})`
    );
  }

  root.style.setProperty("--app-font-sans", FONT_MAP[config.font].css);
  root.style.setProperty("--app-font-heading", FONT_MAP.geist.css);
  root.style.setProperty("--app-font-display", FONT_MAP.geist.css);
  root.style.setProperty("--font-sans", FONT_MAP[config.font].css);
  root.style.setProperty("--font-heading", FONT_MAP.geist.css);
  root.dataset.font = config.font;
  root.dataset.headerPattern = config.headerPattern || "opaline";
  root.dataset.radius = config.radius;
  root.dataset.density = config.density;

  const density = DENSITY_MAP[config.density];
  root.style.setProperty("--density-padding", density.padding);
  root.style.setProperty("--density-gap", density.gap);
}

export function getThemeConfig(): ThemeConfig {
  try {
    const stored = localStorage.getItem("theme-config");
    if (stored) {
      const parsed = JSON.parse(stored) as ThemeConfig;
      const config = { ...DEFAULT_THEME, ...parsed };
      // Apply the requested CRM visual trial once; later appearance choices persist.
      if (localStorage.getItem("baitari-crm-geist-trial-v1") !== "true") {
        config.accent = "noir";
        config.font = "geist";
        localStorage.setItem("theme-config", JSON.stringify(config));
        localStorage.setItem("baitari-crm-geist-trial-v1", "true");
      }
      if (localStorage.getItem(ORIGINAL_HEADER_RESTORE_KEY) !== "true") {
        config.headerPattern = DEFAULT_THEME.headerPattern;
        localStorage.setItem("theme-config", JSON.stringify(config));
        localStorage.setItem(ORIGINAL_HEADER_RESTORE_KEY, "true");
      }
      // Restore the neutral controls after the CRM violet trial, once only.
      // Explicit later accent choices remain available in Appearance.
      if (localStorage.getItem("baitari-neutral-controls-v1") !== "true") {
        if (config.accent === "violet") config.accent = "noir";
        localStorage.setItem("theme-config", JSON.stringify(config));
        localStorage.setItem("baitari-neutral-controls-v1", "true");
      }
      return config;
    }
  } catch {}
  localStorage.setItem("baitari-crm-geist-trial-v1", "true");
  localStorage.setItem("baitari-neutral-controls-v1", "true");
  return { ...DEFAULT_THEME };
}

export function saveThemeConfig(config: ThemeConfig) {
  localStorage.setItem("theme-config", JSON.stringify(config));
  window.dispatchEvent(new Event("baitari-theme-config-changed"));
}
