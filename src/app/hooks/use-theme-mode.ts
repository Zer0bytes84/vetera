import { useCallback, useMemo } from "react";
import { useTheme } from "@/components/theme-provider";

export type ThemeMode = "light" | "dark" | "system";

// The shell, settings, keyboard shortcut and theme button share one state.
export function useThemeMode() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const toggleTheme = useCallback(
    () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    [resolvedTheme, setTheme]
  );

  return useMemo(
    () => ({
      themeMode: theme,
      isDarkMode: resolvedTheme === "dark",
      setThemeMode: setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );
}
