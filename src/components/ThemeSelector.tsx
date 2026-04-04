import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"

import {
  ACCENT_THEMES,
  RADIUS_MAP,
  FONT_MAP,
  type AccentColor,
  type RadiusSize,
  type FontFamily,
  type ThemeConfig,
} from "@/lib/theme-store"
import { cn } from "@/lib/utils"

interface ThemeSelectorProps {
  config: ThemeConfig
  onChange: (config: ThemeConfig) => void
}

export function ThemeSelector({ config, onChange }: ThemeSelectorProps) {
  return (
    <div className="space-y-8">
      {/* Accent Colors */}
      <div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">
          Couleur d'accent
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Choisissez la couleur principale de l'interface
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {(
            Object.entries(ACCENT_THEMES) as [
              AccentColor,
              typeof ACCENT_THEMES.blue,
            ][]
          ).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => onChange({ ...config, accent: key })}
              className={cn(
                "group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all hover:scale-[1.02]",
                config.accent === key
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/30"
              )}
            >
              {key === "noir" ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-current text-xs font-bold transition-transform group-hover:scale-110">
                  Aa
                </div>
              ) : (
                <div
                  className={cn(
                    "h-8 w-8 rounded-full bg-gradient-to-br shadow-sm transition-transform group-hover:scale-110",
                    theme.previewGradient
                  )}
                />
              )}
              <span className="text-[10px] font-medium text-muted-foreground">
                {theme.label}
              </span>
              {config.accent === key && (
                <div className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={2}
                    className="size-2.5"
                  />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">
          Police de caractères
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Choisissez la typographie de l'interface
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            Object.entries(FONT_MAP) as [FontFamily, typeof FONT_MAP.geist][]
          ).map(([key, font]) => {
            const isActive = config.font === key
            return (
              <button
                key={key}
                onClick={() => onChange({ ...config, font: key })}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30"
                )}
              >
                <span
                  className="text-lg font-semibold text-foreground"
                  style={{ fontFamily: font.css }}
                >
                  Aa
                </span>
                <div className="text-center">
                  <div className="text-[10px] font-medium text-foreground">
                    {font.label}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {font.description}
                  </div>
                </div>
                {isActive && (
                  <div className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      strokeWidth={2}
                      className="size-2.5"
                    />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">
          Arrondi des coins
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Ajustez le rayon des bordures pour tous les composants
        </p>
        <div className="flex gap-2">
          {(Object.entries(RADIUS_MAP) as [RadiusSize, string][]).map(
            ([key, value]) => (
              <button
                key={key}
                onClick={() => onChange({ ...config, radius: key })}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all",
                  config.radius === key
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30"
                )}
              >
                <div
                  className="h-8 w-12 border-2 transition-all"
                  style={{
                    borderRadius: value,
                    borderColor:
                      config.radius === key
                        ? "var(--primary)"
                        : "var(--border)",
                  }}
                />
                <span className="text-[10px] font-medium text-muted-foreground uppercase">
                  {key}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Density */}
      <div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">Densité</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Contrôlez l'espacement global de l'interface
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(["compact", "comfortable", "spacious"] as const).map((density) => (
            <button
              key={density}
              onClick={() => onChange({ ...config, density })}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                config.density === density
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/30"
              )}
            >
              <div className="flex w-full flex-col gap-1">
                {density === "compact" && (
                  <>
                    <div className="h-1 w-full rounded-full bg-muted-foreground/20" />
                    <div className="h-1 w-3/4 rounded-full bg-muted-foreground/20" />
                    <div className="h-1 w-1/2 rounded-full bg-muted-foreground/20" />
                  </>
                )}
                {density === "comfortable" && (
                  <>
                    <div className="h-1.5 w-full rounded-full bg-muted-foreground/20" />
                    <div className="h-1.5 w-3/4 rounded-full bg-muted-foreground/20" />
                    <div className="h-1.5 w-1/2 rounded-full bg-muted-foreground/20" />
                  </>
                )}
                {density === "spacious" && (
                  <>
                    <div className="h-2 w-full rounded-full bg-muted-foreground/20" />
                    <div className="h-2 w-3/4 rounded-full bg-muted-foreground/20" />
                    <div className="h-2 w-1/2 rounded-full bg-muted-foreground/20" />
                  </>
                )}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground capitalize">
                {density === "compact"
                  ? "Compact"
                  : density === "comfortable"
                    ? "Confortable"
                    : "Spacieux"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">Aperçu</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Prévisualisation de votre thème
        </p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full bg-gradient-to-br shadow-md"
                style={{
                  backgroundImage: `linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 70%, black))`,
                }}
              />
              <div>
                <div
                  className="text-sm font-semibold text-foreground"
                  style={{ fontFamily: FONT_MAP[config.font].css }}
                >
                  {ACCENT_THEMES[config.accent].label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {ACCENT_THEMES[config.accent].description}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all hover:opacity-90"
                style={{
                  borderRadius: RADIUS_MAP[config.radius],
                  fontFamily: FONT_MAP[config.font].css,
                }}
              >
                Bouton primaire
              </button>
              <button
                className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-all hover:bg-muted"
                style={{
                  borderRadius: RADIUS_MAP[config.radius],
                  fontFamily: FONT_MAP[config.font].css,
                }}
              >
                Secondaire
              </button>
              <div
                className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground"
                style={{ borderRadius: RADIUS_MAP[config.radius] }}
              >
                Badge
              </div>
            </div>
            <div
              className="rounded-xl border border-primary/20 bg-primary/5 p-4"
              style={{
                borderRadius: `calc(${RADIUS_MAP[config.radius]} * 1.5)`,
              }}
            >
              <p
                className="text-xs font-medium text-primary"
                style={{ fontFamily: FONT_MAP[config.font].css }}
              >
                {ACCENT_THEMES[config.accent].description} —{" "}
                {FONT_MAP[config.font].label} — Densité {config.density}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
