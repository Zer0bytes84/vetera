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
