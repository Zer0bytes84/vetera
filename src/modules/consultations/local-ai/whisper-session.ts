import { LocalInferenceSession } from "./inference-client";
import type { LocalAiProgress } from "./worker-protocol";

// The rubrics of one consultation are dictated a few minutes apart: the loaded
// dictation model is kept between them instead of being reloaded each time
// (13 to 36 s for Whisper medium on an M1 with 8 GB, measured 2026-10-25).
// Like the search model, the idle model holds no lease: a note, a search or a
// document reading evicts it before starting, and it is freed after a delay.
const WHISPER_IDLE_MS = 300_000;
let idleWhisper: {
  session: LocalInferenceSession;
  key: string;
  timer: ReturnType<typeof setTimeout>;
} | null = null;

/** A parked session with the same model and threads, resumed; otherwise a new one to load. */
export async function takeWhisperSession(
  key: string,
  signal: AbortSignal,
  onProgress: (event: LocalAiProgress) => void
) {
  const idle = idleWhisper;
  idleWhisper = null;
  if (idle) {
    clearTimeout(idle.timer);
    if (!idle.session.isClosed && idle.key === key) {
      try {
        idle.session.resume(signal, onProgress);
      } catch (error) {
        idle.session.close();
        throw error;
      }
      return { session: idle.session, loaded: true };
    }
    idle.session.close();
  }
  const session = await LocalInferenceSession.create("whisper", signal, onProgress);
  return { session, loaded: false };
}

/** Keeps the loaded model for the next dictation, without its lease. */
export function parkWhisperSession(session: LocalInferenceSession, key: string) {
  idleWhisper?.session.close();
  session.park();
  if (session.isClosed) return;
  const timer = setTimeout(() => {
    if (idleWhisper?.session === session) idleWhisper = null;
    session.close();
  }, WHISPER_IDLE_MS);
  idleWhisper = { session, key, timer };
}

/** Frees the kept model now (the assistant is closed). */
export function releaseWhisperSession() {
  const idle = idleWhisper;
  idleWhisper = null;
  if (!idle) return;
  clearTimeout(idle.timer);
  idle.session.close();
}
