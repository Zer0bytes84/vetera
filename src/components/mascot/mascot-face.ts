/**
 * The face of the colour companion, by swapping images: Gemini drew seven expressions per animal (eyes shut, joyful,
 * asleep, looking left, right and up, surprised), aligned with the base portrait and differing from it only around
 * the face, so one replaces the other without a visible jump. This is the small state machine that picks the face:
 * pure but for its timers, which it owns and clears on dispose. The images themselves are loaded on demand
 * (color-mascot-faces.ts) and the events wired by use-mascot-face.ts.
 *
 * Priority, from the strongest: asleep, a short-lived expression (joy, surprise), a blink, the gaze, the base.
 */

export const FACE_VARIANTS = [
  "yeux-fermes",
  "joyeux",
  "endormi",
  "regard-gauche",
  "regard-droite",
  "regard-haut",
  "surpris",
] as const;
export type MascotFaceVariant = (typeof FACE_VARIANTS)[number];
export type MascotFace = "base" | MascotFaceVariant;
export type MascotGaze = "none" | "left" | "right" | "up";

export const FACE_TIMING = {
  /** A blink every 4 to 7 s, drawn at random each time. */
  blinkEvery: [4000, 7000],
  blink: 140,
  happy: 700,
  /** Woken by a click: a short surprise, then the base. */
  wakeSurprise: 400,
  surprise: 500,
  /** Without a pointer or a click on the companion for this long, it falls asleep. */
  sleepAfter: 60_000,
  /**
   * The pointer always reaches the companion before a click: a click this soon after the pointer woke it is the click
   * that woke it (surprise), not a later one (joy).
   */
  wakeByClickWithin: 600,
} as const;

const GAZE_FACE: Record<MascotGaze, MascotFace> = {
  none: "base",
  left: "regard-gauche",
  right: "regard-droite",
  up: "regard-haut",
};

/**
 * Where the companion looks, from the pointer's offset to its centre (dx to the right, dy downwards, in px). Close
 * (within `near`) or below: it looks at you, the base. Otherwise up, left or right, whichever dominates.
 */
export function gazeToward(dx: number, dy: number, near: number): MascotGaze {
  if (Math.hypot(dx, dy) <= near || dy >= Math.abs(dx)) {
    return "none";
  }
  if (-dy > Math.abs(dx)) {
    return "up";
  }
  return dx < 0 ? "left" : "right";
}

interface FaceState {
  asleep: boolean;
  blinking: boolean;
  flash: "joyeux" | "surpris" | null;
  gaze: MascotGaze;
}

export function faceOf(state: FaceState): MascotFace {
  if (state.asleep) {
    return "endormi";
  }
  if (state.flash) {
    return state.flash;
  }
  if (state.blinking) {
    return "yeux-fermes";
  }
  return GAZE_FACE[state.gaze];
}

type TimerName = "blink" | "blinkEnd" | "flash" | "justWoken" | "sleep";

export interface FaceMachine {
  /** A click on the companion: joy, or a surprise when it wakes it. */
  click(): void;
  dispose(): void;
  /** A double click: surprise. */
  doubleClick(): void;
  face(): MascotFace;
  /** Where the pointer is (gazeToward), or "none" when it has left the window. Does not wake it. */
  look(gaze: MascotGaze): void;
  /** Timers still pending: 0 once disposed. */
  pendingTimers(): number;
  /** The pointer on the companion: keeps it awake, wakes it without surprise. */
  touch(): void;
}

export function createFaceMachine(
  onFace: (face: MascotFace) => void,
  random: () => number = Math.random
): FaceMachine {
  const state: FaceState = {
    asleep: false,
    blinking: false,
    flash: null,
    gaze: "none",
  };
  const timers = new Map<TimerName, ReturnType<typeof setTimeout>>();
  let shown: MascotFace = "base";
  let disposed = false;
  let justWoken = false;

  const show = () => {
    const next = faceOf(state);
    if (next !== shown) {
      shown = next;
      onFace(next);
    }
  };
  const cancel = (name: TimerName) => {
    const id = timers.get(name);
    if (id !== undefined) {
      clearTimeout(id);
      timers.delete(name);
    }
  };
  const after = (name: TimerName, ms: number, run: () => void) => {
    cancel(name);
    timers.set(
      name,
      setTimeout(() => {
        timers.delete(name);
        run();
      }, ms)
    );
  };

  const scheduleBlink = () => {
    const [min, max] = FACE_TIMING.blinkEvery;
    after("blink", min + random() * (max - min), blink);
  };
  function blink() {
    if (!state.flash) {
      state.blinking = true;
      show();
      after("blinkEnd", FACE_TIMING.blink, () => {
        state.blinking = false;
        show();
      });
    }
    scheduleBlink();
  }
  const fallAsleep = () => {
    state.asleep = true;
    state.blinking = false;
    state.flash = null;
    cancel("blink");
    cancel("blinkEnd");
    cancel("flash");
    show();
  };
  /** Keeps it awake for another minute; true when it was asleep. */
  const stayAwake = () => {
    const wasAsleep = state.asleep;
    state.asleep = false;
    after("sleep", FACE_TIMING.sleepAfter, fallAsleep);
    if (wasAsleep) {
      scheduleBlink();
    }
    return wasAsleep;
  };
  const flash = (face: "joyeux" | "surpris", ms: number) => {
    state.flash = face;
    state.blinking = false;
    cancel("blinkEnd");
    after("flash", ms, () => {
      state.flash = null;
      show();
    });
    show();
  };

  stayAwake();
  scheduleBlink();

  return {
    click() {
      if (disposed) {
        return;
      }
      const woke = stayAwake() || justWoken;
      justWoken = false;
      cancel("justWoken");
      flash(
        woke ? "surpris" : "joyeux",
        woke ? FACE_TIMING.wakeSurprise : FACE_TIMING.happy
      );
    },
    dispose() {
      disposed = true;
      for (const id of timers.values()) {
        clearTimeout(id);
      }
      timers.clear();
    },
    doubleClick() {
      if (disposed) {
        return;
      }
      stayAwake();
      flash("surpris", FACE_TIMING.surprise);
    },
    face: () => shown,
    look(gaze) {
      if (disposed) {
        return;
      }
      state.gaze = gaze;
      show();
    },
    pendingTimers: () => timers.size,
    touch() {
      if (disposed) {
        return;
      }
      if (stayAwake()) {
        justWoken = true;
        after("justWoken", FACE_TIMING.wakeByClickWithin, () => {
          justWoken = false;
        });
      }
      show();
    },
  };
}
