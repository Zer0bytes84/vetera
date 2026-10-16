/// <reference lib="webworker" />
import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import { enforceOfflineWorker } from "../local-ai/offline-policy";
import { selectWhisperLanguage } from "../local-ai/whisper-language";
import type {
  WorkerRequest,
  WorkerResponse,
} from "../local-ai/worker-protocol";

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
const send = (message: WorkerResponse) => self.postMessage(message);
self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    if (data.type === "load-whisper") {
      enforceOfflineWorker([data.modelRoot, data.runtimeRoot]);
      const { env, pipeline } = await import("@huggingface/transformers");
      env.allowRemoteModels = false;
      env.allowLocalModels = true;
      env.useBrowserCache = false;
      env.useFSCache = false;
      env.localModelPath = data.modelRoot;
      const wasm = env.backends.onnx.wasm;
      if (!wasm) throw new Error("Runtime WASM indisponible.");
      wasm.wasmPaths = `${data.runtimeRoot}onnx/`;
      wasm.numThreads = 1;
      wasm.proxy = false;
      send({
        type: "progress",
        message: "Chargement de la dictée depuis cet ordinateur…",
      });
      // Narrow the overloaded generic API to this one task to keep TS tractable.
      const createTranscriber = pipeline as (
        task: "automatic-speech-recognition",
        model: string,
        options: import("@huggingface/transformers").PretrainedModelOptions
      ) => Promise<AutomaticSpeechRecognitionPipeline>;
      transcriber = await createTranscriber(
        "automatic-speech-recognition",
        "whisper",
        {
          device: "wasm",
          dtype: "q8",
          local_files_only: true,
          progress_callback: (event) => {
            if (event.status === "progress")
              send({
                type: "progress",
                message: "Chargement de la dictée depuis cet ordinateur…",
                progress: event.progress / 100,
              });
          },
        }
      );
      send({ type: "ready" });
    } else if (data.type === "transcribe") {
      if (!transcriber) throw new Error("Whisper n’est pas chargé.");
      const { Tensor, WhisperTextStreamer } = await import(
        "@huggingface/transformers"
      );
      let language = "fr";
      if (data.language === "auto") {
        send({
          type: "progress",
          message: "Reconnaissance locale de la langue…",
        });
        const features = await transcriber.processor(
          data.audio.subarray(0, 30 * 16000)
        );
        const model = transcriber.model;
        const config = model.generation_config as unknown as {
          lang_to_id: Record<string, number>;
          decoder_start_token_id: number;
        } | null;
        if (
          !config?.lang_to_id ||
          !Number.isInteger(config.decoder_start_token_id)
        )
          throw new Error(
            "La langue n’a pas pu être reconnue. Choisissez Français et réessayez."
          );
        const detected = await model({
          ...features,
          decoder_input_ids: new Tensor(
            "int64",
            [BigInt(config.decoder_start_token_id)],
            [1, 1]
          ),
        });
        language = selectWhisperLanguage(
          detected.logits.data,
          config.lang_to_id
        );
      }
      let characters = 0;
      const streamer = new WhisperTextStreamer(
        transcriber.tokenizer as import("@huggingface/transformers").WhisperTokenizer,
        {
          skip_prompt: true,
          skip_special_tokens: true,
          callback_function: (text) => {
            characters += text.length;
            send({
              type: "progress",
              message: "Transcription locale en cours…",
              characters,
            });
          },
        }
      );
      send({ type: "progress", message: "Transcription locale en cours…" });
      const result = await transcriber(data.audio, {
        language,
        task: "transcribe",
        do_sample: false,
        chunk_length_s: 30,
        stride_length_s: 5,
        streamer,
      });
      const text =
        (Array.isArray(result) ? result[0]?.text : result.text)?.trim() ?? "";
      if (!text)
        throw new Error(
          "Aucune parole reconnue. Vérifiez le micro et réessayez."
        );
      // Complete disposal before acknowledging the result. The client also
      // terminates this worker before any generation worker may start.
      await transcriber.dispose();
      transcriber = null;
      send({ type: "transcript", text, language });
    } else if (data.type === "dispose") {
      await transcriber?.dispose();
      transcriber = null;
      send({ type: "disposed" });
    }
  } catch (error) {
    await transcriber?.dispose().catch(() => undefined);
    transcriber = null;
    const message =
      error instanceof Error &&
      /Aucune parole|langue n’a pas/.test(error.message)
        ? error.message
        : data.type === "load-whisper"
          ? "La dictée n’a pas pu être chargée. Vérifiez les fichiers installés sur cet ordinateur."
          : "Échec de transcription. Le son n’a pas été reconnu ; vérifiez le micro puis réessayez.";
    send({ type: "error", message });
  }
};
