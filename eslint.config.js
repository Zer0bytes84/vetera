import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "dist",
    "src-tauri",
    "output",
    "outputs",
    "scratch-*.tsx",
    ".playwright-cli",
    ".playwright-mcp",
    ".next",
    "node_modules",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/incompatible-library": "off",
      // Les composants que le compilateur React abandonne (try/finally, throw dans try/catch…) ne sont pas analysés par les règles
      // « compilateur » : cet avertissement les rend visibles au lieu de les laisser muets.
      "react-hooks/todo": "warn",
      "no-empty": "off",

      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["src/design-system/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["@/hooks/*", "@/data/*", "@/services/*", "@/contexts/*", "**/hooks/*", "**/repositories/*"], message: "Le design system reçoit des props et ne lit pas les données métier." }],
        paths: [{ name: "react", importNames: ["useEffect", "useState", "useSyncExternalStore"], message: "Placer la logique dans le conteneur ou un hook de module." }],
      }],
    },
  },
  {
    files: ["src/modules/**/components/*view.tsx", "src/modules/**/components/*shared.tsx", "src/modules/dashboard/components/clinical/*.tsx"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["@/data/*", "@/services/*", "@/contexts/*"], message: "La vue reçoit ses données par props ; les lectures et écritures restent dans son conteneur." }] }],
    },
  },
]);
