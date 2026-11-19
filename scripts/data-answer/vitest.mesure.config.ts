// Runs only the Data Answer measures (*.mesure.ts), never picked up by `npm test`.
import { defineConfig, mergeConfig } from "vitest/config";
import appConfig from "../../vite.config";

export default defineConfig((env) =>
  mergeConfig(typeof appConfig === "function" ? appConfig(env) : appConfig, {
    test: { include: ["scripts/data-answer/**/*.mesure.ts"], exclude: [], testTimeout: 600_000 },
  })
);
