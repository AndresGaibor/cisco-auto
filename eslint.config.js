import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  eslint.configs.recommended,
  {
    files: ["**/*.ts"],
    ignores: ["**/node_modules/**", "**/dist/**", "**/generated/**"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
    },
  },
  {
    files: ["packages/pt-runtime/src/**/*.ts"],
    ignores: ["**/__tests__/**", "**/*.test.ts"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        dprint: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
      },
    },
    rules: {
      "no-restricted-syntax": ["error", {
        selector: "TemplateLiteral",
        message: "Template literals are not ES5-compatible in runtime code",
      }],
      "complexity": ["warn", { max: 15 }],
      "max-lines-per-function": ["warn", { max: 100, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ["packages/pt-runtime/src/build/**/*.ts"],
    rules: {
      "no-restricted-syntax": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["packages/pt-control/src/**/*.ts"],
    ignores: ["**/__tests__/**", "**/*.test.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        name: "@cisco-auto/pt-runtime",
        message: "pt-control debe importar desde la API pública de @cisco-auto/pt-runtime (raíz), no desde rutas internas. Usar: import { ... } from '@cisco-auto/pt-runtime'",
      }],
    },
  },
  prettier,
];
