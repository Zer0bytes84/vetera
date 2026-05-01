import { createContext, useContext, useState } from "react"

export type Collapsible = "offcanvas" | "icon" | "none"
type Variant = "inset" | "sidebar" | "floating"

const LAYOUT_COLLAPSIBLE_KEY = "layout_collapsible"
const LAYOUT_VARIANT_KEY = "layout_variant"

const DEFAULT_VARIANT: Variant = "sidebar"
const DEFAULT_COLLAPSIBLE: Collapsible = "icon"

type LayoutContextType = {
  resetLayout: () => void
  defaultCollapsible: Collapsible
  collapsible: Collapsible
  setCollapsible: (collapsible: Collapsible) => void
  defaultVariant: Variant
  variant: Variant
  setVariant: (variant: Variant) => void
}

const LayoutContext = createContext<LayoutContextType | null>(null)

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [collapsible, _setCollapsible] = useState<Collapsible>(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_COLLAPSIBLE_KEY)
      return (saved as Collapsible) || DEFAULT_COLLAPSIBLE
    } catch {
      return DEFAULT_COLLAPSIBLE
    }
  })

  const [variant, _setVariant] = useState<Variant>(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_VARIANT_KEY)
      // Migrate legacy default "inset" to the new default "sidebar".
      if (saved === "inset") return "sidebar"
      return (saved as Variant) || DEFAULT_VARIANT
    } catch {
      return DEFAULT_VARIANT
    }
  })

  const setCollapsible = (value: Collapsible) => {
    _setCollapsible(value)
    try {
      localStorage.setItem(LAYOUT_COLLAPSIBLE_KEY, value)
    } catch {}
  }

  const setVariant = (value: Variant) => {
    _setVariant(value)
    try {
      localStorage.setItem(LAYOUT_VARIANT_KEY, value)
    } catch {}
  }

  const resetLayout = () => {
    setCollapsible(DEFAULT_COLLAPSIBLE)
    setVariant(DEFAULT_VARIANT)
  }

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
      }}
    >
      {children}
    </LayoutContext>
  )
}

export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider")
  }
  return context
}
