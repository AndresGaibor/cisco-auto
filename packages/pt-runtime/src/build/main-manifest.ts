// packages/pt-runtime/src/build/main-manifest.ts
// Manifiesto de archivos para el main kernel
// Usado por render-main-v2.ts para generar main.js

import * as path from "path";
import * as ts from "typescript";

export const MAIN_MANIFEST = {
  version: 2,
  description: "Lista de archivos TypeScript para generar main.js (kernel + terminal)",

  kernel: [
    "pt/kernel/types.ts",
    "pt/kernel/safe-fm.ts",
    "pt/kernel/directories.ts",
    "pt/kernel/queue-index.ts",
    "pt/kernel/queue-discovery.ts",
    "pt/kernel/dead-letter.ts",
    "pt/kernel/queue-cleanup.ts",
    "pt/kernel/queue-claim.ts",
    "pt/kernel/command-queue.ts",
    "pt/kernel/execution-engine.ts",
    "pt/kernel/lease.ts",
    "pt/kernel/heartbeat.ts",
    "pt/kernel/cleanup.ts",
    "pt/kernel/kernel-state.ts",
    "pt/kernel/file-access.ts",
    "pt/kernel/runtime-api.ts",
    "pt/kernel/command-finalizer.ts",
    "pt/kernel/queue-poller.ts",
    "pt/kernel/kernel-lifecycle.ts",
    "pt/kernel/runtime-loader.ts",
    "pt/kernel/debug-log.ts",
  ],

  terminal: [
    "pt/terminal/prompt-parser.ts",
    "pt/terminal/command-executor.ts",
    "pt/terminal/terminal-engine.ts",
    "pt/terminal/terminal-session.ts",
    "pt/terminal/terminal-events.ts",
  ],

  // main.ts MUST be last — it depends on createTerminalEngine (terminal) and all kernel modules
  entry: [
    "pt/kernel/main.ts",
  ],
} as const;


export function getAllMainFiles(): string[] {
  const files: string[] = [];
  files.push(...MAIN_MANIFEST.kernel);
  files.push(...MAIN_MANIFEST.terminal);
  files.push(...MAIN_MANIFEST.entry);
  return files;
}

export function getMainManifestSize(): number {
  return getAllMainFiles().length;
}

export function validateMainManifestDependencies(sourceFiles: Map<string, string>): string[] {
  const manifestFiles = new Set(getAllMainFiles());
  const missing = new Set<string>();

  for (const [filePath, content] of sourceFiles) {
    const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    sf.forEachChild((node) => {
      if (ts.isImportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (!specifier || !ts.isStringLiteral(specifier) || isTypeOnlyImport(node)) return;
        const resolved = resolveManifestImport(filePath, specifier.text, manifestFiles);
        if (resolved && !manifestFiles.has(resolved)) missing.add(resolved);
      }

      if (ts.isExportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (!specifier || !ts.isStringLiteral(specifier) || node.isTypeOnly) return;
        const resolved = resolveManifestImport(filePath, specifier.text, manifestFiles);
        if (resolved && !manifestFiles.has(resolved)) missing.add(resolved);
      }
    });
  }

  return Array.from(missing).sort();
}

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  const bindings = clause.namedBindings;
  if (bindings && ts.isNamedImports(bindings)) {
    return bindings.elements.length > 0 && bindings.elements.every((element) => element.isTypeOnly);
  }
  return false;
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
