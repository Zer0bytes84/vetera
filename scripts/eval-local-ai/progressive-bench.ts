// Transcription during the dictation, on the bench: the recording is replayed
// in real time (a segment exists only once it has been "spoken"), cut on a
// silence after a target length, and each segment is transcribed by the real
// Whisper worker while the speech goes on. Measures what the vet would wait
// after the last word, and keeps every segment's text to track lost,
// doubled or fused words at the cuts.
import { readFile } from "@tauri-apps/plugin-fs";
import { getLocalModelUrls, type LocalModelStatus } from "@/modules/consultations/local-ai/models";
import { embedTexts } from "@/modules/consultations/local-ai/embedding-store";
import {
  parkWhisperSession,
  releaseWhisperSession,
  takeWhisperSession,
} from "@/modules/consultations/local-ai/whisper-session";
import { missingNumbers, wavSamples, wordErrorRate, type DictationClip } from "./dictation-bench";

const RATE = 16000;
const sleepUntil = (time: number) => new Promise((resolve) => setTimeout(resolve, Math.max(0, time - performance.now())));
const round = (value: number) => +value.toFixed(2);

/**
 * Cut points: after each target length, the quietest 20 ms frame between 1.5 s
 * before and 0.5 s after the target (the cut needs that much audio heard).
 */
export function silenceCuts(audio: Float32Array, targetSeconds: number) {
  const frame = RATE / 50;
  const energy = (start: number) => {
    let sum = 0;
    for (let i = start; i < start + frame && i < audio.length; i++) sum += audio[i] * audio[i];
    return sum;
  };
  const cuts: number[] = [];
  let last = 0;
  for (;;) {
    const target = last + targetSeconds * RATE;
    // The tail shorter than half a second joins the last segment.
    if (target + 0.5 * RATE >= audio.length) break;
    let best = target;
    let bestEnergy = Infinity;
    for (let start = target - 1.5 * RATE; start + frame <= target + 0.5 * RATE; start += frame) {
      const value = energy(start);
      if (value <= bestEnergy) {
        bestEnergy = value;
        best = start + frame / 2;
      }
    }
    cuts.push(Math.round(best));
    last = Math.round(best);
  }
  return cuts;
}

export async function runProgressive(
  models: LocalModelStatus,
  clips: DictationClip[],
  options: { segments: number[]; threads: number; realUse: boolean; loadDuringSpeech: boolean },
  log: (line: string) => void,
  save: (row: unknown) => Promise<void>,
  afterClip?: (clip: DictationClip) => Promise<void>,
) {
  const urls = getLocalModelUrls(models);
  const key = `whisper#${options.threads}`;
  for (const segmentSeconds of options.segments)
    for (const clip of clips) {
      if (options.realUse && models.embeddingReady)
        // As after a search in the consultation: the search model stays parked and evicts Whisper.
        await embedTexts(models, ["otite"], new AbortController().signal, () => {}, true);
      const audio = wavSamples(await readFile(clip.wav));
      const duration = audio.length / RATE;
      const cuts = silenceCuts(audio, segmentSeconds);
      const bounds = [0, ...cuts, audio.length];
      const clickedAt = performance.now();
      const taken = await takeWhisperSession(key, new AbortController().signal, () => {});
      const session = taken.session;
      const loading = taken.loaded
        ? Promise.resolve()
        : session.request({ type: "load-whisper", ...urls, threads: options.threads }, "ready").then(() => undefined);
      // Today the microphone opens once the model is loaded; with loadDuringSpeech it opens at once.
      if (!options.loadDuringSpeech) await loading;
      const speechStart = performance.now();
      const loadSeconds = round((performance.now() - clickedAt) / 1000);
      const heardAt = (sample: number) => speechStart + (sample / RATE) * 1000;
      const segments: { from: number; to: number; queuedAt: number; startedAt: number; doneAt: number; text: string }[] = [];
      let chain: Promise<void> = loading;
      let failure: string | null = null;
      try {
        for (let index = 0; index < bounds.length - 1; index++) {
          const from = bounds[index];
          const to = bounds[index + 1];
          // A cut is chosen once 0.5 s past its target has been heard; the last segment waits for the end.
          await sleepUntil(heardAt(index === bounds.length - 2 ? audio.length : Math.min(audio.length, from + (segmentSeconds + 0.5) * RATE)));
          const queuedAt = performance.now();
          const piece = audio.slice(from, to);
          chain = chain.then(async () => {
            const startedAt = performance.now();
            const result = await session.request({ type: "transcribe", audio: piece, language: "fr", keep: true }, "transcript", [piece.buffer]);
            segments.push({ from, to, queuedAt, startedAt, doneAt: performance.now(), text: result.type === "transcript" ? result.text : "" });
          });
        }
        await chain;
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error);
      }
      const endOfSpeech = heardAt(audio.length);
      const text = segments.map((segment) => segment.text.trim()).join(" ");
      const row = {
        clip: clip.name,
        audioSeconds: round(duration),
        segmentSeconds,
        realUse: options.realUse,
        loadDuringSpeech: options.loadDuringSpeech,
        resumed: taken.loaded,
        loadSeconds,
        // What the vet waits after the last word, before the whole text is there.
        waitAfterSpeech: failure ? null : round((Math.max(...segments.map((segment) => segment.doneAt)) - endOfSpeech) / 1000),
        segments: segments.map((segment) => ({
          from: round(segment.from / RATE),
          to: round(segment.to / RATE),
          // Seconds after the start of speech.
          queued: round((segment.queuedAt - speechStart) / 1000),
          started: round((segment.startedAt - speechStart) / 1000),
          done: round((segment.doneAt - speechStart) / 1000),
          compute: round((segment.doneAt - segment.startedAt) / 1000),
          text: segment.text,
        })),
        wordErrorRate: wordErrorRate(clip.text, text),
        missingNumbers: missingNumbers(clip.text, text),
        text,
        ...(failure ? { error: failure } : {}),
      };
      if (failure) session.close();
      else parkWhisperSession(session, key);
      await save(row);
      log(`progressif ${clip.name} (${round(duration)} s) · segments de ${segmentSeconds} s (${segments.length}) : attente après la parole ${row.waitAfterSpeech} s, WER ${row.wordErrorRate}, chiffres manquants ${JSON.stringify(row.missingNumbers)}${failure ? `, échec ${failure}` : ""}`);
      await afterClip?.(clip);
    }
  releaseWhisperSession();
}
