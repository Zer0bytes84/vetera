// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MascotAvatar } from "@/components/mascot/mascot-avatar";
import { FACE_VARIANTS } from "@/components/mascot/mascot-face";
import {
  DEFAULT_MASCOT_PREFERENCES,
  saveMascotPreferences,
} from "@/lib/mascot-preferences";

// The faces of the colour companion are loaded only where it is lively, only for the animal shown, and nothing keeps
// running after a change of companion or an unmount.

const preload = vi.hoisted(() =>
  vi.fn(async (animal: string) =>
    Object.fromEntries(
      [
        "yeux-fermes",
        "joyeux",
        "endormi",
        "regard-gauche",
        "regard-droite",
        "regard-haut",
        "surpris",
      ].map((variant) => [variant, `${animal}-${variant}.webp`])
    )
  )
);
vi.mock("@/components/mascot/color-mascot-faces", () => ({
  preloadMascotFaces: preload,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function reducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

let container: HTMLDivElement;
let root: Root;
async function settle() {
  await act(async () => {
    for (let i = 0; i < 20; i++) {
      await Promise.resolve();
    }
  });
}
async function render(element: React.ReactNode) {
  act(() => {
    root.render(element);
  });
  await settle();
}
/** jsdom answers a localStorage write with a zero-delay timer of its own: flushed here, so only the face's count. */
function savePreferences(animated: boolean) {
  act(() => {
    saveMascotPreferences({ ...DEFAULT_MASCOT_PREFERENCES, animated });
    vi.advanceTimersByTime(0);
  });
}
const shown = () =>
  container.querySelector<HTMLImageElement>(".mascot-color-face[data-shown]")
    ?.dataset.face ?? "base";

beforeEach(async () => {
  // The faces module is mocked; load it once so the component's dynamic import resolves at once.
  await import("@/components/mascot/color-mascot-faces");
  reducedMotion(false);
  saveMascotPreferences(DEFAULT_MASCOT_PREFERENCES);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  preload.mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
  vi.useRealTimers();
});

describe("the living face of the colour companion", () => {
  it("loads the seven faces of the chosen animal only, stacked over the base, and smiles at a click", async () => {
    await render(
      <button type="button">
        <MascotAvatar animal="chat" size={68} />
      </button>
    );
    expect(preload).toHaveBeenCalledTimes(1);
    expect(preload).toHaveBeenCalledWith("chat");
    const layers =
      container.querySelectorAll<HTMLImageElement>(".mascot-color-face");
    expect([...layers].map((layer) => layer.dataset.face)).toEqual([
      ...FACE_VARIANTS,
    ]);
    expect(shown()).toBe("base");
    act(() => container.querySelector("button")?.click());
    expect(shown()).toBe("joyeux");
    expect(
      container
        .querySelector("img:not(.mascot-color-face)")
        ?.hasAttribute("data-face-hidden")
    ).toBe(true);
    act(() => vi.advanceTimersByTime(700));
    expect(shown()).toBe("base");
  });

  it("stays a still base when it is small, when animations are off, or when the system asks for calm", async () => {
    await render(<MascotAvatar animal="chat" size={28} />);
    savePreferences(false);
    await render(<MascotAvatar animal="chat" size={68} />);
    reducedMotion(true);
    savePreferences(true);
    await render(<MascotAvatar animal="lapin" size={68} />);
    expect(preload).not.toHaveBeenCalled();
    expect(container.querySelector(".mascot-color-face")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps one face machine only across a change of companion, and none after unmount", async () => {
    await render(<MascotAvatar animal="chat" size={68} />);
    const one = vi.getTimerCount();
    expect(one).toBe(2); // the next blink and the sleep
    await render(<MascotAvatar animal="chien" size={68} />);
    expect(preload).toHaveBeenLastCalledWith("chien");
    expect(vi.getTimerCount()).toBe(one);
    expect(
      container
        .querySelector<HTMLImageElement>(".mascot-color-face")
        ?.getAttribute("src")
    ).toBe("chien-yeux-fermes.webp");
    act(() => root.unmount());
    expect(vi.getTimerCount()).toBe(0);
    root = createRoot(container);
  });

  it("goes back to the still base when animations are turned off", async () => {
    await render(<MascotAvatar animal="chat" size={68} />);
    expect(container.querySelector(".mascot-color-face")).not.toBeNull();
    savePreferences(false);
    await settle();
    expect(container.querySelector(".mascot-color-face")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
