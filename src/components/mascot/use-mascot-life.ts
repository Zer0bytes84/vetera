import { useEffect, useState, type RefObject } from "react";
import type { LineMood } from "./line-mascots";

/** Farthest a pupil travels from the eye's centre, in drawing units (the sclera is 5.6 × 6.2). */
const PUPIL_REACH = 2.2;
/** Head tilt and drift following the pointer, in degrees and drawing units. */
const TILT = 4;
const DRIFT = 1.4;
/** Time constant of the follow, in seconds: soft, never jittery. */
const EASE = 0.14;
/** A still pointer for this long and the mascot looks up, thinking. */
const DAYDREAM_MS = 25_000;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Brings a line mascot to life: eyes that follow the pointer anywhere in the
 * window (pupils kept inside the eye), a slight tilt of the head, blinks, an
 * ear's twitch, a happy face on hover and a thinking one after a long pause.
 * Transforms only, written straight to the drawing's groups; the frame loop
 * runs only while the eyes are travelling and stops when they settle. Paused
 * while the window is hidden; with « réduire les animations », nothing moves
 * and the face stays neutral.
 */
export function useMascotLife(root: RefObject<HTMLElement | null>, enabled: boolean, trigger?: RefObject<HTMLElement | null>) {
  const [mood, setMood] = useState<LineMood>("neutral");
  const [blink, setBlink] = useState(false);
  const [twitch, setTwitch] = useState<"l" | "r" | null>(null);
  const [still, setStill] = useState(() => typeof window !== "undefined" && reducedMotion());

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(query.matches);
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = root.current;
    // Without life the face is neutral: the returned mood says so.
    if (!el || !enabled || still) return;
    const pupils = [...el.querySelectorAll<SVGGElement>(".lm-pupils")];
    const face = el.querySelector<SVGGElement>(".lm-face");
    const eyes = [...el.querySelectorAll<SVGGElement>(".lm-eye-open ellipse")];
    const target = { x: 0, y: 0, tilt: 0, drift: 0 };
    const current = { x: 0, y: 0, tilt: 0, drift: 0 };
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    let last = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let daydream: ReturnType<typeof setTimeout> | undefined;
    let hovered = false;

    const aim = () => {
      if (!pointer || !eyes.length) return;
      // The gaze aims from between the eyes; the drawing's scale turns pixels into units.
      const a = eyes[0].getBoundingClientRect();
      const b = eyes[eyes.length - 1].getBoundingClientRect();
      const cx = (a.left + b.right) / 2;
      const cy = (a.top + b.bottom) / 2;
      const dx = pointer.x - cx;
      const dy = pointer.y - cy;
      const distance = Math.hypot(dx, dy) || 1;
      // Right on the face the eyes barely move; from 90 px they reach the rim.
      const reach = Math.min(1, distance / 90);
      target.x = (dx / distance) * reach * PUPIL_REACH;
      target.y = (dy / distance) * reach * PUPIL_REACH;
      target.tilt = (dx / distance) * reach * TILT;
      target.drift = (dx / distance) * reach * DRIFT;
    };

    const paint = () => {
      for (const group of pupils) group.style.transform = `translate(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px)`;
      if (face) face.style.transform = `translateX(${current.drift.toFixed(2)}px) rotate(${current.tilt.toFixed(2)}deg)`;
    };

    const tick = (time: number) => {
      const dt = last ? Math.min(0.05, (time - last) / 1000) : 1 / 60;
      last = time;
      const k = 1 - Math.exp(-dt / EASE);
      let moving = false;
      for (const key of ["x", "y", "tilt", "drift"] as const) {
        current[key] += (target[key] - current[key]) * k;
        if (Math.abs(target[key] - current[key]) > 0.01) moving = true;
      }
      paint();
      frame = moving ? requestAnimationFrame(tick) : 0;
      if (!moving) last = 0;
    };
    const run = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
    };

    const rest = () => {
      clearTimeout(daydream);
      daydream = setTimeout(() => {
        if (!hovered) setMood("thinking");
      }, DAYDREAM_MS);
    };
    const onPointer = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      aim();
      run();
      setMood((mood) => (mood === "thinking" ? "neutral" : mood));
      rest();
    };
    const host = trigger?.current ?? el;
    const onEnter = () => {
      hovered = true;
      setMood("happy");
    };
    const onLeave = () => {
      hovered = false;
      setMood("neutral");
    };

    // Blinks every 3 to 6 s, sometimes twice; an ear twitches now and then.
    const scheduleBlink = () => {
      timers.push(
        setTimeout(() => {
          setBlink(true);
          timers.push(setTimeout(() => setBlink(false), 130));
          if (Math.random() < 0.2) {
            timers.push(setTimeout(() => setBlink(true), 260));
            timers.push(setTimeout(() => setBlink(false), 390));
          }
          scheduleBlink();
        }, 3000 + Math.random() * 3000),
      );
    };
    const scheduleTwitch = () => {
      timers.push(
        setTimeout(() => {
          setTwitch(Math.random() < 0.5 ? "l" : "r");
          timers.push(setTimeout(() => setTwitch(null), 420));
          scheduleTwitch();
        }, 7000 + Math.random() * 7000),
      );
    };

    const start = () => {
      scheduleBlink();
      scheduleTwitch();
      rest();
      run();
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      for (const timer of timers.splice(0)) clearTimeout(timer);
      clearTimeout(daydream);
      setBlink(false);
      setTwitch(null);
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    window.addEventListener("pointermove", onPointer, { passive: true });
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    if (!document.hidden) start();
    return () => {
      stop();
      window.removeEventListener("pointermove", onPointer);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const group of pupils) group.style.transform = "";
      if (face) face.style.transform = "";
    };
  }, [root, trigger, enabled, still]);

  return { mood: still || !enabled ? ("neutral" as const) : mood, blink, twitch, still };
}
