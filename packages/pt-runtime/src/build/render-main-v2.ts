// packages/pt-runtime/src/build/render-main-v2.ts
// Genera main.js — el bootloader de PT Script Module.
//
// Responsabilidades de main.js (SOLO estas):
//   1. Kernel IIFE (compilado desde MAIN_MANIFEST)
//   2. _ptLoadModule — carga catalog.js desde disco
//   3. main() / cleanUp() — ciclo de vida de PT Script Module
//
// Hot reload es manejado por el kernel's runtime-loader.
// runtime.js se carga desde disco y se recarga automáticamente cuando cambia.
//
// NOTE: NO hay modo embedded. main.js siempre carga desde archivos en disco.

import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { transformToPtSafeAst } from "./ast-transform.js";
import { formatValidationResult, type ValidationResult } from "./validate-pt-safe.js";
import { getAllMainFiles, validateMainManifestDependencies } from "./main-manifest.js";
import { tslibHelpersTemplate, kernelIifeTemplate, fileLoaderTemplate, entryPointsTemplate } from "./templates/index.js";
import { sanitizeTypeScriptHelperGlobalThis } from "./sanitize-typescript-helpers.js";
import { assertJavaScriptSyntaxOrThrow } from "./syntax-assert.js";
import { assertNoDuplicateTopLevelSymbols } from "./top-level-symbols.js";
import { toPtRuntimePathLiteral } from "./pt-paths.js";

export interface RenderMainV2Options {
  srcDir: string;
  outputPath: string;
  injectDevDir?: string;
}

const KERNEL_SOURCE_FILES = getAllMainFiles();

function shouldShowValidationDetails(): boolean {
  return typeof Bun !== "undefined"
    ? Bun.env.PT_SHOW_VALIDATION_WARNINGS === "1" || Bun.env.PT_DEBUG === "1"
    : false;
}

function reportPtSafeValidation(label: string, validation: ValidationResult): void {
  if (validation.valid) {
    return;
  }

  if (!shouldShowValidationDetails()) {
    console.warn(
      `[${label}] PT-safe validation produced ` +
        `${validation.errors.length} error(s) and ${validation.warnings.length} warning(s). ` +
        `Details hidden by default. Set PT_SHOW_VALIDATION_WARNINGS=1 to inspect them.`,
    );
    return;
  }

  console.error(`[${label}] Validation FAILED:`);
  console.error(formatValidationResult(validation));
}

function assertNoEmittedTypeScriptHelpers(label: string, code: string): void {
  const forbidden = [
    "var __assign = (this && this.__assign)",
    "var __awaiter = (this && this.__awaiter)",
    "var __generator = (this && this.__generator)",
    "var __values = (this && this.__values)",
    "var __read = (this && this.__read)",
    "var __spreadArray = (this && this.__spreadArray)",
  ];

  for (const marker of forbidden) {
    if (code.includes(marker)) {
      throw new Error(`${label} still contains emitted TypeScript helper: ${marker}`);
    }
  }
}

export function renderMainV2(options: RenderMainV2Options): string {
  const sourceFiles = new Map<string, string>();

  for (const relPath of KERNEL_SOURCE_FILES) {
    const filePath = path.join(options.srcDir, relPath);
    if (fs.existsSync(filePath)) {
      sourceFiles.set(relPath, fs.readFileSync(filePath, "utf-8"));
    }
  }

  const missingDependencies = validateMainManifestDependencies(sourceFiles);
  if (missingDependencies.length > 0) {
    const details = missingDependencies
      .map((file) => {
        const importedBy = findImportersOf(sourceFiles, file);
        return `  - ${file} (imported by: ${importedBy.join(", ")})`;
      })
      .join("\n");
    throw new Error(
      `[render-main-v2] BUILD FAILED: main.js manifest is missing ${missingDependencies.length} transitive dependenc${missingDependencies.length === 1 ? "y" : "ies"}.\n` +
        `These files are imported by manifest entries but not listed in MAIN_MANIFEST.\n` +
        `Add them to the appropriate section in packages/pt-runtime/src/build/main-manifest.ts:\n` +
        details,
    );
  }

  const { code, validation } = transformToPtSafeAst(sourceFiles, {
    target: undefined,
    replaceConsoleWithDprint: true,
    wrapIIFE: false,
    inlineConstants: {},
    treeShake: false,
  });

  assertNoEmittedTypeScriptHelpers("main transform output", code);

  reportPtSafeValidation("render-main-v2", validation);

  const showWarnings = typeof Bun !== "undefined"
    ? Bun.env.PT_SHOW_VALIDATION_WARNINGS === "1" || Bun.env.PT_DEBUG === "1"
    : false;

  if (showWarnings && validation.warnings.length > 0) {
    console.warn(`[render-main-v2] ${validation.warnings.length} warning(s):`);
    for (const w of validation.warnings) {
      console.warn(`  ${w.line}:${w.column}: ${w.message}`);
    }
  }

  const devDirLiteral = options.injectDevDir
    ? toPtRuntimePathLiteral(options.injectDevDir)
    : '"/pt-dev"';

  const buildTimestamp = "stable";

  // =========================================================================
  // Template composition
  // =========================================================================

  const tslibHelpers = tslibHelpersTemplate();

  const kernelIife = kernelIifeTemplate({
    devDirLiteral,
    tslibHelpers,
    kernelCode: code,
  });

  const fileLoader = fileLoaderTemplate();

  const entryPoints = entryPointsTemplate({
    devDirLiteral,
    buildTimestamp,
  });

  const header = `// PT Main — Generated by cisco-auto AST pipeline V2
// Do not edit directly — regenerate with: bun run pt build
//
// Architecture:
//   main.js    = kernel IIFE + file loader
//   catalog.js = static PT constants
//   runtime.js = handlers + dispatcher, hot-reloaded by kernel
//
// NOTE: this is NOT available in PT QTScript — uses self/this instead.
`;

  let output = header + kernelIife + fileLoader + entryPoints;

  assertJavaScriptSyntaxOrThrow("main.js after assembly", output);

  assertNoDuplicateTopLevelSymbols(output, {
    fileName: "main.js",
    label: "main.js",
    allowDuplicateVarDeclarations: true,
  });

  output = sanitizeTypeScriptHelperGlobalThis(output);

  assertJavaScriptSyntaxOrThrow("main.js after sanitizeTypeScriptHelperGlobalThis", output);

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, output, "utf-8");
  }

  return output;
}

/**
 * Given a set of source files and a missing dependency path, find which manifest
 * files import it so the error message tells you exactly who needs it.
 */
function findImportersOf(sourceFiles: Map<string, string>, missingFile: string): string[] {
  const importers: string[] = [];
  const manifestFiles = new Set(getAllMainFiles());

  for (const [filePath, content] of sourceFiles) {
    const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    sf.forEachChild((node) => {
      if (ts.isImportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (!specifier || !ts.isStringLiteral(specifier)) return;
        if (node.importClause?.isTypeOnly) return;
        const resolved = resolveManifestImport(filePath, specifier.text, manifestFiles);
        if (resolved === missingFile) {
          importers.push(filePath);
        }
      }
    });
  }

  return importers;
}

function resolveManifestImport(
  fromFile: string,
  specifier: string,
  knownFiles: Set<string>,
): string | null {
  if (!specifier.startsWith(".")) return null;

  const fromDir = path.posix.dirname(fromFile);
  const normalized = path.posix.normalize(path.posix.join(fromDir, specifier));
  const candidates = new Set<string>([
    normalized,
    normalized.replace(/\.js$/, ".ts"),
    normalized.replace(/\.js$/, ".tsx"),
    normalized + ".ts",
    normalized + ".tsx",
    path.posix.join(normalized, "index.ts"),
    path.posix.join(normalized, "index.tsx"),
  ]);

  let fallback: string | null = null;

  for (const candidate of candidates) {
    if (!fallback && (candidate.endsWith(".ts") || candidate.endsWith(".tsx"))) {
      fallback = candidate;
    }
    if (knownFiles.has(candidate)) {
      return candidate;
    }
  }

  return fallback;
}
