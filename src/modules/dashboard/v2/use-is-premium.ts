"use client";

import { useEffect, useState } from "react";
import { getThemeConfig } from "@/lib/theme-store";

export function useIsPremium(): boolean {
  const [isPremium, setIsPremium] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.dataset.visualStyle === "premium";
    }
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      return getThemeConfig().visualStyle === "premium";
    }
    return true;
  });

  useEffect(() => {
    const update = () => {
      setIsPremium(document.documentElement.dataset.visualStyle === "premium");
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-visual-style"],
    });
    return () => observer.disconnect();
  }, []);

  return isPremium;
}
