"use client";

import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "@/components/theme-provider";

interface CircularTransitionHook {
  isTransitioning: () => boolean;
  startTransition: (
    coords: { x: number; y: number },
    callback: () => void
  ) => void;
  toggleTheme: (event: React.MouseEvent) => void;
}

export function useCircularTransition(): CircularTransitionHook {
  const { setTheme } = useTheme();
  const isTransitioningRef = useRef(false);

  const startTransition = useCallback(
    (coords: { x: number; y: number }, callback: () => void) => {
      if (isTransitioningRef.current) {
        return;
      }

      isTransitioningRef.current = true;

      const x = (coords.x / window.innerWidth) * 100;
      const y = (coords.y / window.innerHeight) * 100;

      document.documentElement.style.setProperty("--x", `${x}%`);
      document.documentElement.style.setProperty("--y", `${y}%`);

      const finishTransition = () => {
        isTransitioningRef.current = false;
      };

      if (
        typeof document.startViewTransition !== "function" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        callback();
        finishTransition();
        return;
      }

      try {
        const transition = document.startViewTransition(() => {
          // Commit both the theme class and its palette before the snapshot.
          flushSync(callback);
        });
        void transition.finished.then(finishTransition, finishTransition);
      } catch {
        callback();
        finishTransition();
      }
    },
    []
  );

  const toggleTheme = useCallback(
    (event: React.MouseEvent) => {
      const coords = {
        x: event.clientX,
        y: event.clientY,
      };

      startTransition(coords, () => {
        const isCurrentlyDark =
          document.documentElement.classList.contains("dark");
        setTheme(isCurrentlyDark ? "light" : "dark");
      });
    },
    [setTheme, startTransition]
  );

  const isTransitioning = useCallback(() => isTransitioningRef.current, []);

  return {
    startTransition,
    toggleTheme,
    isTransitioning,
  };
}
