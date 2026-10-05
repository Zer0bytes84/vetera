import type { CSSProperties } from "react";
import type { View } from "@/types";
import "./page-mesh.css";
import type { HeaderPattern } from "@/lib/theme-store";
import { cn } from "@/lib/utils";

function PatternGroups() {
  return (
    <>
      <div className="header-pattern-group" data-pattern="opaline">
        <span className="header-pattern-original-anchor absolute inset-0 top-[--header-height]">
          <span
            className="header-pattern-original absolute -top-44 right-40 h-56 w-[33rem] rotate-[-10deg] transform-gpu rounded-full opacity-80 blur-3xl md:right-48 lg:right-56 dark:opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(115deg, #fff1be 28%, #ee87cb 70%, #b060ff)",
            }}
          />
        </span>
      </div>

      <div className="header-pattern-group" data-pattern="aurora">
        <span className="header-pattern-mesh pattern-aurora-mesh" />
        <svg
          className="header-pattern-ornament pattern-aurora-flourish"
          fill="none"
          viewBox="0 0 900 120"
        >
          <path d="M-24 88C130 17 239 104 388 43s291-29 536 28" />
          <path d="M-15 105C138 37 255 119 402 59s286-22 516 24" />
          <path d="M510 49c42-32 88-28 113 4 18 24-7 43-31 31-21-10-8-36 15-33" />
        </svg>
      </div>

      <div className="header-pattern-group" data-pattern="tide">
        <span className="header-pattern-mesh pattern-tide-mesh" />
        <svg
          className="header-pattern-ornament pattern-tide-flourish"
          fill="none"
          viewBox="0 0 900 120"
        >
          <path d="M-20 77c132-42 191 35 315 1s196-45 304-9 181 30 321-16" />
          <path d="M-18 98c133-40 202 34 324 3s195-39 298-5 179 26 316-12" />
          <path d="M632 62c31-35 83-40 112-10 22 23 1 47-29 39-24-7-21-29 1-38" />
        </svg>
      </div>

      <div className="header-pattern-group" data-pattern="spectrum">
        <span className="header-pattern-mesh pattern-spectrum-mesh" />
        <svg
          className="header-pattern-ornament pattern-spectrum-flourish"
          fill="none"
          viewBox="0 0 900 120"
        >
          <path d="M44 111C155-1 300 9 391 78s229 40 304-25S822 3 886 39" />
          <path d="M97 117C200 21 298 34 377 91s202 39 281-18 151-57 229-14" />
          <path d="M516 76c19-45 73-70 111-44 29 20 15 52-16 55-26 3-37-23-17-38" />
        </svg>
      </div>

      <div className="header-pattern-group" data-pattern="topography">
        <span className="header-pattern-mesh pattern-floraison-mesh" />
        <svg
          className="header-pattern-ornament pattern-floraison-flourish"
          fill="none"
          viewBox="0 0 900 120"
        >
          <path d="M86 111C221 85 260 34 383 58s211 54 318-10c61-36 123-26 171 22" />
          <path d="M381 58c-5-28 7-47 35-57 6 28-6 47-35 57Zm17 5c26-12 49-6 68 17-26 12-49 6-68-17Zm124 14c4-30 20-48 49-54 1 29-16 48-49 54Zm17 3c29-7 51 3 66 29-29 7-51-3-66-29Z" />
          <path d="M679 58c-11-29-4-52 21-69 13 28 6 51-21 69Zm15 2c28-16 54-13 76 10-27 16-53 13-76-10Z" />
          <circle cx="382" cy="59" r="4" />
          <circle cx="521" cy="78" r="3" />
          <circle cx="679" cy="59" r="4" />
        </svg>
      </div>

      <div className="header-pattern-group" data-pattern="quiet">
        <span className="header-pattern-mesh pattern-quiet-mesh" />
      </div>
    </>
  );
}

// Stable palettes keep each workspace recognizable when revisiting a page.
const PAGE_PALETTES: Record<View, readonly [string, string]> = {
  dashboard: ["#6366f1", "#f9a8d4"],
  agenda: ["#06b6d4", "#67e8f9"],
  clinique: ["#67e8f9", "#34d399"],
  patients: ["#2dd4bf", "#a5b4fc"],
  patient_detail: ["#34d399", "#67e8f9"],
  notes: ["#a78bfa", "#f9a8d4"],
  stock: ["#84cc16", "#6ee7b7"],
  finances: ["#f59e0b", "#f9a8d4"],
  finances_analytics: ["#fbbf24", "#fb7185"],
  parametres: ["#a5b4fc", "#ddd6fe"],
  equipe: ["#fb7185", "#c4b5fd"],
  taches: ["#fcd34d", "#67e8f9"],
  aide: ["#67e8f9", "#ddd6fe"],
  assistant: ["#8b5cf6", "#22d3ee"],
};

function meshRandom(seed: number) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

export function HeroPattern({ view = "dashboard" }: { view?: View }) {
  const seed = Array.from(view).reduce(
    (value, character) => value + character.charCodeAt(0),
    0
  );
  return (
    <div aria-hidden="true" className="page-mesh" key={view}>
      <div className="page-mesh-colors">
      {PAGE_PALETTES[view].map((color, index) => {
        const haloSeed = seed + index * 13;
        return (
          <span
            className="page-mesh-halo"
            key={index}
            style={{
              "--halo-color": color,
              "--halo-x": `${50 + (meshRandom(haloSeed) - 0.5) * 15}%`,
              "--halo-width": `${(0.45 + meshRandom(haloSeed + 200) * 0.15) * 200}%`,
              "--halo-height": `${220 * (0.55 + meshRandom(haloSeed + 300) * 0.15) * 2}px`,
            } as CSSProperties}
          />
        );
      })}
      </div>
    </div>
  );
}

/**
 * Reusable live pattern layer for surfaces that share the shell's glass language.
 * The active pattern is resolved by the same `data-header-pattern` attribute
 * used by the application header, so modal headers stay in sync with Apparence.
 */
export function HeaderPatternLayer({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "header-pattern-field header-pattern-live header-pattern-modal pointer-events-none absolute inset-0",
        className
      )}
    >
      <PatternGroups />
    </div>
  );
}

export function HeaderPatternPreview({
  className,
  pattern,
}: {
  className?: string;
  pattern: HeaderPattern;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "header-pattern-field header-pattern-preview relative overflow-hidden",
        className
      )}
      data-preview-pattern={pattern}
    >
      <PatternGroups />
      <div className="header-pattern-preview-glass" />
    </div>
  );
}
