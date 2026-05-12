import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  ACCENT_THEMES,
  type AccentColor,
  FONT_MAP,
  type FontFamily,
  RADIUS_MAP,
  type RadiusSize,
  type ThemeConfig,
} from "@/lib/theme-store";
import { cn } from "@/lib/utils";

interface ThemeSelectorProps {
  config: ThemeConfig;
  onChange: (config: ThemeConfig) => void;
}

export function ThemeSelector({ config, onChange }: ThemeSelectorProps) {
  return (
    <div className="space-y-8">
      {/* Accent Colors */}
      <div>
        <h3 className="mb-1 font-semibold text-foreground text-sm">
          Couleur d'accent
        </h3>
        <p className="mb-4 text-muted-foreground text-xs">
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
              className={cn(
                "group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all hover:scale-[1.02]",
                config.accent === key
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/30"
              )}
              key={key}
              onClick={() => onChange({ ...config, accent: key })}
            >
              {key === "noir" ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-current border-dashed font-semibold text-xs transition-transform group-hover:scale-110">
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
              <span className="font-medium text-[10px] text-muted-foreground">
                {theme.label}
              </span>
              {config.accent === key && (
                <div className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <HugeiconsIcon
                    className="size-2.5"
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={2}
                  />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div>
        <h3 className="mb-1 font-semibold text-foreground text-sm">
          Police de caractères
        </h3>
        <p className="mb-4 text-muted-foreground text-xs">
          Choisissez la typographie de l'interface
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            Object.entries(FONT_MAP) as [FontFamily, typeof FONT_MAP.geist][]
          ).map(([key, font]) => {
            const isActive = config.font === key;
            return (
              <button
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30"
                )}
                key={key}
                onClick={() => onChange({ ...config, font: key })}
              >
                <span
                  className="font-semibold text-foreground text-lg"
                  style={{ fontFamily: font.css }}
                >
                  Aa
                </span>
                <div className="text-center">
                  <div className="font-medium text-[10px] text-foreground">
                    {font.label}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {font.description}
                  </div>
                </div>
                {isActive && (
                  <div className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <HugeiconsIcon
                      className="size-2.5"
                      icon={CheckmarkCircle02Icon}
                      strokeWidth={2}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <h3 className="mb-1 font-semibold text-foreground text-sm">
          Arrondi des coins
        </h3>
        <p className="mb-4 text-muted-foreground text-xs">
          Ajustez le rayon des bordures pour tous les composants
        </p>
        <div className="flex gap-2">
          {(Object.entries(RADIUS_MAP) as [RadiusSize, string][]).map(
            ([key, value]) => (
              <button
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all",
                  config.radius === key
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30"
                )}
                key={key}
                onClick={() => onChange({ ...config, radius: key })}
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
                <span className="font-medium text-[10px] text-muted-foreground uppercase">
                  {key}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Density */}
      <div>
        <h3 className="mb-1 font-semibold text-foreground text-sm">Densité</h3>
        <p className="mb-4 text-muted-foreground text-xs">
          Contrôlez l'espacement global de l'interface
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(["compact", "comfortable", "spacious"] as const).map((density) => (
            <button
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                config.density === density
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/30"
              )}
              key={density}
              onClick={() => onChange({ ...config, density })}
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
              <span className="font-medium text-[10px] text-muted-foreground capitalize">
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
        <h3 className="mb-1 font-semibold text-foreground text-sm">Aperçu</h3>
        <p className="mb-4 text-muted-foreground text-xs">
          Prévisualisation de votre thème
        </p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full bg-gradient-to-br shadow-md"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 70%, black))",
                }}
              />
              <div>
                <div
                  className="font-semibold text-foreground text-sm"
                  style={{ fontFamily: FONT_MAP[config.font].css }}
                >
                  {ACCENT_THEMES[config.accent].label}
                </div>
                <div className="text-muted-foreground text-xs">
                  {ACCENT_THEMES[config.accent].description}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs transition-all hover:opacity-90"
                style={{
                  borderRadius: RADIUS_MAP[config.radius],
                  fontFamily: FONT_MAP[config.font].css,
                }}
              >
                Bouton primaire
              </button>
              <button
                className="rounded-lg border border-border bg-card px-4 py-2 font-medium text-foreground text-xs transition-all hover:bg-muted"
                style={{
                  borderRadius: RADIUS_MAP[config.radius],
                  fontFamily: FONT_MAP[config.font].css,
                }}
              >
                Secondaire
              </button>
              <div
                className="rounded-lg bg-muted px-3 py-2 text-muted-foreground text-xs"
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
                className="font-medium text-primary text-xs"
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
  );
}
