import { abortError } from "./inference-client";

export const MAX_RECORDING_SECONDS = 180;
/**
 * How long the microphone permission may stay unanswered (macOS waits for a
 * click that may never come) before the panel says what to do instead.
 */
export const MICROPHONE_PERMISSION_TIMEOUT_MS = 30_000;
const PERMISSION_STEPS =
  "Ouvrez Réglages Système → Confidentialité et sécurité → Microphone, autorisez Baitari, puis cliquez à nouveau sur Dicter.";
export const MICROPHONE_REFUSED = `L’accès au micro est refusé. ${PERMISSION_STEPS}`;
export const MICROPHONE_NO_ANSWER = `Baitari n’a pas reçu l’autorisation du micro. Si aucune fenêtre ne s’est affichée, ${PERMISSION_STEPS[0].toLowerCase()}${PERMISSION_STEPS.slice(1)}`;
export const WHISPER_SAMPLE_RATE = 16000;

export function normalizeMicrophoneAudio(input: Float32Array) {
  if (!input.length || input.some((sample) => !Number.isFinite(sample)))
    throw new Error(
      "Le signal du microphone est invalide. Réessayez la dictée."
    );
  let mean = 0;
  for (const sample of input) mean += sample / input.length;
  const centered = input.map((sample) => sample - mean);
  let peak = 0;
  for (const sample of centered) peak = Math.max(peak, Math.abs(sample));
  // Remove DC before testing silence; cap amplification so quiet noise is not
  // stretched to full volume. Preserve pauses and the complete recording.
  if (peak < 0.002)
    throw new Error("Aucun son détecté. Vérifiez le micro et réessayez.");
  const gain = Math.min(4, 0.8 / peak);
  return centered.map((sample) => sample * gain);
}

export function resampleAudio(
  input: Float32Array,
  sourceRate: number,
  targetRate = WHISPER_SAMPLE_RATE
) {
  if (
    !Number.isFinite(sourceRate) ||
    sourceRate <= 0 ||
    !Number.isFinite(targetRate) ||
    targetRate <= 0
  )
    throw new Error("Fréquence audio invalide.");
  if (sourceRate === targetRate) return input.slice();
  const length = Math.floor((input.length * targetRate) / sourceRate);
  const output = new Float32Array(length);
  const ratio = sourceRate / targetRate;
  // Box filtering for downsampling, avoiding a naive skipped-sample alias.
  for (let index = 0; index < length; index++) {
    const start = index * ratio,
      end = (index + 1) * ratio;
    let sum = 0,
      weight = 0;
    for (
      let sample = Math.floor(start);
      sample < Math.ceil(end) && sample < input.length;
      sample++
    ) {
      const overlap = Math.min(end, sample + 1) - Math.max(start, sample);
      if (overlap > 0) {
        sum += input[sample] * overlap;
        weight += overlap;
      }
    }
    output[index] = weight ? sum / weight : 0;
  }
  return output;
}
export async function prepareMicrophone(
  signal: AbortSignal,
  { permissionTimeoutMs = MICROPHONE_PERMISSION_TIMEOUT_MS } = {}
) {
  if (!navigator.mediaDevices?.getUserMedia)
    throw new Error(
      "Micro indisponible dans cette fenêtre. Ouvrez Baitari sur le bureau et vérifiez les autorisations du microphone."
    );
  // Resume while the initiating user gesture is still active, before a model
  // load can consume it. Capture itself begins only once Whisper is ready.
  const audio = typeof AudioContext === "function" ? new AudioContext() : null;
  if (audio) void audio.resume().catch(() => undefined);
  const closeAudio = () => {
    if (audio && audio.state !== "closed")
      void audio.close().catch(() => undefined);
  };
  let stream: MediaStream;
  try {
    // The permission request cannot be withdrawn: the wait ends on its answer,
    // on Annuler, or after the delay. A microphone granted too late is closed.
    stream = await new Promise<MediaStream>((resolve, reject) => {
      let settled = false;
      const settle = (finish: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        finish();
      };
      const onAbort = () => settle(() => reject(abortError()));
      const timer = setTimeout(
        () => settle(() => reject(new Error(MICROPHONE_NO_ANSWER))),
        permissionTimeoutMs
      );
      signal.addEventListener("abort", onAbort, { once: true });
      navigator.mediaDevices
        .getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: { ideal: WHISPER_SAMPLE_RATE },
            autoGainControl: false,
            echoCancellation: true,
            noiseSuppression: true,
          },
          video: false,
        })
        .then(
          (granted) => {
            if (settled) granted.getTracks().forEach((track) => track.stop());
            else settle(() => resolve(granted));
          },
          (error: unknown) => settle(() => reject(error))
        );
    });
  } catch (error) {
    closeAudio();
    if (signal.aborted) throw abortError();
    if (error instanceof Error && error.message === MICROPHONE_NO_ANSWER) throw error;
    const name = error instanceof DOMException ? error.name : "";
    throw new Error(
      name === "NotAllowedError" || name === "SecurityError"
        ? MICROPHONE_REFUSED
        : "Micro indisponible. Branchez un microphone et vérifiez qu’aucune autre application ne le bloque."
    );
  }
  if (signal.aborted) {
    stream.getTracks().forEach((track) => track.stop());
    closeAudio();
    throw abortError();
  }
  const stop = () => {
    stream.getTracks().forEach((track) => track.stop());
    closeAudio();
  };
  signal.addEventListener("abort", stop, { once: true });
  return {
    stream,
    audio,
    close: () => {
      signal.removeEventListener("abort", stop);
      stop();
    },
  };
}
/**
 * Loudness 0..1 from an RMS amplitude, for the recording indicator: about
 * -55 dBFS (a quiet room) reads 0, about -15 dBFS (a voice close by) reads 1.
 */
export function levelFromRms(rms: number) {
  if (!(rms > 0)) return 0;
  return Math.min(1, Math.max(0, (20 * Math.log10(rms) + 55) / 40));
}

/**
 * Reads the live microphone level from its own analyser, beside the
 * recording (a second source on the same stream; nothing is recorded here).
 */
export function createLevelMeter(audio: AudioContext | null, stream: MediaStream) {
  if (!audio || typeof audio.createAnalyser !== "function") return { read: () => 0, close: () => {} };
  const source = audio.createMediaStreamSource(stream);
  const analyser = audio.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const samples = new Float32Array(analyser.fftSize);
  return {
    read: () => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) sum += sample * sample;
      return levelFromRms(Math.sqrt(sum / samples.length));
    },
    close: () => source.disconnect(),
  };
}
export async function captureAudio(
  stream: MediaStream,
  signal: AbortSignal,
  onLimit: () => void,
  preparedAudio: AudioContext | null = null
) {
  if (!preparedAudio && typeof AudioContext !== "function")
    throw new Error(
      "La capture audio n’est pas disponible dans cette fenêtre."
    );
  const audio = preparedAudio ?? new AudioContext();
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  const buffers: Float32Array[] = [];
  let count = 0,
    stopped = false;
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    signal.removeEventListener("abort", cleanup);
    if (processor) {
      processor.onaudioprocess = null;
      processor.disconnect();
    }
    source?.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    if (audio.state !== "closed") void audio.close().catch(() => undefined);
  };
  try {
    await audio.resume();
    if (signal.aborted) throw abortError();
    if (audio.state !== "running")
      throw new Error(
        "Le micro est prêt mais l’audio est suspendu. Cliquez à nouveau sur Dicter."
      );
    source = audio.createMediaStreamSource(stream);
    // A single small PCM buffer. Compatible with WKWebView; inference runs in
    // a worker, so the callback does no inference or persistence.
    processor = audio.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => {
      if (stopped) return;
      const room = MAX_RECORDING_SECONDS * audio.sampleRate - count;
      if (room <= 0) {
        onLimit();
        return;
      }
      const chunk = event.inputBuffer.getChannelData(0).slice(0, room);
      buffers.push(chunk);
      count += chunk.length;
      if (count >= MAX_RECORDING_SECONDS * audio.sampleRate) onLimit();
    };
    source.connect(processor);
    processor.connect(audio.destination);
    signal.addEventListener("abort", cleanup, { once: true });
    return {
      cancel: cleanup,
      stop: () => {
        cleanup();
        const pcm = new Float32Array(count);
        let offset = 0;
        buffers.forEach((buffer) => {
          pcm.set(buffer, offset);
          offset += buffer.length;
        });
        buffers.length = 0;
        if (pcm.length < audio.sampleRate * 0.4)
          throw new Error(
            "La dictée est trop courte. Parlez quelques secondes puis arrêtez le micro."
          );
        return normalizeMicrophoneAudio(resampleAudio(pcm, audio.sampleRate));
      },
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}
