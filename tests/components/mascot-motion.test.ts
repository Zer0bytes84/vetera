// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { playMascotReaction } from "@/components/mascot/mascot-motion";

// The click reaction of the colour companion: once per click, transform only, never when the companion is still.

function portrait(motion: boolean) {
  const button = document.createElement("button");
  const span = document.createElement("span");
  span.className = "mascot-color";
  if (motion) {
    span.dataset.motion = "on";
  }
  const animate = vi.fn(() => ({}) as Animation);
  (span as unknown as { animate: typeof animate }).animate = animate;
  button.append(span);
  document.body.append(button);
  return { button, animate };
}
function reducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
    }),
  });
}
afterEach(() => {
  document.body.innerHTML = "";
});

describe("réaction du compagnon au clic", () => {
  it("joue un petit saut, une fois, en transform seulement", () => {
    reducedMotion(false);
    const { button, animate } = portrait(true);
    playMascotReaction(button);
    expect(animate).toHaveBeenCalledTimes(1);
    const [frames, options] = animate.mock.calls[0] as unknown as [
      Keyframe[],
      KeyframeAnimationOptions,
    ];
    expect(
      frames.every((frame) =>
        Object.keys(frame).every(
          (key) => key === "transform" || key === "offset"
        )
      )
    ).toBe(true);
    expect(options.iterations ?? 1).toBe(1);
  });

  it("reste immobile si « Animations discrètes » est éteint ou si la taille est petite (pas de data-motion)", () => {
    reducedMotion(false);
    const { button, animate } = portrait(false);
    expect(playMascotReaction(button)).toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });

  it("reste immobile quand le système demande de réduire les animations", () => {
    reducedMotion(true);
    const { button, animate } = portrait(true);
    expect(playMascotReaction(button)).toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });
});
