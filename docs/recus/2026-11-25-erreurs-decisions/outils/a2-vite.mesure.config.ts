// Assemblage de production, plus un relevé : pour chaque morceau JS, l'ordre de ses modules (l'ordre d'exécution) et
// ses imports ; pour chaque feuille CSS, son contenu. Les noms sont débarrassés de leur empreinte.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, mergeConfig, type Plugin } from "vite";
import base from "./vite.config";

const OUT = process.env.A2_OUT ?? "/tmp/claude-0/a2/releve";
const root = process.cwd();
const bare = (f: string) => f.replace(/-[A-Za-z0-9_-]{8}(?=\.(js|css|mjs)$)/, "");
const rel = (id: string) => (id.startsWith(root) ? path.relative(root, id) : id).replace(/\0/g, "\\0");

// Les assemblages des workers (construits pendant l'assemblage principal) s'ajoutent au même relevé.
const chunks: Record<string, unknown> = {};
const css: Record<string, string> = {};
const releve = (kind: "page" | "worker"): Plugin => ({
  name: "a2-releve",
  generateBundle(_o, bundle) {
    // Un worker est assemblé à part : ses morceaux sont rangés sous le nom de son entrée.
    const entry = Object.values(bundle).find((i) => i.type === "chunk" && i.isEntry);
    const prefix = kind === "worker" ? `worker(${entry ? bare(entry.fileName) : "?"}):` : "";
    mkdirSync(`${OUT}/css`, { recursive: true });
    for (const item of Object.values(bundle)) {
      if (item.type === "chunk") {
        const key = `${prefix}${bare(item.fileName)}|${rel(item.facadeModuleId ?? item.moduleIds[0] ?? "")}`;
        if (key in chunks) throw new Error(`clé en double : ${key}`);
        chunks[key] = {
          entree: item.isEntry,
          dynamique: item.isDynamicEntry,
          modules: item.moduleIds.map(rel),
          imports: item.imports.map(bare),
          importsDynamiques: item.dynamicImports.map(bare),
          texte: createHash("sha256").update(item.code.replace(/-[A-Za-z0-9_-]{8}\.(js|css|mjs)/g, ".$1")).digest("hex").slice(0, 16),
          css: [...((item as { viteMetadata?: { importedCss: Set<string> } }).viteMetadata?.importedCss ?? [])].map(bare),
        };
      } else if (item.fileName.endsWith(".css")) {
        const src = typeof item.source === "string" ? item.source : Buffer.from(item.source).toString("utf8");
        const key = `${prefix}${bare(item.fileName)}`;
        if (key in css) throw new Error(`clé en double : ${key}`);
        css[key] = createHash("sha256").update(src).digest("hex").slice(0, 16);
        writeFileSync(`${OUT}/css/${bare(item.fileName).replace(/\//g, "_")}`, src);
      }
    }
    if (kind === "page") writeFileSync(`${OUT}/assemblage.json`, JSON.stringify({ chunks, css }, null, 1));
  },
});

export default defineConfig((env) => {
  const b = typeof base === "function" ? base(env) : base;
  return mergeConfig(b, { plugins: [releve("page")], worker: { plugins: () => [releve("worker")] }, build: { outDir: `${OUT}/dist`, emptyOutDir: true } });
});
