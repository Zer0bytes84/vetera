import {
  type RefObject,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import type { MascotFaceUrls } from "./color-mascot-faces";
import type { LineAnimalKey } from "./line-mascots";
import { createFaceMachine, gazeToward, type MascotFace } from "./mascot-face";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(notify: () => void) {
  const query = globalThis.matchMedia?.(REDUCED_MOTION);
  query?.addEventListener?.("change", notify);
  return () => query?.removeEventListener?.("change", notify);
}
const prefersReducedMotion = () =>
  globalThis.matchMedia?.(REDUCED_MOTION).matches ?? false;

/** The faces module stays out of the startup bundle: fetched the first time a lively companion appears. */
async function loadFaces(animal: LineAnimalKey) {
  const { preloadMascotFaces } = await import("./color-mascot-faces");
  return preloadMascotFaces(animal);
}

/** Close to the companion means within this share of its width from its centre: it looks at you. */
const NEAR = 0.75;

/** Wires the pointer and clicks to the face machine; returns what undoes it all. */
function followPointer(
  portrait: HTMLElement,
  onFace: (face: MascotFace) => void
) {
  const machine = createFaceMachine(onFace);
  onFace("base");
  // The click lands on the button around the companion (the sidebar brand), when there is one.
  const target = portrait.closest<HTMLElement>("button") ?? portrait;
  let frame = 0;
  let pointer: { x: number; y: number } | null = null;
  const aim = () => {
    frame = 0;
    if (!pointer) {
      return;
    }
    const box = portrait.getBoundingClientRect();
    machine.look(
      gazeToward(
        pointer.x - (box.left + box.width / 2),
        pointer.y - (box.top + box.height / 2),
        box.width * NEAR
      )
    );
  };
  const onMove = (event: PointerEvent) => {
    pointer = { x: event.clientX, y: event.clientY };
    if (!frame) {
      frame = requestAnimationFrame(aim);
    }
  };
  // Leaving the window: the pointer is absent, the base.
  const onOut = (event: PointerEvent) => {
    if (!event.relatedTarget) {
      pointer = null;
      machine.look("none");
    }
  };
  const onTouch = () => machine.touch();
  const onClick = () => machine.click();
  const onDoubleClick = () => machine.doubleClick();
  globalThis.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerout", onOut);
  target.addEventListener("pointerenter", onTouch);
  target.addEventListener("pointermove", onTouch, { passive: true });
  target.addEventListener("click", onClick);
  target.addEventListener("dblclick", onDoubleClick);
  return () => {
    cancelAnimationFrame(frame);
    globalThis.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerout", onOut);
    target.removeEventListener("pointerenter", onTouch);
    target.removeEventListener("pointermove", onTouch);
    target.removeEventListener("click", onClick);
    target.removeEventListener("dblclick", onDoubleClick);
    machine.dispose();
  };
}

/**
 * The living face of the colour companion: its seven expressions are loaded only when it is lively (`enabled`:
 * animations allowed, size from 34 px) and the system does not ask for reduced motion, and only for this animal.
 * Changing animal, turning animations off or unmounting stops every timer and listener; the base stays.
 */
export function useMascotFace(
  portrait: RefObject<HTMLElement | null>,
  animal: LineAnimalKey,
  enabled: boolean
): { face: MascotFace; faces: MascotFaceUrls | null } {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotion,
    () => false
  );
  const active = enabled && !reducedMotion;
  const [loaded, setLoaded] = useState<{
    animal: LineAnimalKey;
    urls: MascotFaceUrls;
  } | null>(null);
  const [face, setFace] = useState<MascotFace>("base");

  useEffect(() => {
    if (!active) {
      return;
    }
    let cancelled = false;
    let stop: (() => void) | null = null;
    loadFaces(animal)
      .then((urls) => {
        const element = portrait.current;
        if (cancelled || !element) {
          return;
        }
        setLoaded({ animal, urls });
        stop = followPointer(element, setFace);
      })
      .catch(() => {
        // An expression that does not load: the base portrait stays, still alive by CSS.
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [active, animal, portrait]);

  const faces = active && loaded?.animal === animal ? loaded.urls : null;
  return { face: faces ? face : "base", faces };
}
