// Configuration du projet, réduite aux bancs de ce dossier (hors de la suite npm test).
import { defineConfig, mergeConfig } from "vitest/config";
import base from "../../../../vite.config";

export default defineConfig((env) =>
  mergeConfig(base(env), {
    test: {
      include: ["docs/recus/2026-11-26-fondations/outils/*.banc.ts"],
      testTimeout: 3_600_000,
    },
  })
);
