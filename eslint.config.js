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
        project: true,
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
    files: ["packages/ios-domain/src/**/*.ts", "packages/ios-domain/tests/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@cisco-auto/kernel",
              message: "ios-domain no debe depender de kernel. Usa @cisco-auto/ios-primitives.",
            },
            {
              name: "@cisco-auto/pt-control",
              message: "ios-domain no puede depender de pt-control.",
            },
            {
              name: "@cisco-auto/pt-runtime",
              message: "ios-domain no puede depender de pt-runtime.",
            },
            {
              name: "@cisco-auto/pt-memory",
              message: "ios-domain no puede depender de pt-memory.",
            },
            {
              name: "bun:sqlite",
              message: "SQLite pertenece a pt-memory, no a ios-domain.",
            },
          ],
          patterns: [
            {
              group: [
                "@cisco-auto/kernel/*",
                "@cisco-auto/pt-control/*",
                "@cisco-auto/pt-runtime/*",
                "@cisco-auto/pt-memory/*",
              ],
              message: "ios-domain no debe importar capas superiores.",
            },
            {
              group: ["node:*"],
              message: "ios-domain no debe depender de infraestructura Node.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/pt-cli/src/**/*.ts", "apps/pt-cli/tests/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@cisco-auto/pt-control",
              message: "Usa subpaths explícitos: @cisco-auto/pt-control/controller, /services, /application/*, etc.",
            },
            {
              name: "@cisco-auto/pt-control/legacy",
              message: "pt-cli no puede usar pt-control/legacy.",
            },
          ],
          patterns: [
            {
              group: ["@cisco-auto/*/src/*"],
              message: "No importes src interno de otro paquete. Usa exports públicos.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/**/*.ts"],
    ignores: ["**/__tests__/**", "**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@cisco-auto/pt-cli", "@cisco-auto/pt-cli/*"],
              message: "packages/* no puede depender de apps/pt-cli.",
            },
            {
              group: ["@cisco-auto/*/src/*"],
              message: "No importes src interno de otro paquete. Usa exports públicos.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/pt-runtime/src/**/*.ts"],
    ignores: [
      "packages/pt-runtime/src/build/**/*.ts",
      "packages/pt-runtime/src/scripts/**/*.ts",
      "packages/pt-runtime/src/cli.ts",
      "**/__tests__/**",
      "**/*.test.ts",
    ],
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
      "no-restricted-syntax": [
        "error",
        {
          selector: "TemplateLiteral",
          message: "Template literals are not ES5-compatible in runtime code",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*", "fs", "path", "os", "child_process"],
              message: "pt-runtime runtime no debe depender de APIs Node.",
            },
          ],
        },
      ],
      complexity: ["warn", { max: 15 }],
      "max-lines-per-function": [
        "warn",
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    files: ["packages/pt-runtime/src/build/**/*.ts"],
    rules: {
      "no-restricted-syntax": "off",
      "no-restricted-imports": "off",
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