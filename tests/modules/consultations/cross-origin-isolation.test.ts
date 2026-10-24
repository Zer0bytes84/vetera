import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/modules/consultations/local-ai/models", () => ({
  getLocalModels: async () => ({ embeddingReady: true, root: "local" }),
  getLocalModelUrls: () => ({ modelRoot: "local/", runtimeRoot: "runtime/" }),
}));
const { arcticThreadCount } = await import("../../../src/modules/consultations/local-ai/embedding-store");
const { CROSS_ORIGIN_ISOLATION_HEADERS } = await import("../../../vite.config");

describe("Recherche locale multi-thread (A2, condition 1)", () => {
  it("prend la moitié des cœurs logiques, 4 au plus, 1 au moins", () => {
    expect([1, 2, 4, 6, 8, 12, 16].map((cores) => arcticThreadCount(cores))).toEqual([1, 1, 2, 3, 4, 4, 4]);
  });
  it("isole la page de la même façon en développement et dans l'app", () => {
    const tauri = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
    expect(tauri.app.security.headers).toEqual(CROSS_ORIGIN_ISOLATION_HEADERS);
    expect(CROSS_ORIGIN_ISOLATION_HEADERS).toEqual({
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    });
  });
});
