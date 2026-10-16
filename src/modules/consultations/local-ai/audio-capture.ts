import { abortError } from "./inference-client";

export const MAX_RECORDING_SECONDS = 180;
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
export async function prepareMicrophone(signal: AbortSignal) {
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
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: { ideal: WHISPER_SAMPLE_RATE },
        autoGainControl: false,
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    });
  } catch (error) {
    closeAudio();
    if (signal.aborted) throw abortError();
    const name = error instanceof DOMException ? error.name : "";
    throw new Error(
      name === "NotAllowedError" || name === "SecurityError"
        ? "L’accès au micro est refusé. Autorisez Baitari dans les réglages Confidentialité → Microphone."
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
