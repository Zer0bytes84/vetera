/**
 * Warm-up of a freshly opened microphone. Measured on macOS (docs/recus/
 * 2026-10-29/diag-dictee): the first ~3.4 s of every new capture reach the page
 * 15 to 35 dB lower, then the whole signal, room noise included, steps up at
 * once and stays there. Listening is announced only after that step, read on
 * the recorded level itself; the delay is a fallback for an input that never
 * steps up.
 */
export const MICROPHONE_WARMUP = {
  /** Level windows, in seconds of recorded audio. */
  windowSeconds: 0.25,
  /** Rise over every earlier window that marks the end of the attenuation. */
  riseDb: 10,
  /** Without any rise by then, the input is taken as ready. */
  maxSeconds: 5,
};

export type WarmupResult =
  | { state: "warming" }
  | { state: "stable"; reason: "montée" | "délai"; at: number; referenceDb: number | null; levelDb: number };

const decibels = (energy: number) => 10 * Math.log10(Math.max(energy, 1e-12));

/**
 * Fed with the RMS of each recorded chunk and the recorded time at its end.
 * The first window (start-up transient, far below the room) is no reference,
 * nor the window just before a rise (the step may straddle it), nor the loudest
 * one once four are known; the rise must hold for two windows, so a single
 * click in the room is neither taken for the step nor allowed to hide it.
 */
export function createWarmupDetector(options = MICROPHONE_WARMUP) {
  let window = 0;
  let energy = 0;
  let chunks = 0;
  const levels: number[] = [];
  let result: WarmupResult = { state: "warming" };
  const close = (at: number) => {
    if (!chunks) return;
    const level = decibels(energy / chunks);
    energy = 0;
    chunks = 0;
    // Digital zeros before the first samples are not a level.
    if (level <= -119) return;
    levels.push(level);
    const count = levels.length;
    // Candidate: the window before this one; confirmed by this one.
    if (count < 5) return;
    // The loudest earlier window is set aside once there are enough of them:
    // one click in the room must not hide the step.
    const earlier = levels.slice(1, count - 3).sort((a, b) => b - a);
    const reference = earlier.length >= 4 ? earlier[1] : earlier[0];
    if (levels[count - 2] >= reference + options.riseDb && level >= reference + options.riseDb)
      result = { state: "stable", reason: "montée", at, referenceDb: reference, levelDb: level };
  };
  return {
    push(rms: number, seconds: number): WarmupResult {
      if (result.state === "stable") return result;
      const index = Math.floor(seconds / options.windowSeconds);
      if (index !== window) {
        close(seconds);
        window = index;
      }
      energy += rms * rms;
      chunks += 1;
      if (result.state === "warming" && seconds >= options.maxSeconds)
        result = {
          state: "stable",
          reason: "délai",
          at: seconds,
          referenceDb: levels.length > 1 ? Math.max(...levels.slice(1)) : null,
          levelDb: decibels(rms * rms),
        };
      return result;
    },
  };
}
