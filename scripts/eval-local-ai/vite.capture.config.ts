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
  // "pre": in a production build (packaged app), the injected module is bundled too.
  transformIndexHtml: {
    order: "pre",
    handler: (html) =>
      html.replace(
        // Red console lines from the very first script on, read by the scenario.
        "<head>",
        `<head><script>window.__CAPTURE_ERRORS__=[];(()=>{const keep=(v)=>window.__CAPTURE_ERRORS__.push(v instanceof Error?v.message+"\\n"+(v.stack||""):typeof v==="string"?v:(()=>{try{return JSON.stringify(v)}catch{return String(v)}})());const error=console.error.bind(console);console.error=(...a)=>{keep(a.map((x)=>x instanceof Error?x.message+"\\n"+(x.stack||""):typeof x==="string"?x:(()=>{try{return JSON.stringify(x)}catch{return String(x)}})()).join(" "));error(...a)};addEventListener("error",(e)=>keep(e.error||e.message||("ressource : "+(e.target&&(e.target.src||e.target.href)))),true);addEventListener("unhandledrejection",(e)=>keep(e.reason));})();</script>`,
      ).replace(
        "</body>",
        `<script>window.__CAPTURE__=${JSON.stringify(capture)}</script><script type="module" src="/scripts/eval-local-ai/capture-scenario.ts"></script></body>`,
      ),
  },
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

// BAITARI_CAPTURE_NO_AEC=1: the measuring app plays the recordings through this
// Mac's own speakers, which macOS echo cancellation removes from the microphone
// by design. Measures only; the product keeps its echo cancellation.
const noEchoCancellation = (): Plugin => ({
  name: "baitari-capture-no-aec",
  enforce: "pre",
  transform: (code, id) =>
    process.env.BAITARI_CAPTURE_NO_AEC === "1" && id.endsWith("local-ai/audio-capture.ts")
      ? code.replace("echoCancellation: true", "echoCancellation: false")
      : undefined,
});

// BAITARI_CAPTURE_SAVE_DIR=<folder>: the native save panel is not driven. Its
// call is recorded in window.__CAPTURE_SAVES__ (the name it would propose) and
// answered with that name in <folder>, so the real export writes there.
const recordedSave = (): Plugin => ({
  name: "baitari-capture-recorded-save",
  enforce: "pre",
  transform: (code, id) =>
    process.env.BAITARI_CAPTURE_SAVE_DIR && id.includes("plugin-dialog") && code.includes("'plugin:dialog|save'")
      ? code.replace(
          "return await invoke('plugin:dialog|save', { options });",
          `const answered = ${JSON.stringify(process.env.BAITARI_CAPTURE_SAVE_DIR)} + "/" + options.defaultPath;
    (window.__CAPTURE_SAVES__ ??= []).push({ defaultPath: options.defaultPath, answered });
    return answered;`,
        )
      : undefined,
});

export default async (env: ConfigEnv) => {
  const base =
    typeof appConfig === "function"
      ? await (appConfig as (env: ConfigEnv) => UserConfig | Promise<UserConfig>)(env)
      : appConfig;
  return mergeConfig(base, { plugins: [scenario(), forcedRefusal(), noEchoCancellation(), recordedSave()] });
};
