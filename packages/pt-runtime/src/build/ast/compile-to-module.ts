// packages/pt-runtime/src/build/ast/compile-to-module.ts
// AST compilation helper — compiles source files to PT-safe module code

import * as fs from "fs";
import * as path from "path";
import { transformToPtSafeAst, type AstTransformOptions } from "../ast-transform";
import { validatePtSafe, formatValidationResult, type ValidationResult } from "../validate-pt-safe";

/**
 * Compiles multiple source files into a single PT-safe module.
 */
export function compileFilesToModule(
  srcDir: string,
  files: string[],
  options?: { minify?: boolean }
): { code: string; validation: ValidationResult } {
  const sourceFiles = new Map<string, string>();

  for (const relPath of files) {
    const filePath = path.join(srcDir, relPath);
    if (fs.existsSync(filePath)) {
      sourceFiles.set(relPath, fs.readFileSync(filePath, "utf-8"));
    } else {
      console.warn(`[compile-to-module] Warning: File not found: ${filePath}`);
    }
  }

  const { code, validation } = transformToPtSafeAst(sourceFiles, {
    target: undefined,
    replaceConsoleWithDprint: true,
    wrapIIFE: false,
    minify: options?.minify ?? false,
  });

  return { code, validation };
}

/**
 * Validates that source files have no missing transitive dependencies.
 */
export function validateSourceFiles(
  sourceFiles: Map<string, string>,
  manifestFiles: Set<string>
): string[] {
  const missing: string[] = [];

  for (const [filePath, content] of sourceFiles) {
    const importMatches = content.matchAll(/import\s+.*?\s+from\s+["']([^"']+)["']/g);
    for (const match of importMatches) {
      const importPath = match[1];
      if (importPath.startsWith(".")) {
        const resolved = resolveImportPath(filePath, importPath);
        if (resolved && !manifestFiles.has(resolved)) {
          missing.push(resolved);
        }
      }
    }
  }

  return [...new Set(missing)].sort();
}

function resolveImportPath(fromFile: string, importPath: string): string | null {
  if (!importPath.startsWith(".")) return null;

  const fromDir = path.posix.dirname(fromFile);
  const normalized = path.posix.normalize(path.posix.join(fromDir, importPath));

  const candidates = [
    normalized.replace(/\.js$/, ".ts"),
    normalized + ".ts",
    path.posix.join(normalized, "index.ts"),
    normalized,
  ];

  for (const candidate of candidates) {
    if (candidate.endsWith(".ts") || candidate.endsWith(".tsx")) {
      return candidate;
    }
  }

  return null;
}
