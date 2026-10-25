// Dev server of the evaluation bench: the app's own Vite configuration, with
// "/" redirected to the bench page so the debug desktop window opens it.
import { mergeConfig, type ConfigEnv, type Plugin, type UserConfig } from "vite";
import appConfig from "../../vite.config";

const query = new URLSearchParams(
  Object.entries({
    cases: process.env.BAITARI_EVAL_CASES,
    out: process.env.BAITARI_EVAL_OUT,
    label: process.env.BAITARI_EVAL_LABEL,
    tasks: process.env.BAITARI_EVAL_TASKS,
    runs: process.env.BAITARI_EVAL_RUNS,
    public: process.env.BAITARI_EVAL_PUBLIC,
    sizes: process.env.BAITARI_EVAL_SIZES,
    setSizes: process.env.BAITARI_EVAL_SET_SIZES,
    onlySets: process.env.BAITARI_EVAL_ONLY_SETS,
    searchModel: process.env.BAITARI_EVAL_SEARCH_MODEL,
    skipSections: process.env.BAITARI_EVAL_SKIP_SECTIONS,
    dumpVectors: process.env.BAITARI_EVAL_DUMP_VECTORS,
    searchThreads: process.env.BAITARI_EVAL_SEARCH_THREADS,
    generator: process.env.BAITARI_EVAL_GENERATOR,
    runsA: process.env.BAITARI_EVAL_RUNS_A,
    dictation: process.env.BAITARI_EVAL_DICTATION,
    whisperThreads: process.env.BAITARI_EVAL_WHISPER_THREADS,
    runsDictation: process.env.BAITARI_EVAL_RUNS_DICTATION,
    parkSearch: process.env.BAITARI_EVAL_PARK_SEARCH,
    whisperFolders: process.env.BAITARI_EVAL_WHISPER_FOLDERS,
    whisperDevice: process.env.BAITARI_EVAL_WHISPER_DEVICE,
    whisperKeep: process.env.BAITARI_EVAL_WHISPER_KEEP,
    whisperDtype: process.env.BAITARI_EVAL_WHISPER_DTYPE,
    noteAfterPlan: process.env.BAITARI_EVAL_NOTE_AFTER_PLAN,
    segments: process.env.BAITARI_EVAL_SEGMENTS,
    loadDuringSpeech: process.env.BAITARI_EVAL_LOAD_DURING_SPEECH,
    reference: process.env.BAITARI_EVAL_REFERENCE,
    generators: process.env.BAITARI_EVAL_GENERATORS,
    variants: process.env.BAITARI_EVAL_VARIANTS,
    referenceCases: process.env.BAITARI_EVAL_REFERENCE_CASES,
  }).filter((entry): entry is [string, string] => Boolean(entry[1]))
).toString();

const benchEntry = (): Plugin => ({
  name: "baitari-eval-entry",
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      if (request.url !== "/" && request.url !== "/index.html") return next();
      response.statusCode = 302;
      response.setHeader("Location", `/scripts/eval-local-ai/eval.html?${query}`);
      response.end();
    });
  },
});

export default async (env: ConfigEnv) => {
  const base =
    typeof appConfig === "function"
      ? await (appConfig as (env: ConfigEnv) => UserConfig | Promise<UserConfig>)(env)
      : appConfig;
  return mergeConfig(base, { plugins: [benchEntry()] });
};
