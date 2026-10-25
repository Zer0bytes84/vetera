// Dictation bench: the real Whisper worker, loaded and used exactly as the
// consultation screen does (one session per dictation: load, transcribe, close),
// on recorded WAV files (16 kHz mono float32). Measures load and transcription
// separately, the first dictation after opening apart from the next ones.
import { readFile } from "@tauri-apps/plugin-fs";
import { LocalInferenceSession } from "@/modules/consultations/local-ai/inference-client";
import { getLocalModelUrls, type LocalModelStatus } from "@/modules/consultations/local-ai/models";
import { embedTexts } from "@/modules/consultations/local-ai/embedding-store";
import {
  parkWhisperSession,
  releaseWhisperSession,
  takeWhisperSession,
} from "@/modules/consultations/local-ai/whisper-session";
import type { LocalAiProgress } from "@/modules/consultations/local-ai/worker-protocol";

const seconds = (from: number) => +((performance.now() - from) / 1000).toFixed(2);

/** Samples of a WAVE file whose data chunk is 32-bit float, 16 kHz, mono. */
export function wavSamples(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  let rate = 0;
  while (offset + 8 <= bytes.byteLength) {
    const id = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (id === "fmt ") rate = view.getUint32(offset + 12, true);
    if (id === "data") {
      if (rate !== 16000) throw new Error(`Fréquence ${rate} Hz : 16 kHz attendus.`);
      return new Float32Array(bytes.slice(offset + 8, offset + 8 + size).buffer);
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error("Fichier WAVE sans données.");
}

const words = (text: string) =>
  (
    text
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLocaleLowerCase("fr-FR")
      .match(/\d+(?:[.,]\d+)?|\p{L}+/gu) ?? []
  ).map((token) => token.replace(",", "."));

/** Word error rate (edit distance over words), same normalization on both sides. */
export function wordErrorRate(reference: string, hypothesis: string) {
  const a = words(reference);
  const b = words(hypothesis);
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++)
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    previous = current;
  }
  return +(previous[b.length] / Math.max(1, a.length)).toFixed(3);
}

/** Numbers of the reference text missing from the transcription. */
export function missingNumbers(reference: string, hypothesis: string) {
  const found = new Set(words(hypothesis));
  return words(reference).filter((token) => /^\d/.test(token) && !found.has(token));
}

export interface DictationClip {
  name: string;
  wav: string;
  text: string;
}

export async function runDictation(
  models: LocalModelStatus,
  clips: DictationClip[],
  options: { threads: number[]; runs: number; parkSearch: boolean; folders: string[]; device?: "wasm" | "webgpu"; keep?: boolean },
  log: (line: string) => void,
  // Each row as soon as it is measured: a crash of the page keeps what was measured.
  save: (row: unknown) => Promise<void>,
) {
  const urls = getLocalModelUrls(models);
  const rows: unknown[] = [];
  let order = 0;
  for (const folder of options.folders)
  for (const threads of options.threads)
    for (let run = 1; run <= options.runs; run++)
      for (const clip of clips) {
        order++;
        if (options.parkSearch && models.embeddingReady) {
          // Leaves the search model parked (kept loaded, lease given back), as after a search.
          await embedTexts(models, ["otite"], new AbortController().signal, () => {}, true);
        }
        const audio = wavSamples(await readFile(clip.wav));
        const audioSeconds = +(audio.length / 16000).toFixed(1);
        const marks: Record<string, number> = {};
        const started = performance.now();
        const onProgress = (event: LocalAiProgress) => {
          if (event.characters && !("firstText" in marks)) marks.firstText = seconds(started);
        };
        // keep: the screen's path since 2026-10-25 (model parked between dictations).
        const key = `${folder}#${threads}`;
        const taken = options.keep
          ? await takeWhisperSession(key, new AbortController().signal, onProgress)
          : { session: await LocalInferenceSession.create("whisper", new AbortController().signal, onProgress), loaded: false };
        const session = taken.session;
        let parked = false;
        try {
          const ready = taken.loaded
            ? ({ type: "ready", threads } as const)
            : await session.request({ type: "load-whisper", ...urls, threads, folder, device: options.device }, "ready");
          const loadSeconds = seconds(started);
          const transcribeStart = performance.now();
          const result = await session.request({ type: "transcribe", audio, language: "fr", keep: options.keep }, "transcript", [audio.buffer]);
          const transcribeSeconds = seconds(transcribeStart);
          const text = result.type === "transcript" ? result.text : "";
          const row = {
            order,
            folder,
            device: options.device ?? "wasm",
            clip: clip.name,
            audioSeconds,
            threadsAsked: threads,
            threads: ready.type === "ready" ? (ready.threads ?? 1) : null,
            run,
            parkSearch: options.parkSearch,
            loadSeconds,
            firstTextSeconds: marks.firstText !== undefined ? +(marks.firstText - loadSeconds).toFixed(2) : null,
            transcribeSeconds,
            realTimeFactor: +(transcribeSeconds / audioSeconds).toFixed(2),
            wordErrorRate: wordErrorRate(clip.text, text),
            missingNumbers: missingNumbers(clip.text, text),
            text,
          };
          if (options.keep) {
            parkWhisperSession(session, key);
            parked = true;
          }
          rows.push(row);
          await save(row);
          log(`dictée ${folder} ${clip.name} (${audioSeconds} s) · ${row.threads} thread(s) · essai ${run} : chargement ${loadSeconds} s, transcription ${transcribeSeconds} s (×${row.realTimeFactor}), WER ${row.wordErrorRate}, chiffres manquants ${JSON.stringify(row.missingNumbers)}`);
        } catch (error) {
          rows.push({ order, clip: clip.name, threadsAsked: threads, run, error: error instanceof Error ? error.message : String(error) });
          log(`dictée ${clip.name} : échec ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          if (!parked) session.close();
        }
      }
  releaseWhisperSession();
  return rows;
}
