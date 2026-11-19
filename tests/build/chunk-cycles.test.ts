import { generateKeyPairSync } from "node:crypto";
import { resolve } from "node:path";
import { build, type Rolldown } from "vite";
import { describe, expect, it } from "vitest";

/**
 * The 5.1.0 shipped with the patient record, Soins and Hospitalisation showing « Cette vue n’a pas pu être chargée »:
 * TypeError « require_get is not a function », thrown by the vendor-charts chunk. Recharts' own stack (es-toolkit,
 * Redux Toolkit, victory-vendor…) sat outside the vendor-charts group, in a chunk that imported vendor-charts while
 * vendor-charts imported it back. The record and Soins load that chunk first, so recharts ran before es-toolkit's
 * `get` existed. Only the bundled build shows it: these tests build the app in memory with the project's real
 * configuration (nothing is written) and look at the chunks.
 */

const ROOT = resolve(__dirname, "../..");

// Throwaway licence values: a production build refuses to start without a public HTTPS server and a P-256 key.
function throwawayLicenceEnv() {
  const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  process.env.VITE_LICENSE_SERVER_URL = "https://licence.example.com";
  process.env.VITE_LICENSE_PUBLIC_KEY = publicKey
    .export({ format: "der", type: "spki" })
    .toString("base64");
}

async function bundleChunks(): Promise<Rolldown.OutputChunk[]> {
  throwawayLicenceEnv();
  const result = await build({
    build: { minify: false, reportCompressedSize: false, write: false },
    configFile: resolve(ROOT, "vite.config.ts"),
    logLevel: "silent",
    mode: "production",
    root: ROOT,
  });
  const outputs = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
  return outputs
    .flatMap((output) => output.output)
    .filter((item): item is Rolldown.OutputChunk => item.type === "chunk");
}

/** Groups of chunks that import one another, directly or not (strongly connected components of more than one). */
function chunkCycles(chunks: Rolldown.OutputChunk[]): string[][] {
  const graph = new Map(chunks.map((chunk) => [chunk.fileName, chunk.imports]));
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycles: string[][] = [];
  let counter = 0;
  const visit = (node: string) => {
    index.set(node, counter);
    low.set(node, counter);
    counter++;
    stack.push(node);
    onStack.add(node);
    for (const next of graph.get(node) ?? []) {
      if (!graph.has(next)) {
        continue;
      }
      if (!index.has(next)) {
        visit(next);
        low.set(node, Math.min(low.get(node) ?? 0, low.get(next) ?? 0));
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node) ?? 0, index.get(next) ?? 0));
      }
    }
    if (low.get(node) === index.get(node)) {
      const component: string[] = [];
      let member: string | undefined;
      do {
        member = stack.pop();
        if (member) {
          onStack.delete(member);
          component.push(member);
        }
      } while (member && member !== node);
      if (component.length > 1) {
        cycles.push(component.sort());
      }
    }
  };
  for (const node of graph.keys()) {
    if (!index.has(node)) {
      visit(node);
    }
  }
  return cycles;
}

describe("le build de l’application : des morceaux sans import circulaire", () => {
  it(
    "aucun morceau n’importe, même indirectement, un morceau qui l’importe ; les graphiques restent hors du point d’entrée",
    async () => {
      const chunks = await bundleChunks();
      expect(chunks.length).toBeGreaterThan(10);
      expect(chunkCycles(chunks)).toEqual([]);

      const charts = chunks.find((chunk) => chunk.name === "vendor-charts");
      expect(charts, "le groupe vendor-charts existe").toBeDefined();
      // Recharts and the stack it runs on live in vendor-charts.
      const chartModules = Object.keys(charts?.modules ?? {});
      for (const library of ["recharts", "es-toolkit", "@reduxjs/toolkit", "victory-vendor"]) {
        expect(chartModules.some((id) => id.includes(`node_modules/${library}/`)), library).toBe(true);
      }
      // The entry does not load the charts: they still come on demand.
      const entries = chunks.filter((chunk) => chunk.isEntry);
      for (const entry of entries) {
        expect(entry.imports.some((file) => file === charts?.fileName)).toBe(false);
      }
    },
    180_000
  );
});
