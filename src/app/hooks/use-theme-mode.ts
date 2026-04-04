import { useEffect, useMemo, useState } from "react"

export type ThemeMode = "light" | "dark" | "system"

function getInitialMode(): ThemeMode {
  if (localStorage.theme === "dark") return "dark"
  if (localStorage.theme === "light") return "light"
  return "system"
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialMode)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const applyTheme = (mode: ThemeMode, systemPrefersDark = mediaQuery.matches) => {
      const isDark = mode === "system" ? systemPrefersDark : mode === "dark"
      setIsDarkMode(isDark)
      document.documentElement.classList.toggle("dark", isDark)

      if (mode === "system") {
        localStorage.removeItem("theme")
      } else {
        localStorage.theme = mode
      }
    }

    applyTheme(themeMode)

    const handleChange = (event: MediaQueryListEvent) => {
      if (themeMode === "system") {
        applyTheme("system", event.matches)
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [themeMode])

  return useMemo(
    () => ({
      themeMode,
      isDarkMode,
      setThemeMode,
      toggleTheme: () => setThemeMode((current) => (current === "dark" ? "light" : "dark")),
    }),
    [isDarkMode, themeMode]
  )
}
