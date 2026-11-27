import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFaceMachine,
  FACE_TIMING,
  gazeToward,
  type MascotFace,
} from "@/components/mascot/mascot-face";

// The living face of the colour companion: which expression, when, and for how long; every timer cleared on dispose.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function machine(random = () => 0) {
  const shown: MascotFace[] = [];
  const face = createFaceMachine((next) => shown.push(next), random);
  return { face, shown };
}

describe("gazeToward", () => {
  it("looks at you when the pointer is close, below or absent", () => {
    expect(gazeToward(10, -10, 40)).toBe("none");
    expect(gazeToward(30, 400, 40)).toBe("none");
    expect(gazeToward(-200, 300, 40)).toBe("none");
  });
  it("looks up, left or right, whichever dominates", () => {
    expect(gazeToward(20, -300, 40)).toBe("up");
    expect(gazeToward(-300, -20, 40)).toBe("left");
    expect(gazeToward(600, 400, 40)).toBe("right");
    expect(gazeToward(-600, 100, 40)).toBe("left");
  });
});

describe("createFaceMachine", () => {
  it("blinks every 4 to 7 s at random, eyes shut for 140 ms, then back to the face it had", () => {
    let draw = 0;
    const { face, shown } = machine(() => [0, 1, 0.5][draw++ % 3]);
    face.look("right");
    expect(face.face()).toBe("regard-droite");
    vi.advanceTimersByTime(3999);
    expect(face.face()).toBe("regard-droite");
    vi.advanceTimersByTime(1);
    expect(face.face()).toBe("yeux-fermes");
    vi.advanceTimersByTime(FACE_TIMING.blink);
    expect(face.face()).toBe("regard-droite");
    // Next one 7 s after the first, then 5.5 s.
    vi.advanceTimersByTime(7000 - FACE_TIMING.blink - 1);
    expect(face.face()).toBe("regard-droite");
    vi.advanceTimersByTime(1);
    expect(face.face()).toBe("yeux-fermes");
    vi.advanceTimersByTime(5500);
    expect(shown.filter((f) => f === "yeux-fermes")).toHaveLength(3);
    face.dispose();
  });

  it("is joyful for 700 ms after a click, then back", () => {
    const { face } = machine();
    face.click();
    expect(face.face()).toBe("joyeux");
    vi.advanceTimersByTime(FACE_TIMING.happy - 1);
    expect(face.face()).toBe("joyeux");
    vi.advanceTimersByTime(1);
    expect(face.face()).toBe("base");
    face.dispose();
  });

  it("does not blink over joy", () => {
    const { face } = machine();
    vi.advanceTimersByTime(3900);
    face.click();
    vi.advanceTimersByTime(200);
    expect(face.face()).toBe("joyeux");
    face.dispose();
  });

  it("is surprised for 500 ms after a double click", () => {
    const { face } = machine();
    face.doubleClick();
    expect(face.face()).toBe("surpris");
    vi.advanceTimersByTime(FACE_TIMING.surprise);
    expect(face.face()).toBe("base");
    face.dispose();
  });

  it("falls asleep after 60 s without pointer or click on it, and stops blinking", () => {
    const { face, shown } = machine();
    face.look("left");
    vi.advanceTimersByTime(FACE_TIMING.sleepAfter);
    expect(face.face()).toBe("endormi");
    const before = shown.length;
    vi.advanceTimersByTime(60_000);
    expect(shown.length).toBe(before);
    // The pointer moving elsewhere does not wake it.
    face.look("right");
    expect(face.face()).toBe("endormi");
    expect(face.pendingTimers()).toBe(0);
    face.dispose();
  });

  it("stays awake while the pointer visits it", () => {
    const { face } = machine();
    vi.advanceTimersByTime(50_000);
    face.touch();
    vi.advanceTimersByTime(50_000);
    expect(face.face()).not.toBe("endormi");
    face.dispose();
  });

  it("wakes at the pointer without surprise, and resumes blinking", () => {
    const { face } = machine();
    face.look("up");
    vi.advanceTimersByTime(FACE_TIMING.sleepAfter);
    face.touch();
    expect(face.face()).toBe("regard-haut");
    vi.advanceTimersByTime(4000);
    expect(face.face()).toBe("yeux-fermes");
    face.dispose();
  });

  it("wakes at a click surprised for 400 ms, then the base", () => {
    const { face } = machine();
    vi.advanceTimersByTime(FACE_TIMING.sleepAfter);
    face.click();
    expect(face.face()).toBe("surpris");
    vi.advanceTimersByTime(FACE_TIMING.wakeSurprise);
    expect(face.face()).toBe("base");
    face.dispose();
  });

  it("takes a click right after the pointer woke it as the click that woke it", () => {
    const { face } = machine();
    vi.advanceTimersByTime(FACE_TIMING.sleepAfter);
    face.touch();
    expect(face.face()).toBe("base");
    vi.advanceTimersByTime(FACE_TIMING.wakeByClickWithin - 100);
    face.click();
    expect(face.face()).toBe("surpris");
    vi.advanceTimersByTime(FACE_TIMING.wakeSurprise);
    expect(face.face()).toBe("base");
    face.dispose();
  });

  it("is joyful at a click once it has been awake a moment", () => {
    const { face } = machine();
    vi.advanceTimersByTime(FACE_TIMING.sleepAfter);
    face.touch();
    vi.advanceTimersByTime(FACE_TIMING.wakeByClickWithin);
    face.click();
    expect(face.face()).toBe("joyeux");
    face.dispose();
  });

  it("leaves no timer behind once disposed, and ignores what comes after", () => {
    const { face, shown } = machine();
    face.click();
    vi.advanceTimersByTime(4000);
    expect(face.pendingTimers()).toBeGreaterThan(0);
    face.dispose();
    expect(face.pendingTimers()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    const before = shown.length;
    face.click();
    face.look("left");
    vi.advanceTimersByTime(120_000);
    expect(shown.length).toBe(before);
  });
});
