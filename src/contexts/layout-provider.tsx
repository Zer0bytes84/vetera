import { createContext, useContext, useState } from "react";

/*
 * The sidebar's collapse behaviour is the one layout choice left in Settings.
 * Its presentation (minimal, inset, floating, glass) and the glass contrast
 * were removed on 5 November 2026: the shell always draws the default sidebar.
 */
export type Collapsible = "offcanvas" | "icon" | "none";

const LAYOUT_COLLAPSIBLE_KEY = "layout_collapsible_v7";
const DEFAULT_COLLAPSIBLE: Collapsible = "icon";
const COLLAPSIBLES: Collapsible[] = ["offcanvas", "icon", "none"];

interface LayoutContextType {
  collapsible: Collapsible;
  defaultCollapsible: Collapsible;
  setCollapsible: (collapsible: Collapsible) => void;
}

const LayoutContext = createContext<LayoutContextType | null>(null);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [collapsible, _setCollapsible] = useState<Collapsible>(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_COLLAPSIBLE_KEY) as Collapsible | null;
      return saved && COLLAPSIBLES.includes(saved) ? saved : DEFAULT_COLLAPSIBLE;
    } catch {
      return DEFAULT_COLLAPSIBLE;
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

  return (
    <LayoutContext
      value={{
        defaultCollapsible: DEFAULT_COLLAPSIBLE,
        collapsible,
        setCollapsible,
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
