import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  // Tauri desktop bundles should resolve assets relative to index.html.
  // Keeping "/" here breaks packaged builds with "Importing a module script failed".
  base: process.env.TAURI_ENV_PLATFORM ? "./" : "/",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    host: "0.0.0.0",
    strictPort: true,
    fs: {
      allow: ["..", "../../node_modules/@fontsource"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("@mlc-ai/web-llm")) {
            return "vendor-llm";
          }

          if (id.includes("jspdf") || id.includes("html2canvas")) {
            return "vendor-pdf";
          }

          if (id.includes("recharts") || id.includes("d3-")) {
            return "vendor-charts";
          }

          if (id.includes("@tiptap")) {
            return "vendor-editor";
          }

          return;
        },
      },
    },
  },
});
