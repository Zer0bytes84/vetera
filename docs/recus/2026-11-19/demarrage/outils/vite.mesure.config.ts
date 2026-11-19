// Production build for the startup measurement: the app's own config, minified, React in production mode, with a
// manifest; the only change is import.meta.env.DEV forced to true so that the LicenseGate lets the browser in.
import { defineConfig, mergeConfig } from "vite";
import appConfig from "/home/parallels/work/demarrage-wt/vite.config";
export default defineConfig((env) => mergeConfig(typeof appConfig === "function" ? appConfig(env) : appConfig, {
  define: { "import.meta.env.DEV": "true" },
  build: { manifest: true },
}));
