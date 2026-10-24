// Dev server for screenshots: the app's own Vite configuration, plus a capture
// scenario injected into index.html (never part of the production bundle).
import { mergeConfig, type ConfigEnv, type Plugin, type UserConfig } from "vite";
import appConfig from "../../vite.config";

const capture = {
  scenario: process.env.BAITARI_CAPTURE_SCENARIO ?? "palette",
  theme: process.env.BAITARI_CAPTURE_THEME ?? "light",
  generation: process.env.BAITARI_CAPTURE_GENERATION ?? "sections",
  query: process.env.BAITARI_CAPTURE_QUERY ?? "",
  patientId: process.env.BAITARI_CAPTURE_PATIENT,
  signal: process.env.BAITARI_CAPTURE_SIGNAL ?? "",
  toggle: process.env.BAITARI_CAPTURE_TOGGLE,
};

const scenario = (): Plugin => ({
  name: "baitari-capture-scenario",
  transformIndexHtml: (html) =>
    html.replace(
      "</body>",
      `<script>window.__CAPTURE__=${JSON.stringify(capture)}</script><script type="module" src="/scripts/eval-local-ai/capture-scenario.ts"></script></body>`,
    ),
});

export default async (env: ConfigEnv) => {
  const base =
    typeof appConfig === "function"
      ? await (appConfig as (env: ConfigEnv) => UserConfig | Promise<UserConfig>)(env)
      : appConfig;
  return mergeConfig(base, { plugins: [scenario()] });
};
