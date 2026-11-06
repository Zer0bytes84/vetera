"use client";

/**
 * Premium is the only visual style since the Classic switch was removed
 * (5 November 2026); Clean is a skin over it. Kept as a hook so the
 * components that branch on it stay unchanged.
 */
export function useIsPremium(): boolean {
  return true;
}
