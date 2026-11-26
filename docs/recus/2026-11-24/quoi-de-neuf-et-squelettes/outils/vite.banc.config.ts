// Banc de lecture : la configuration de l'application, plus un greffon qui, dans le navigateur, imite les lectures de
// l'application de bureau. Les tables du store arrivent après window.__bancDelai ms (au lieu d'être servies d'office),
// et runDbRead (le pont SQLite natif, absent du navigateur) répond après le même délai par une base vide.
import { defineConfig, mergeConfig, type Plugin } from "vite";
import appConfig from "../vite.config";

const lectureLente: Plugin = {
  name: "banc-lecture-lente",
  enforce: "pre",
  transform(code, id) {
    // Les factures ne se lisent que sur l'app de bureau : le banc fait comme si (le pont natif est imité plus bas).
    if (id.endsWith("/src/modules/finances/hooks/use-finances-page-model.tsx") || id.endsWith("/src/modules/dashboard/hooks/use-dashboard-financials.ts")) {
      return code
        .replace("import { isTauriRuntime } from \"@/services/browser-store\";", "import { isTauriRuntime as nativeRuntime } from \"@/services/browser-store\";\nconst isTauriRuntime = () => Boolean((window as any).__bancDelai) || nativeRuntime();");
    }
    if (id.endsWith("/src/hooks/useSQLite.ts")) {
      const a = "if (safeTableName && !isTauriRuntime() && !tableSnapshotCache.has(safeTableName)) {";
      const b = "async function loadTableSnapshot(table: string, force = false) {\n  if (!isTauriRuntime()) {\n";
      if (!code.includes(a) || !code.includes(b)) throw new Error("banc: useSQLite a changé");
      return code
        .replace(a, "if (!(window as any).__bancDelai && safeTableName && !isTauriRuntime() && !tableSnapshotCache.has(safeTableName)) {")
        .replace(b, b + "    if ((window as any).__bancDelai && !(window as any).__bancGarde.includes(table)) await new Promise((r) => setTimeout(r, (window as any).__bancDelai));\n");
    }
    if (id.endsWith("/src/services/sqlite/database.ts")) {
      const c = "export function runDbRead<T>(\n  operation: (database: Database) => Promise<T>\n): Promise<T> {\n";
      const t = "  mode: \"DEFERRED\" | \"IMMEDIATE\" | \"EXCLUSIVE\" = \"IMMEDIATE\"\n): Promise<T> {\n";
      if (!code.includes(c) || !code.includes(t)) throw new Error("banc: runDbRead a changé");
      const stub = "  if ((window as any).__bancDelai) return new Promise((r) => setTimeout(r, (window as any).__bancDelai)).then(() => operation({ select: async (sql: string) => (/count\\(/i.test(sql) ? [{ count: 0, total: 0 }] : []), execute: async () => ({ rowsAffected: 0 }) } as unknown as Database));\n";
      return code.replace(t, t + stub).replace(c, c + "  if ((window as any).__bancDelai) return new Promise((r) => setTimeout(r, (window as any).__bancDelai)).then(() => operation({ select: async (sql: string) => (/count\\(/i.test(sql) ? [{ count: 0, total: 0 }] : []), execute: async () => ({ rowsAffected: 0 }) } as unknown as Database));\n");
    }
  },
};

export default defineConfig((env) => mergeConfig(typeof appConfig === "function" ? appConfig(env) : appConfig, { plugins: [lectureLente] }));
