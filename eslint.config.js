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
