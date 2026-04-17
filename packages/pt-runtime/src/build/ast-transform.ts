// packages/pt-runtime/src/build/ast-transform.ts
// Pipeline de transformación AST: TypeScript → ES5 PT-safe
// Usa ts.transpileModule + post-processing para ES5 downleveling
// Incluye tree-shaking y minificación opcional
// Soporta generación de source maps básicos

import * as ts from "typescript";
import { formatValidationResult, validatePtSafe, type ValidationResult } from "./validate-pt-safe.js";

export interface AstTransformOptions {
  target?: ts.ScriptTarget;
  replaceConsoleWithDprint?: boolean;
  wrapIIFE?: boolean;
  inlineConstants?: Record<string, unknown>;
  minify?: boolean;
  treeShake?: boolean;
  generateSourceMap?: boolean;
}

export interface SourceMapEntry {
  generatedLine: number;
  generatedColumn: number;
  sourceFile: string;
  sourceLine: number;
  sourceColumn: number;
  name?: string;
}

export interface SourceMap {
  version: number;
  file?: string;
  sources: string[];
  mappings: string;
  names: string[];
  sourceRoot?: string;
}

export interface TransformResult {
  code: string;
  validation: ValidationResult;
  sourceMap?: SourceMap;
  lineMapping: LineMappingEntry[];
}

export interface LineMappingEntry {
  generatedLine: number;
  sourceFile: string;
  sourceLine: number;
  sourceColumn: number;
  isComment: boolean;
}

interface DependencyGraph {
  exports: Map<string, Set<string>>;
  imports: Map<string, Set<string>>;
}

const DEFAULT_OPTIONS: Required<AstTransformOptions> = {
  target: ts.ScriptTarget.ES5,
  replaceConsoleWithDprint: true,
  wrapIIFE: false,
  inlineConstants: {},
  minify: false,
  treeShake: true,
  generateSourceMap: false,
};

export function transformToPtSafeAst(
  sourceFiles: Map<string, string>,
  options?: AstTransformOptions,
): TransformResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let filesToProcess: Array<[string, string]> = [];

  if (opts.treeShake !== false) {
    const liveFiles = computeLiveFiles(sourceFiles);
    for (const [filePath, content] of sourceFiles) {
      if (liveFiles.has(filePath)) {
        filesToProcess.push([filePath, content]);
      }
    }
  } else {
    filesToProcess = [...sourceFiles];
  }

  let combined = "";
  const lineMapping: LineMappingEntry[] = [];

  for (const [filePath, content] of filesToProcess) {
    combined += `\n// --- ${filePath} ---\n`;
    lineMapping.push({
      generatedLine: combined.split("\n").length - 1,
      sourceFile: filePath,
      sourceLine: 1,
      sourceColumn: 0,
      isComment: true,
    });
    const stripped = stripModuleSyntax(content);
    const strippedLines = stripped.split("\n");
    for (let i = 0; i < strippedLines.length; i++) {
      lineMapping.push({
        generatedLine: combined.split("\n").length - 1 + i + 1,
        sourceFile: filePath,
        sourceLine: i + 1,
        sourceColumn: 0,
        isComment: false,
      });
    }
    combined += stripped + "\n";
  }

  const transpiled = ts.transpileModule(combined, {
    compilerOptions: {
      target: opts.target ?? ts.ScriptTarget.ES5,
      module: ts.ModuleKind.None,
      strict: false,
      noEmitHelpers: true,
      sourceMap: false,
      declaration: false,
      removeComments: false,
      esModuleInterop: false,
      allowJs: true,
      downlevelIteration: true,
      suppressExcessPropertyErrors: true,
      suppressImplicitAnyIndexErrors: true,
      isolatedModules: true,
      verbatimModuleSyntax: false,
    },
    transformers: {
      before: opts.replaceConsoleWithDprint ? [createConsoleReplacementTransformer()] : [],
    },
  });

  let output = transpiled.outputText;

  output = postProcessES5(output);

  if (opts.minify) {
    output = minifyES5(output);
    for (const entry of lineMapping) {
      entry.isComment = false;
    }
  }

  if (opts.wrapIIFE) {
    output = `(function() {\n${output}\n})();`;
  }

  const validation = validatePtSafe(output);

  let sourceMap: SourceMap | undefined;
  if (opts.generateSourceMap) {
    sourceMap = generateSourceMap(output, filesToProcess, lineMapping);
  }

  return { code: output, validation, sourceMap, lineMapping };
}

function generateSourceMap(
  output: string,
  sourceFiles: Array<[string, string]>,
  lineMapping: LineMappingEntry[],
): SourceMap {
  const sources = [...new Set(lineMapping.map((l) => l.sourceFile))];

  const vlqMappings: string[] = [];
  let lastSourceIndex = 0;
  let lastSourceLine = 0;
  let lastSourceCol = 0;

  const outputLines = output.split("\n");
  for (let genLine = 0; genLine < outputLines.length; genLine++) {
    const mapping = lineMapping.find((l) => l.generatedLine === genLine + 1);

    if (mapping && !mapping.isComment) {
      const sourceIndex = sources.indexOf(mapping.sourceFile);

      const diffSourceIndex = sourceIndex - lastSourceIndex;
      const diffSourceLine = mapping.sourceLine - lastSourceLine;
      const diffSourceCol = mapping.sourceColumn - lastSourceCol;

      vlqMappings.push(
        encodeVLQ(diffSourceIndex) +
        encodeVLQ(diffSourceLine) +
        encodeVLQ(diffSourceCol) +
        encodeVLQ(0)
      );

      lastSourceIndex = sourceIndex;
      lastSourceLine = mapping.sourceLine;
      lastSourceCol = mapping.sourceColumn;
    } else {
      vlqMappings.push("");
    }
  }

  return {
    version: 3,
    sources,
    mappings: vlqMappings.join(";"),
    names: [],
  };
}

function encodeVLQ(value: number): string {
  const signBit = value < 0 ? 1 : 0;
  value = Math.abs(value) << 1 | signBit;
  let result = "";
  while (value > 0) {
    let chunk = value & 0x1f;
    value >>= 5;
    if (value > 0) {
      chunk |= 0x20;
    }
    result += String.fromCharCode(64 + chunk);
  }
  return result || "A";
}

function computeLiveFiles(sourceFiles: Map<string, string>): Set<string> {
  const graph = buildDependencyGraph(sourceFiles);
  const liveFiles = new Set<string>();

  const entryPoints = ["handlers/runtime-handlers.ts"];
  const queue: string[] = [...entryPoints];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (liveFiles.has(current)) continue;
    liveFiles.add(current);

    const importedBy = graph.imports.get(current) || new Set();
    for (const importer of importedBy) {
      if (!liveFiles.has(importer)) {
        queue.push(importer);
      }
    }
  }

  return liveFiles;
}

function buildDependencyGraph(sourceFiles: Map<string, string>): DependencyGraph {
  const exports = new Map<string, Set<string>>();
  const imports = new Map<string, Set<string>>();

  const filePaths = [...sourceFiles.keys()];

  for (const filePath of filePaths) {
    exports.set(filePath, new Set());
    imports.set(filePath, new Set());
  }

  for (const [filePath, content] of sourceFiles) {
    const fileExports = exports.get(filePath)!;

    const exportMatches = content.matchAll(/^export\s+(?:function|class|const|let|var|type|interface)\s+(\w+)/gm);
    for (const match of exportMatches) {
      fileExports.add(match[1]);
    }

    const namedExportMatches = content.matchAll(/^export\s+\{([^}]+)\}/gm);
    for (const match of namedExportMatches) {
      const names = match[1].split(",").map((n) => n.trim().split(" as ")[0]);
      for (const name of names) {
        fileExports.add(name);
      }
    }

    const importMatches = content.matchAll(/^import\s+(?:type\s+)?.*?\s+from\s+["']([^"']+)["']/gm);
    for (const match of importMatches) {
      const importPath = match[1];
      const resolved = resolveImportPath(filePath, importPath, filePaths);
      if (resolved) {
        imports.get(filePath)!.add(resolved);
        imports.get(resolved)?.add(filePath);
      }
    }

    const dynamicImportMatches = content.matchAll(/import\s*\(["']([^"']+)["']\)/g);
    for (const match of dynamicImportMatches) {
      const importPath = match[1];
      const resolved = resolveImportPath(filePath, importPath, filePaths);
      if (resolved) {
        imports.get(filePath)!.add(resolved);
        imports.get(resolved)?.add(filePath);
      }
    }
  }

  return { exports, imports };
}

function resolveImportPath(from: string, importPath: string, filePaths: string[]): string | null {
  if (importPath.startsWith(".")) {
    const baseDir = from.split("/").slice(0, -1).join("/");
    const joined = (baseDir ? baseDir + "/" : "") + importPath;

    // Normalize: remove /. segments and leading ./
    // e.g. "handlers/./vlan.js" → "handlers/vlan.js"
    const normalized = joined
      .replace(/\/\.\//g, "/")   // handlers/./vlan.js → handlers/vlan.js
      .replace(/^\.\//,  "");    // ./vlan.js → vlan.js (top-level imports)

    // TypeScript source files use .js imports that map to .ts on disk.
    const noExt = normalized.replace(/\.js$/, "");

    const candidates = [
      noExt + ".ts",          // handlers/vlan.js → handlers/vlan.ts  ← most common
      noExt + "/index.ts",    // handlers/vlan.js → handlers/vlan/index.ts
      normalized + ".ts",     // handlers/vlan    → handlers/vlan.ts
      normalized + "/index.ts",
      normalized,             // exact match (already .ts)
    ];

    for (const candidate of candidates) {
      if (filePaths.includes(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

function minifyES5(code: string): string {
  let result = code;

  result = result.replace(/\/\/[^\n]*/g, "");
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");

  result = result.replace(/\s+/g, " ");
  result = result.replace(/\s*([{};,:])\s*/g, "$1");

  result = result.replace(/;+/g, ";");
  result = result.replace(/\+\+/g, "+");
  result = result.replace(/--/g, "-");

  result = result.replace(/return\s+/g, "return ");
  result = result.replace(/}\s*else\s+/g, "}else");
  result = result.replace(/;\s*}/g, ";}");
  result = result.replace(/{\s*/g, "{");
  result = result.replace(/}\s*/g, "}");

  result = result.replace(/if\s*\(\s*/g, "if(");
  result = result.replace(/\s*\)\s*/g, ")");
  result = result.replace(/for\s*\(\s*/g, "for(");

  result = result.trim();

  return result;
}

export function reverseLookupLine(
  lineMapping: LineMappingEntry[],
  generatedLine: number,
): { sourceFile: string; sourceLine: number } | null {
  const entry = lineMapping.find((l) => l.generatedLine === generatedLine);
  if (!entry) return null;
  return {
    sourceFile: entry.sourceFile,
    sourceLine: entry.sourceLine,
  };
}

export function getSourceContext(
  lineMapping: LineMappingEntry[],
  generatedLine: number,
  sourceFiles: Map<string, string>,
  contextLines = 3,
): { file: string; line: number; context: string } | null {
  const lookup = reverseLookupLine(lineMapping, generatedLine);
  if (!lookup) return null;

  const sourceContent = sourceFiles.get(lookup.sourceFile);
  if (!sourceContent) return null;

  const sourceLines = sourceContent.split("\n");
  const startLine = Math.max(0, lookup.sourceLine - 1 - contextLines);
  const endLine = Math.min(sourceLines.length, lookup.sourceLine - 1 + contextLines);

  const context = sourceLines.slice(startLine, endLine).join("\n");

  return {
    file: lookup.sourceFile,
    line: lookup.sourceLine,
    context,
  };
}

function stripModuleSyntax(source: string): string {
  const lines = source.split("\n");
  const result: string[] = [];
  let inImportMultiLine = false;
  let inExportMultiLine = false;
  let inExportTypeAssign: { braceDepth: number; hitDepth0Once: boolean } | false = false;
  let inJSDocComment = false;
  let braceDepth = 0;

  for (const line of lines) {
    const trimmed = line.trimStart();

    // Preserve JSDoc comments
    if (inJSDocComment) {
      result.push(line);
      if (line.includes("*/")) inJSDocComment = false;
      continue;
    }
    if (trimmed.startsWith("/**")) {
      inJSDocComment = true;
      result.push(line);
      continue;
    }

    // Inside a multi-line import block: skip until we see `from "..."` then skip that line too
    if (inImportMultiLine) {
      if (/from\s+["']/.test(trimmed)) {
        inImportMultiLine = false;
        continue; // skip the closing line too ("} from ...;")
      }
      continue; // skip all lines until 'from'
    }

    // Inside a multi-line export { ... } block: skip until braces balance
    if (inExportMultiLine) {
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      if (braceDepth <= 0) inExportMultiLine = false;
      continue;
    }

    // Inside an export type X = ...; block: skip until closing brace matches the opener
    // Track brace depth to handle nested objects like linkStats: { ... };
    // The first }; at depth 0 closes a nested object, not the export type.
    // Only reset when we see }; at depth 0 AFTER already having closed at depth 0.
    if (inExportTypeAssign) {
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      inExportTypeAssign.braceDepth += openBraces - closeBraces;

      const isClosingUnionLine = trimmed.startsWith("|") && trimmed.endsWith(";");
      const isTypeAliasTerminated = inExportTypeAssign.braceDepth <= 0 && (trimmed.endsWith(";") || closeBraces > 0);
      if (isTypeAliasTerminated || isClosingUnionLine) {
        inExportTypeAssign = false;
      }
      continue;
    }

    // ── Import stripping ──────────────────────────────────────────────
    if (/^import\s+(?:type\s+)?/.test(trimmed)) {
      // Check if it ends on this line (has `from "..."`)
      if (!/from\s+["']/.test(trimmed)) inImportMultiLine = true;
      continue; // always skip import lines
    }

    // ── Export stripping ─────────────────────────────────────────────
    if (/^export\s+default\s+/.test(trimmed)) continue;

    // export type X = ... or export type X = Y & { ... }
    // Skip if it's export type AND either ends with ; OR contains =
    if (/^export\s+type\s+/.test(trimmed)) {
      if (!trimmed.endsWith(";")) {
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        inExportTypeAssign = { braceDepth: openBraces - closeBraces, hitDepth0Once: false };
      }
      continue;
    }
    if (/^export\s+\*\s+from/.test(trimmed)) continue;   // export * from "..."

    // Multi-line export type { ... } from "..." - skip until closing `from "..."`
    if (/^export\s+type\s+\{/.test(trimmed)) {
      // Check if it ends on this line (has `from "..."`)
      if (!/from\s+["']/.test(trimmed)) inImportMultiLine = true; // reuse flag, same semantics
      continue; // always skip export type lines
    }

    // Re-export: export { X, Y } from "..."  (has 'from' = single-line re-export)
    if (/^export\s+\{/.test(trimmed) && /from\s+["']/.test(trimmed)) {
      continue; // strip whole line — it's a single-line module re-export
    }

    // Named export block (no 'from'): export { X, Y };
    if (/^export\s+\{[^}]+\};?\s*$/.test(trimmed)) continue;

    // Multi-line export { (no closing } or 'from' on same line)
    // Also handles: export type { X, Y }
    if ((/^export\s+\{/.test(trimmed) || /^export\s+type\s+\{/.test(trimmed)) && !trimmed.includes("}")) {
      inExportMultiLine = true;
      braceDepth = 1;
      continue;
    }

    // For all other exports (export function, export class, export const, export interface)
    // strip only the 'export' keyword and keep the declaration
    result.push(line.replace(/^export\s+(default\s+)?/, ""));
  }

  return result.join("\n");
}

function removeJSDocFromLine(line: string): string {
  if (line.includes("/*") && line.includes("*/")) {
    return line.replace(/\/\*.*?\*\//g, "");
  }
  return line;
}

function postProcessES5(code: string): string {
  const lines = code.split("\n");
  const result: string[] = [];
  let inJSDoc = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("/**")) {
      inJSDoc = true;
      result.push(line);
      continue;
    }
    if (inJSDoc) {
      result.push(line);
      if (line.includes("*/")) {
        inJSDoc = false;
      }
      continue;
    }

    let modified = line;

    modified = modified.replace(/\bconst\s+/g, "var ");
    modified = modified.replace(/\blet\s+/g, "var ");
    modified = modified.replace(/for\s*\(\s*const\s+/g, "for (var ");
    modified = modified.replace(/for\s*\(\s*let\s+/g, "for (var ");
    modified = modified.replace(/\?\?/g, " || ");
    modified = modified.replace(/\?\./g, " && ");
    modified = modified.replace(/\bPromise\s*<[^>]+>/g, "void");

    modified = modified.replace(/`([^`]*)`/g, (match, content) => {
      if (!content.includes("${")) {
        return `"${content}"`;
      }
      return match;
    });

    modified = modified.replace(/^\s*\|\s*"[^"]+";?\s*$/gm, "");
    modified = modified.replace(/^\s*\|\s*'[^']+';?\s*$/gm, "");
    modified = modified.replace(/^\s*\|\s*\w+\s*;?\s*$/gm, "");
    modified = modified.replace(/^\s*;\s*$/gm, "");

    modified = modified.replace(/^\s*\}\s*;?\s*$/gm, (match) => {
      if (match.trim() === "};") return "};";
      if (match.trim() === "}") return "}";
      return match;
    });

    modified = modified.replace(/^\s*\{[^}]*\}\s*;?\s*$/gm, "");
    modified = modified.replace(/^\s*type\s*;?\s*$/gm, "");
    modified = modified.replace(/^\s*interface\s*;?\s*$/gm, "");

    if (!modified.match(/^\s*\*\s*from\s*;?\s*$/)) {
      modified = modified.replace(/^\s*\*\s*from\s*;?\s*$/gm, "");
    }
    modified = modified.replace(/^\s*\*\s*/gm, "");

    result.push(modified);
  }

  return result.join("\n");
}

function createConsoleReplacementTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    return (sourceFile) => {
      function visitor(node: ts.Node): ts.Node {
        if (ts.isCallExpression(node)) {
          const expression = node.expression;
          if (ts.isPropertyAccessExpression(expression)) {
            const target = expression.expression;
            const property = expression.name.text;
            if (
              ts.isIdentifier(target) &&
              target.text === "console" &&
              ["log", "error", "warn", "info", "debug"].includes(property)
            ) {
              return ts.factory.updateCallExpression(
                node,
                ts.factory.createIdentifier("dprint"),
                undefined,
                node.arguments,
              );
            }
          }
        }
        return ts.visitEachChild(node, visitor, context);
      }
      return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
    };
  };
}

export { validatePtSafe, formatValidationResult };
