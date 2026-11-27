/**
 * The companion's reaction to a click (sidebar brand, chooser): a small hop and nod, once, replayed at each click.
 * CSS cannot replay a one-shot animation on demand, so it is a Web Animation started by the click itself: nothing
 * runs at startup. Transform only, on the portrait's outer layer (the breath lives on an inner one, the blink on the
 * image), so the three add up. Skipped when the companion is still: « Animations discrètes » off (no data-motion),
 * a small size, or a system that asks for reduced motion.
 */
const HOP: Keyframe[] = [
  { transform: "translateY(0) rotate(0deg) scale(1)" },
  { transform: "translateY(-12%) rotate(-3deg) scale(1.06)", offset: 0.32 },
  { transform: "translateY(0) rotate(2deg) scale(1.03, 0.96)", offset: 0.62 },
  { transform: "translateY(0) rotate(0deg) scale(1)" },
];

export function playMascotReaction(root: Element | null | undefined) {
  const portrait = root?.querySelector<HTMLElement>(
    '.mascot-color[data-motion="on"]'
  );
  if (!portrait || typeof portrait.animate !== "function") {
    return null;
  }
  if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return null;
  }
  return portrait.animate(HOP, {
    duration: 520,
    easing: "cubic-bezier(0.34, 1.4, 0.64, 1)",
  });
}
