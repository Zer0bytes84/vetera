import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

// Inspect the real production dependency graph, including static imports.
// Dynamic routes remain excluded until the user opens them.
const dist = resolve(import.meta.dirname, "../dist");
const manifest = JSON.parse(readFileSync(resolve(dist, ".vite/manifest.json"), "utf8"));
const visited = new Set();
function visit(key) {
  if (visited.has(key)) return;
  visited.add(key);
  for (const dependency of manifest[key].imports ?? []) visit(dependency);
}
for (const [key, chunk] of Object.entries(manifest)) if (chunk.isEntry) visit(key);
let bytes = 0;
let gzip = 0;
for (const key of visited) {
  const file = manifest[key].file;
  if (!file.endsWith(".js")) continue;
  if (/vendor-(?:pdf|editor|llm|charts)/.test(file)) {
    throw new Error(`Heavy optional library preloaded at startup: ${file}`);
  }
  const content = readFileSync(resolve(dist, file));
  bytes += content.length;
  gzip += gzipSync(content).length;
}
console.log(`Startup JavaScript: ${(bytes / 1000).toFixed(1)} kB; ${(gzip / 1000).toFixed(1)} kB gzip.`);
if (gzip > 300_000) throw new Error("Startup JavaScript exceeds the 300 kB gzip budget.");
