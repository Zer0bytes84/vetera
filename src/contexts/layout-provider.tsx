import { createContext, useContext, useEffect, useState } from "react";

export type Collapsible = "offcanvas" | "icon" | "none";
export type LayoutVariant =
  | "inset"
  | "minimal"
  | "sidebar"
  | "floating"
  | "glass";

const LAYOUT_COLLAPSIBLE_KEY = "layout_collapsible_v7";
const LAYOUT_VARIANT_KEY = "layout_variant_v6";
const SIDEBAR_GLASS_CONTRAST_KEY = "sidebar_glass_contrast_v1";

const DEFAULT_VARIANT: LayoutVariant = "minimal";
const DEFAULT_COLLAPSIBLE: Collapsible = "icon";
const DEFAULT_GLASS_CONTRAST = 62;

interface LayoutContextType {
  collapsible: Collapsible;
  defaultCollapsible: Collapsible;
  defaultVariant: LayoutVariant;
  glassContrast: number;
  resetLayout: () => void;
  setCollapsible: (collapsible: Collapsible) => void;
  setGlassContrast: (contrast: number) => void;
  setVariant: (variant: LayoutVariant) => void;
  variant: LayoutVariant;
}

const LayoutContext = createContext<LayoutContextType | null>(null);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [collapsible, _setCollapsible] = useState<Collapsible>(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_COLLAPSIBLE_KEY);
      return (saved as Collapsible) || DEFAULT_COLLAPSIBLE;
    } catch {
      return DEFAULT_COLLAPSIBLE;
    }
  });

  const [variant, _setVariant] = useState<LayoutVariant>(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_VARIANT_KEY);
      return (saved as LayoutVariant) || DEFAULT_VARIANT;
    } catch {
      return DEFAULT_VARIANT;
    }
  });

  const [glassContrast, _setGlassContrast] = useState(() => {
    try {
      const storedValue = localStorage.getItem(SIDEBAR_GLASS_CONTRAST_KEY);
      if (storedValue === null) {
        return DEFAULT_GLASS_CONTRAST;
      }
      const saved = Number(storedValue);
      return Number.isFinite(saved) && saved >= 0 && saved <= 100
        ? saved
        : DEFAULT_GLASS_CONTRAST;
    } catch {
      return DEFAULT_GLASS_CONTRAST;
    }
  });

  const setCollapsible = (value: Collapsible) => {
    _setCollapsible(value);
    try {
      localStorage.setItem(LAYOUT_COLLAPSIBLE_KEY, value);
    } catch {
      // The layout still updates when local storage is unavailable.
    }
  };

  const setVariant = (value: LayoutVariant) => {
    _setVariant(value);
    try {
      localStorage.setItem(LAYOUT_VARIANT_KEY, value);
    } catch {
      // The layout still updates when local storage is unavailable.
    }
  };

  const setGlassContrast = (value: number) => {
    const nextValue = Math.round(Math.min(100, Math.max(0, value)));
    _setGlassContrast(nextValue);
    try {
      localStorage.setItem(SIDEBAR_GLASS_CONTRAST_KEY, String(nextValue));
    } catch {
      // The material still updates when local storage is unavailable.
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    const normalized = glassContrast / 100;
    root.style.setProperty(
      "--sidebar-glass-fill-light",
      String(0.16 + normalized * 0.62)
    );
    root.style.setProperty(
      "--sidebar-glass-fill-dark",
      String(0.14 + normalized * 0.66)
    );
    root.style.setProperty(
      "--sidebar-glass-line",
      String(0.07 + normalized * 0.25)
    );
    root.style.setProperty(
      "--sidebar-glass-shadow",
      String(0.04 + normalized * 0.22)
    );
    root.style.setProperty(
      "--sidebar-glass-highlight",
      String(0.16 + normalized * 0.48)
    );
    root.style.setProperty(
      "--sidebar-glass-blur",
      `${18 + normalized * 20}px`
    );
  }, [glassContrast]);

  const resetLayout = () => {
    setCollapsible(DEFAULT_COLLAPSIBLE);
    setVariant(DEFAULT_VARIANT);
    setGlassContrast(DEFAULT_GLASS_CONTRAST);
  };

  return (
    <LayoutContext
      value={{
        resetLayout,
        defaultCollapsible: DEFAULT_COLLAPSIBLE,
        collapsible,
        setCollapsible,
        defaultVariant: DEFAULT_VARIANT,
        variant,
        setVariant,
        glassContrast,
        setGlassContrast,
      }}
    >
      {children}
    </LayoutContext>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
