// packages/pt-runtime/src/build/build-utils.ts
// Utilidades compartidas para el pipeline de build

import * as path from "path";
import * as ts from "typescript";
import { formatValidationResult, type ValidationResult } from "./validate-pt-safe.js";

// ── Resolución de imports ────────────────────────────────────────────

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  const bindings = clause.namedBindings;
  if (bindings && ts.isNamedImports(bindings)) {
    return bindings.elements.length > 0 && bindings.elements.every((e) => e.isTypeOnly);
  }
  return false;
}

export function resolveImportPath(
  fromFile: string,
  specifier: string,
  knownFiles: Set<string>,
): string | null {
  if (!specifier.startsWith(".")) return null;

  const fromDir = path.posix.dirname(fromFile);
  const normalized = path.posix.normalize(path.posix.join(fromDir, specifier));

  const candidates = [
    normalized,
    normalized.replace(/\.js$/, ".ts"),
    normalized.replace(/\.js$/, ".tsx"),
    normalized + ".ts",
    normalized + ".tsx",
    path.posix.join(normalized, "index.ts"),
    path.posix.join(normalized, "index.tsx"),
  ];

  for (const candidate of candidates) {
    if (knownFiles.has(candidate)) return candidate;
  }

  for (const candidate of candidates) {
    if (candidate.endsWith(".ts") || candidate.endsWith(".tsx")) {
      return candidate;
    }
  }

  return null;
}

export function findMissingTransitiveDeps(
  sourceFiles: Map<string, string>,
  manifestFiles: Set<string>,
): string[] {
  const missing = new Set<string>();

  for (const [filePath, content] of sourceFiles) {
    const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    sf.forEachChild((node) => {
      if (ts.isImportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (!specifier || !ts.isStringLiteral(specifier)) return;
        if (isTypeOnlyImport(node)) return;
        const resolved = resolveImportPath(filePath, specifier.text, manifestFiles);
        if (resolved && !manifestFiles.has(resolved)) missing.add(resolved);
      }

      if (ts.isExportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (!specifier || !ts.isStringLiteral(specifier) || node.isTypeOnly) return;
        const resolved = resolveImportPath(filePath, specifier.text, manifestFiles);
        if (resolved && !manifestFiles.has(resolved)) missing.add(resolved);
      }
    });
  }

  return Array.from(missing).sort();
}

// ── Validación de helpers TS ─────────────────────────────────────────

export function assertNoEmittedTypeScriptHelpers(label: string, code: string): void {
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

// ── Reporte de validación ────────────────────────────────────────────

export function shouldShowValidationDetails(): boolean {
  if (typeof Bun === "undefined") return false;
  return Bun.env.PT_SHOW_VALIDATION_WARNINGS === "1" || Bun.env.PT_DEBUG === "1";
}

export function reportPtSafeValidation(label: string, validation: ValidationResult): void {
  if (validation.errors.length === 0) {
    if (validation.warnings.length > 0 && shouldShowValidationDetails()) {
      console.warn(`[${label}] PT-safe validation warnings:`);
      console.warn(formatValidationResult(validation));
    }
    return;
  }

  // Always output the detailed validation results when there are hard errors
  console.error(`[${label}] Validation FAILED:`);
  console.error(formatValidationResult(validation));
  throw new Error(`[${label}] PT-safe validation failed with ${validation.errors.length} error(s). Build aborted.`);
}
