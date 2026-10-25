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
  generator: process.env.BAITARI_CAPTURE_GENERATOR,
};

const scenario = (): Plugin => ({
  name: "baitari-capture-scenario",
  transformIndexHtml: (html) =>
    html.replace(
      "</body>",
      `<script>window.__CAPTURE__=${JSON.stringify(capture)}</script><script type="module" src="/scripts/eval-local-ai/capture-scenario.ts"></script></body>`,
    ),
});

// BAITARI_CAPTURE_FORCE_REFUS=1: every generated note is refused by the fidelity
// check, to photograph the refusal screen and its way out. Captures only.
const forcedRefusal = (): Plugin => ({
  name: "baitari-capture-forced-refusal",
  // Before the TypeScript transform, which rewrites the matched signature.
  enforce: "pre",
  transform: (code, id) =>
    process.env.BAITARI_CAPTURE_FORCE_REFUS === "1" && id.endsWith("local-ai/dictation-scaffold.ts")
      ? code.replace(
          "export function assertFaithfulSoap(note: LocalSoapNote, source: LocalSoapNote) {",
          "export function assertFaithfulSoap(note: LocalSoapNote, source: LocalSoapNote) {\n  throw new SoapFidelityError();",
        )
      : undefined,
});

export default async (env: ConfigEnv) => {
  const base =
    typeof appConfig === "function"
      ? await (appConfig as (env: ConfigEnv) => UserConfig | Promise<UserConfig>)(env)
      : appConfig;
  return mergeConfig(base, { plugins: [scenario(), forcedRefusal()] });
};
